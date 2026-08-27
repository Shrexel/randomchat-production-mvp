import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "./config";
import { prisma } from "./db";
import { Matchmaker } from "./matchmaker";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: config.WEB_ORIGIN,
  })
);

app.use(express.json({ limit: "16kb" }));

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "randomchat-server",
  });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.WEB_ORIGIN,
    methods: ["GET", "POST"],
  },

  maxHttpBufferSize: 32 * 1024,
});

const matchmaker = new Matchmaker();

const sessions = new Map<
  string,
  {
    guestId: string;
    partnerSocketId?: string;
    partnerGuestId?: string;
  }
>();

const chatSchema = z.object({
  target: z.string().min(1).max(100),

  message: z.string().trim().min(1).max(1000),
});

const typingSchema = z.object({
  target: z.string().min(1).max(100),

  isTyping: z.boolean(),
});

const reportSchema = z.object({
  reportedGuestId: z.string().min(1),

  reason: z.enum([
    "HARASSMENT",
    "SEXUAL_CONTENT",
    "SPAM",
    "SCAM",
    "HATE",
    "OTHER",
  ]),

  details: z.string().trim().max(1000).optional(),
});

function broadcastOnlineUsers() {
  const uniqueGuests = new Set<string>();

  sessions.forEach((session) => {
    uniqueGuests.add(session.guestId);
  });

  io.emit("online-users", {
    count: uniqueGuests.size,
  });
}

async function areBlocked(a: string, b: string) {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        {
          blockerId: a,
          blockedId: b,
        },

        {
          blockerId: b,
          blockedId: a,
        },
      ],
    },
  });

  return Boolean(block);
}

async function findAndMatch(socketId: string) {
  const session = sessions.get(socketId);

  if (!session) return;

  const candidate = await matchmaker.takeCandidate(
    socketId,
    (candidateGuestId) =>
      areBlocked(
        session.guestId,
        candidateGuestId
      )
  );

  if (!candidate) {
    matchmaker.enqueue({
      socketId,
      guestId: session.guestId,
      queuedAt: Date.now(),
    });

    io.to(socketId).emit("queue-status", {
      status: "waiting",
    });

    return;
  }

  const other = sessions.get(
    candidate.socketId
  );

  if (!other) {
    return findAndMatch(socketId);
  }

  session.partnerSocketId =
    candidate.socketId;

  session.partnerGuestId =
    candidate.guestId;

  other.partnerSocketId = socketId;

  other.partnerGuestId =
    session.guestId;

  io.to(candidate.socketId).emit(
    "matched",
    {
      partnerGuestId: session.guestId,
      partnerSocketId: socketId,
      initiator: false,
    }
  );

  io.to(socketId).emit("matched", {
    partnerGuestId: candidate.guestId,
    partnerSocketId: candidate.socketId,
    initiator: true,
  });
}

function disconnectPartner(
  socketId: string,
  reason = "partner-left"
) {
  const session = sessions.get(socketId);

  if (!session?.partnerSocketId) {
    return;
  }

  const partnerSocketId =
    session.partnerSocketId;

  const partner =
    sessions.get(partnerSocketId);

  session.partnerSocketId = undefined;
  session.partnerGuestId = undefined;

  if (partner) {
    partner.partnerSocketId = undefined;
    partner.partnerGuestId = undefined;

    io.to(partnerSocketId).emit(
      "typing",
      {
        isTyping: false,
      }
    );

    io.to(partnerSocketId).emit(reason);
  }
}

io.on("connection", async (socket) => {
  const guestId = String(
    socket.handshake.auth?.guestId || ""
  );

  if (!guestId) {
    socket.disconnect(true);
    return;
  }

  try {
    await prisma.guest.upsert({
      where: {
        id: guestId,
      },

      update: {},

      create: {
        id: guestId,
      },
    });
  } catch (error) {
    console.error(
      "Failed to create guest:",
      error
    );

    socket.emit("server-error", {
      message:
        "Unable to start your session.",
    });

    socket.disconnect(true);
    return;
  }

  sessions.set(socket.id, {
    guestId,
  });

  // Send the current online count
  broadcastOnlineUsers();

  socket.on(
    "find-partner",
    async () => {
      try {
        matchmaker.remove(socket.id);

        disconnectPartner(
          socket.id,
          "partner-left"
        );

        await findAndMatch(socket.id);
      } catch (error) {
        console.error(error);

        socket.emit("server-error", {
          message:
            "Unable to find a partner.",
        });
      }
    }
  );

  socket.on(
    "chat-message",
    (payload) => {
      const parsed =
        chatSchema.safeParse(payload);

      if (!parsed.success) return;

      const session =
        sessions.get(socket.id);

      if (!session?.partnerSocketId) {
        return;
      }

      if (
        parsed.data.target !==
        session.partnerSocketId
      ) {
        return;
      }

      io.to(parsed.data.target).emit(
        "chat-message",
        {
          message:
            parsed.data.message,
        }
      );
    }
  );

  // =========================
  // TYPING INDICATOR
  // =========================

  socket.on("typing", (payload) => {
    const parsed =
      typingSchema.safeParse(payload);

    if (!parsed.success) return;

    const session =
      sessions.get(socket.id);

    if (!session?.partnerSocketId) {
      return;
    }

    if (
      parsed.data.target !==
      session.partnerSocketId
    ) {
      return;
    }

    io.to(parsed.data.target).emit(
      "typing",
      {
        isTyping:
          parsed.data.isTyping,
      }
    );
  });

  socket.on("next", async () => {
    try {
      matchmaker.remove(socket.id);

      disconnectPartner(
        socket.id,
        "partner-left"
      );

      await findAndMatch(socket.id);
    } catch (error) {
      console.error(error);

      socket.emit("server-error", {
        message:
          "Unable to find a new stranger.",
      });
    }
  });

  socket.on(
    "report",
    async (payload) => {
      try {
        const parsed =
          reportSchema.safeParse(payload);

        if (!parsed.success) {
          socket.emit(
            "server-error",
            {
              message:
                "Invalid report.",
            }
          );

          return;
        }

        const session =
          sessions.get(socket.id);

        if (!session) return;

        if (
          session.partnerGuestId !==
          parsed.data.reportedGuestId
        ) {
          return;
        }

        await prisma.report.create({
          data: {
            reporterId:
              session.guestId,

            reportedId:
              parsed.data
                .reportedGuestId,

            reason:
              parsed.data.reason,

            details:
              parsed.data.details,
          },
        });

        disconnectPartner(
          socket.id,
          "partner-reported"
        );

        matchmaker.remove(socket.id);

        socket.emit(
          "report-submitted"
        );

        await findAndMatch(socket.id);
      } catch (error) {
        console.error(error);

        socket.emit(
          "server-error",
          {
            message:
              "Unable to submit report.",
          }
        );
      }
    }
  );

  socket.on(
    "block",
    async ({ blockedGuestId }) => {
      try {
        if (
          typeof blockedGuestId !==
            "string" ||
          !blockedGuestId
        ) {
          return;
        }

        const session =
          sessions.get(socket.id);

        if (!session) return;

        if (
          blockedGuestId ===
          session.guestId
        ) {
          return;
        }

        if (
          session.partnerGuestId !==
          blockedGuestId
        ) {
          return;
        }

        await prisma.block.upsert({
          where: {
            blockerId_blockedId: {
              blockerId:
                session.guestId,

              blockedId:
                blockedGuestId,
            },
          },

          update: {},

          create: {
            blockerId:
              session.guestId,

            blockedId:
              blockedGuestId,
          },
        });

        disconnectPartner(
          socket.id,
          "partner-blocked"
        );

        matchmaker.remove(socket.id);

        socket.emit(
          "block-submitted"
        );

        await findAndMatch(socket.id);
      } catch (error) {
        console.error(error);

        socket.emit(
          "server-error",
          {
            message:
              "Unable to block this user.",
          }
        );
      }
    }
  );

  socket.on("disconnect", () => {
    matchmaker.remove(socket.id);

    disconnectPartner(
      socket.id,
      "partner-left"
    );

    sessions.delete(socket.id);

    // Update online count for everyone
    broadcastOnlineUsers();
  });
});

const port = config.PORT;

httpServer.listen(port, () => {
  console.log(
    `RandomChat server listening on :${port}`
  );
});

process.on(
  "SIGTERM",
  async () => {
    await prisma.$disconnect();

    process.exit(0);
  }
);