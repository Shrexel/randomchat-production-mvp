import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Server, Socket } from "socket.io";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import geoip from "geoip-lite";

import { config } from "./config";
import { prisma } from "./db";
import { Matchmaker } from "./matchmaker";

// ============================================================
// APP SETUP
// ============================================================

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(
  cors({
    origin: config.WEB_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
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

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "randomchat-server",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// HTTP + SOCKET.IO SERVER
// ============================================================

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.WEB_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },

  // WebRTC SDP + ICE candidates are small, but keep a safe limit.
  maxHttpBufferSize: 32 * 1024,

  // Helps WebSocket connections work correctly behind Render/proxies.
  transports: ["websocket", "polling"],
});

// ============================================================
// MATCHMAKER
// ============================================================

const matchmaker = new Matchmaker();

// ============================================================
// SESSION STATE
// ============================================================

type Session = {
  guestId: string;

  country: string | null;

  sameCountry: boolean;

  gender: string | null;

  lookingFor: string | null;

  partnerSocketId?: string;

  partnerGuestId?: string;
};

const sessions = new Map<string, Session>();

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

// -------------------------
// Chat
// -------------------------

const chatSchema = z.object({
  target: z.string().min(1).max(100),

  message: z
    .string()
    .trim()
    .min(1)
    .max(1000),
});

// -------------------------
// Typing
// -------------------------

const typingSchema = z.object({
  target: z.string().min(1).max(100),

  isTyping: z.boolean(),
});

// -------------------------
// Gender
// -------------------------

const genderEnum = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
]);

// -------------------------
// Looking for
// -------------------------

const lookingForEnum = z.enum([
  "RANDOM",
  "MALE",
  "FEMALE",
  "OTHER",
]);

// -------------------------
// Find partner
// -------------------------

const findPartnerSchema = z
  .object({
    sameCountry: z.boolean().optional(),

    gender: genderEnum.optional(),

    lookingFor: lookingForEnum.optional(),
  })
  .optional();

// -------------------------
// Report
// -------------------------

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

  details: z
    .string()
    .trim()
    .max(1000)
    .optional(),
});

// ============================================================
// WEBRTC SIGNALING
// ============================================================
//
// IMPORTANT:
//
// The server does NOT process video/audio.
//
// It only forwards:
//
//   - SDP offer
//   - SDP answer
//   - ICE candidates
//
// between the two matched users.
//
// Actual video/audio flows peer-to-peer through WebRTC.
//
// ============================================================

const webRTCSignalSchema = z.object({
  target: z.string().min(1).max(100),

  signal: z
    .object({
      type: z
        .enum([
          "offer",
          "answer",
          "pranswer",
          "rollback",
        ])
        .optional(),

      sdp: z
        .string()
        .max(20_000)
        .optional(),

      candidate: z
        .string()
        .max(5_000)
        .optional(),

      sdpMid: z
        .string()
        .max(100)
        .nullable()
        .optional(),

      sdpMLineIndex: z
        .number()
        .int()
        .min(0)
        .max(100)
        .nullable()
        .optional(),

      usernameFragment: z
        .string()
        .max(200)
        .nullable()
        .optional(),
    })
    .passthrough(),
});

// ============================================================
// CLIENT IP
// ============================================================

function getClientIp(socket: Socket): string {
  const forwarded =
    socket.handshake.headers["x-forwarded-for"];

  if (
    typeof forwarded === "string" &&
    forwarded.length > 0
  ) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return socket.handshake.address || "";
}

// ============================================================
// COUNTRY
// ============================================================

function getCountry(ip: string): string | null {
  if (!ip) {
    return null;
  }

  // IPv4 addresses can sometimes appear as IPv6 mapped addresses.
  const cleanIp = ip.replace("::ffff:", "");

  const geo = geoip.lookup(cleanIp);

  return geo?.country ?? null;
}

// ============================================================
// ONLINE USERS
// ============================================================

function broadcastOnlineUsers() {
  const uniqueGuests = new Set<string>();

  sessions.forEach((session) => {
    uniqueGuests.add(session.guestId);
  });

  io.emit("online-users", {
    count: uniqueGuests.size,
  });
}

// ============================================================
// PREMIUM CHECK
// ============================================================

async function isPremiumGuest(
  guestId: string
): Promise<boolean> {
  const activeSubscription =
    await prisma.subscription.findFirst({
      where: {
        status: "ACTIVE",

        endAt: {
          gt: new Date(),
        },

        profile: {
          guestId,
        },
      },
    });

  return Boolean(activeSubscription);
}

// ============================================================
// BLOCK CHECK
// ============================================================

async function areBlocked(
  a: string,
  b: string
): Promise<boolean> {
  const block =
    await prisma.block.findFirst({
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

// ============================================================
// FIND + MATCH
// ============================================================

async function findAndMatch(
  socketId: string
) {
  const session = sessions.get(socketId);

  if (!session) {
    return;
  }

  const candidate =
    await matchmaker.takeCandidate(
      socketId,
      async (candidateEntry) => {
        // ------------------------------------------------------
        // BLOCK FILTER
        // ------------------------------------------------------

        if (
          await areBlocked(
            session.guestId,
            candidateEntry.guestId
          )
        ) {
          return true;
        }

        // ------------------------------------------------------
        // SAME COUNTRY FILTER
        // ------------------------------------------------------
        //
        // Only the person requesting same-country matching
        // needs to enable it.
        //
        // If country information is unavailable, do not block
        // local development/testing.
        //
        // ------------------------------------------------------

        if (
          session.sameCountry &&
          session.country &&
          candidateEntry.country &&
          session.country !==
            candidateEntry.country
        ) {
          return true;
        }

        // ------------------------------------------------------
        // GENDER FILTER - REQUESTER SIDE
        // ------------------------------------------------------

        if (
          session.lookingFor &&
          session.lookingFor !== "RANDOM" &&
          candidateEntry.gender !==
            session.lookingFor
        ) {
          return true;
        }

        // ------------------------------------------------------
        // GENDER FILTER - CANDIDATE SIDE
        // ------------------------------------------------------

        if (
          candidateEntry.lookingFor &&
          candidateEntry.lookingFor !== "RANDOM" &&
          candidateEntry.lookingFor !==
            session.gender
        ) {
          return true;
        }

        return false;
      }
    );

  // ==========================================================
  // NO MATCH
  // ==========================================================

  if (!candidate) {
    matchmaker.enqueue({
      socketId,

      guestId: session.guestId,

      country: session.country,

      gender: session.gender,

      lookingFor: session.lookingFor,

      queuedAt: Date.now(),
    });

    io.to(socketId).emit(
      "queue-status",
      {
        status: "waiting",
      }
    );

    return;
  }

  // ==========================================================
  // VERIFY CANDIDATE SESSION
  // ==========================================================

  const other = sessions.get(
    candidate.socketId
  );

  if (!other) {
    return findAndMatch(socketId);
  }

  // ==========================================================
  // CREATE MATCH
  // ==========================================================

  session.partnerSocketId =
    candidate.socketId;

  session.partnerGuestId =
    candidate.guestId;

  other.partnerSocketId =
    socketId;

  other.partnerGuestId =
    session.guestId;

  // ----------------------------------------------------------
  // Tell candidate
  // ----------------------------------------------------------

  io.to(candidate.socketId).emit(
    "matched",
    {
      partnerGuestId:
        session.guestId,

      partnerSocketId:
        socketId,

      // Candidate waits for offer.
      initiator: false,
    }
  );

  // ----------------------------------------------------------
  // Tell requester
  // ----------------------------------------------------------

  io.to(socketId).emit(
    "matched",
    {
      partnerGuestId:
        candidate.guestId,

      partnerSocketId:
        candidate.socketId,

      // Requester creates WebRTC offer.
      initiator: true,
    }
  );

  // ----------------------------------------------------------
  // Extra event for video clients.
  //
  // This allows the frontend to know that both users are now
  // connected at the matching layer.
  // ----------------------------------------------------------

  io.to(socketId).emit(
    "video-ready",
    {
      partnerSocketId:
        candidate.socketId,
    }
  );

  io.to(candidate.socketId).emit(
    "video-ready",
    {
      partnerSocketId:
        socketId,
    }
  );
}

// ============================================================
// DISCONNECT PARTNER
// ============================================================

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

  // ----------------------------------------------------------
  // Clear current user's partner
  // ----------------------------------------------------------

  session.partnerSocketId =
    undefined;

  session.partnerGuestId =
    undefined;

  // ----------------------------------------------------------
  // Clear partner's partner
  // ----------------------------------------------------------

  if (partner) {
    partner.partnerSocketId =
      undefined;

    partner.partnerGuestId =
      undefined;

    // Stop typing indicator.
    io.to(partnerSocketId).emit(
      "typing",
      {
        isTyping: false,
      }
    );

    // Tell partner that connection ended.
    io.to(partnerSocketId).emit(
      reason
    );

    // Tell video client to close RTCPeerConnection.
    io.to(partnerSocketId).emit(
      "video-ended"
    );
  }
}

// ============================================================
// FIND PARTNER HANDLER
// ============================================================

async function handleFindPartner(
  socket: Socket,
  payload: unknown
) {
  try {
    const session =
      sessions.get(socket.id);

    if (!session) {
      return;
    }

    const parsed =
      findPartnerSchema.safeParse(
        payload
      );

    // --------------------------------------------------------
    // SAME COUNTRY
    // --------------------------------------------------------

    session.sameCountry = Boolean(
      parsed.success &&
        parsed.data?.sameCountry
    );

    // --------------------------------------------------------
    // PREMIUM GENDER MATCHING
    // --------------------------------------------------------
    //
    // Never trust the frontend.
    //
    // The server verifies the subscription.
    //
    // --------------------------------------------------------

    if (
      parsed.success &&
      parsed.data?.gender &&
      parsed.data?.lookingFor &&
      (await isPremiumGuest(
        session.guestId
      ))
    ) {
      session.gender =
        parsed.data.gender;

      session.lookingFor =
        parsed.data.lookingFor;
    } else {
      session.gender = null;

      session.lookingFor = null;
    }

    // --------------------------------------------------------
    // Remove old queue entry.
    // --------------------------------------------------------

    matchmaker.remove(socket.id);

    // --------------------------------------------------------
    // End previous conversation.
    // --------------------------------------------------------

    disconnectPartner(
      socket.id,
      "partner-left"
    );

    // --------------------------------------------------------
    // Find new partner.
    // --------------------------------------------------------

    await findAndMatch(socket.id);
  } catch (error) {
    console.error(
      "find-partner error:",
      error
    );

    socket.emit(
      "server-error",
      {
        message:
          "Unable to find a partner.",
      }
    );
  }
}

// ============================================================
// SOCKET CONNECTION
// ============================================================

io.on(
  "connection",
  async (socket) => {
    console.log(
      "Socket connected:",
      socket.id
    );

    // ========================================================
    // GUEST ID
    // ========================================================

    const guestId = String(
      socket.handshake.auth?.guestId || ""
    ).trim();

    if (!guestId) {
      socket.emit(
        "server-error",
        {
          message:
            "Guest ID is required.",
        }
      );

      socket.disconnect(true);

      return;
    }

    // ========================================================
    // CREATE / VERIFY GUEST
    // ========================================================

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

      socket.emit(
        "server-error",
        {
          message:
            "Unable to start your session.",
        }
      );

      socket.disconnect(true);

      return;
    }

    // ========================================================
    // COUNTRY
    // ========================================================

    const ip =
      getClientIp(socket);

    const country =
      getCountry(ip);

    // ========================================================
    // CREATE SESSION
    // ========================================================

    sessions.set(
      socket.id,
      {
        guestId,

        country,

        sameCountry: false,

        gender: null,

        lookingFor: null,
      }
    );

    // ========================================================
    // ONLINE COUNT
    // ========================================================

    broadcastOnlineUsers();

    // ========================================================
    // FIND PARTNER
    // ========================================================

    socket.on(
      "find-partner",
      (payload) => {
        void handleFindPartner(
          socket,
          payload
        );
      }
    );

    // ========================================================
    // CHAT MESSAGE
    // ========================================================

    socket.on(
      "chat-message",
      (payload) => {
        const parsed =
          chatSchema.safeParse(
            payload
          );

        if (!parsed.success) {
          socket.emit(
            "server-error",
            {
              message:
                "Invalid message.",
            }
          );

          return;
        }

        const session =
          sessions.get(socket.id);

        if (
          !session?.partnerSocketId
        ) {
          return;
        }

        // Never allow sending to an arbitrary socket.
        if (
          parsed.data.target !==
          session.partnerSocketId
        ) {
          return;
        }

        io.to(
          parsed.data.target
        ).emit(
          "chat-message",
          {
            message:
              parsed.data.message,
          }
        );
      }
    );

    // ========================================================
    // TYPING INDICATOR
    // ========================================================

    socket.on(
      "typing",
      (payload) => {
        const parsed =
          typingSchema.safeParse(
            payload
          );

        if (!parsed.success) {
          return;
        }

        const session =
          sessions.get(socket.id);

        if (
          !session?.partnerSocketId
        ) {
          return;
        }

        // Never allow typing events to arbitrary users.
        if (
          parsed.data.target !==
          session.partnerSocketId
        ) {
          return;
        }

        io.to(
          parsed.data.target
        ).emit(
          "typing",
          {
            isTyping:
              parsed.data.isTyping,
          }
        );
      }
    );

    // ========================================================
    // WEBRTC SIGNALING
    // ========================================================
    //
    // This is the important part for video chat.
    //
    // Frontend sends:
    //
    // socket.emit("signal", {
    //   target: partnerSocketId,
    //   signal
    // });
    //
    // Server verifies that target is actually the current
    // partner, then forwards it.
    //
    // ========================================================

    socket.on(
      "signal",
      (payload) => {
        try {
          const parsed =
            webRTCSignalSchema.safeParse(
              payload
            );

          if (!parsed.success) {
            socket.emit(
              "server-error",
              {
                message:
                  "Invalid WebRTC signal.",
              }
            );

            return;
          }

          const session =
            sessions.get(socket.id);

          if (
            !session?.partnerSocketId
          ) {
            return;
          }

          // --------------------------------------------------
          // SECURITY:
          // User can ONLY signal their current partner.
          // --------------------------------------------------

          if (
            parsed.data.target !==
            session.partnerSocketId
          ) {
            console.warn(
              `Blocked unauthorized signal from ${socket.id}`
            );

            return;
          }

          // --------------------------------------------------
          // Make sure partner still exists.
          // --------------------------------------------------

          const partner =
            sessions.get(
              parsed.data.target
            );

          if (!partner) {
            return;
          }

          // --------------------------------------------------
          // Forward WebRTC signal.
          // --------------------------------------------------

          io.to(
            parsed.data.target
          ).emit(
            "signal",
            {
              from: socket.id,

              signal:
                parsed.data.signal,
            }
          );
        } catch (error) {
          console.error(
            "WebRTC signaling error:",
            error
          );

          socket.emit(
            "server-error",
            {
              message:
                "WebRTC signaling failed.",
            }
          );
        }
      }
    );

    // ========================================================
    // VIDEO READY
    // ========================================================
    //
    // Optional frontend event.
    //
    // The server does not create the WebRTC connection.
    // It simply tells the other user that this user is ready.
    //
    // ========================================================

    socket.on(
      "video-ready",
      () => {
        const session =
          sessions.get(socket.id);

        if (
          !session?.partnerSocketId
        ) {
          return;
        }

        io.to(
          session.partnerSocketId
        ).emit(
          "video-peer-ready"
        );
      }
    );

    // ========================================================
    // VIDEO STOP
    // ========================================================

    socket.on(
      "video-stop",
      () => {
        const session =
          sessions.get(socket.id);

        if (
          !session?.partnerSocketId
        ) {
          return;
        }

        io.to(
          session.partnerSocketId
        ).emit(
          "video-ended"
        );
      }
    );

    // ========================================================
    // NEXT
    // ========================================================

    socket.on(
      "next",
      (payload) => {
        void handleFindPartner(
          socket,
          payload
        );
      }
    );

    // ========================================================
    // REPORT
    // ========================================================

    socket.on(
      "report",
      async (payload) => {
        try {
          const parsed =
            reportSchema.safeParse(
              payload
            );

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

          if (!session) {
            return;
          }

          // User can only report current partner.
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

          // End current conversation.
          disconnectPartner(
            socket.id,
            "partner-reported"
          );

          // Remove from queue.
          matchmaker.remove(
            socket.id
          );

          socket.emit(
            "report-submitted"
          );

          // Automatically search again.
          await findAndMatch(
            socket.id
          );
        } catch (error) {
          console.error(
            "Report error:",
            error
          );

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

    // ========================================================
    // BLOCK
    // ========================================================

    socket.on(
      "block",
      async (payload) => {
        try {
          if (
            !payload ||
            typeof payload !==
              "object"
          ) {
            return;
          }

          const blockedGuestId =
            (
              payload as {
                blockedGuestId?: unknown;
              }
            ).blockedGuestId;

          if (
            typeof blockedGuestId !==
              "string" ||
            !blockedGuestId
          ) {
            return;
          }

          const session =
            sessions.get(socket.id);

          if (!session) {
            return;
          }

          // Cannot block yourself.
          if (
            blockedGuestId ===
            session.guestId
          ) {
            return;
          }

          // Can only block current partner.
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

          // End current match.
          disconnectPartner(
            socket.id,
            "partner-blocked"
          );

          // Remove from queue.
          matchmaker.remove(
            socket.id
          );

          socket.emit(
            "block-submitted"
          );

          // Search for another person.
          await findAndMatch(
            socket.id
          );
        } catch (error) {
          console.error(
            "Block error:",
            error
          );

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

    // ========================================================
    // DISCONNECT
    // ========================================================

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          `Socket disconnected: ${socket.id} (${reason})`
        );

        // Remove from waiting queue.
        matchmaker.remove(
          socket.id
        );

        // Notify partner and clean up.
        disconnectPartner(
          socket.id,
          "partner-left"
        );

        // Remove session.
        sessions.delete(
          socket.id
        );

        // Update online count.
        broadcastOnlineUsers();
      }
    );
  }
);

// ============================================================
// SERVER START
// ============================================================

const port = config.PORT;

httpServer.listen(
  port,
  "0.0.0.0",
  () => {
    console.log(
      `RandomChat server listening on :${port}`
    );
  }
);

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

async function shutdown(
  signal: string
) {
  console.log(
    `${signal} received. Shutting down...`
  );

  // Stop accepting new connections.
  httpServer.close(() => {
    console.log(
      "HTTP server closed."
    );
  });

  try {
    await prisma.$disconnect();

    console.log(
      "Prisma disconnected."
    );
  } catch (error) {
    console.error(
      "Prisma shutdown error:",
      error
    );
  }

  process.exit(0);
}

process.on(
  "SIGTERM",
  () => {
    void shutdown("SIGTERM");
  }
);

process.on(
  "SIGINT",
  () => {
    void shutdown("SIGINT");
  }
);