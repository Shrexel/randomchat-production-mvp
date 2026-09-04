"use client";

export const dynamic = "force-dynamic";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import {
  io,
  Socket,
} from "socket.io-client";

import { useSession } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import AuthMenu from "@/components/AuthMenu";
import GenderModal, {
  GenderOption,
  LookingForOption,
} from "@/components/GenderModal";

type Message = {
  text: string;
  sender: "me" | "stranger";
};

type MatchData = {
  partnerGuestId: string;
  partnerSocketId: string;
  initiator: boolean;
};

type ReportReason =
  | "HARASSMENT"
  | "SEXUAL_CONTENT"
  | "SPAM"
  | "SCAM"
  | "HATE"
  | "OTHER";

export default function TextChatPage() {
  const router = useRouter();

  const socketRef =
    useRef<Socket | null>(null);

  const partnerSocketIdRef =
    useRef<string | null>(null);

  const partnerGuestIdRef =
    useRef<string | null>(null);

  const typingTimeoutRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const [connected, setConnected] =
    useState(false);

  const [onlineUsers, setOnlineUsers] =
    useState(0);

  const [status, setStatus] = useState(
    "Click Start Chat to find a stranger..."
  );

  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [matched, setMatched] =
    useState(false);

  const [strangerTyping, setStrangerTyping] =
    useState(false);

  const [showReport, setShowReport] =
    useState(false);

  const [reportReason, setReportReason] =
    useState<ReportReason>(
      "HARASSMENT"
    );

  const [sameCountry, setSameCountry] =
    useState(false);

  const { status: authStatus } =
    useSession();

  const [isPremium, setIsPremium] =
    useState(false);

  const [
    genderPromptResolved,
    setGenderPromptResolved,
  ] = useState(false);

  const [gender, setGender] =
    useState<GenderOption | null>(null);

  const [lookingFor, setLookingFor] =
    useState<LookingForOption | null>(
      null
    );

  useEffect(() => {
    if (authStatus !== "authenticated") {
      // Guests and signed-out users skip
      // the gender prompt entirely.
      setGenderPromptResolved(true);
      return;
    }

    fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((data) => {
        setIsPremium(
          Boolean(data.isPremium)
        );

        // Non-premium signed-in users
        // also chat fully at random.
        setGenderPromptResolved(
          !data.isPremium
        );
      })
      .catch(() =>
        setGenderPromptResolved(true)
      );
  }, [authStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    let guestId =
      localStorage.getItem(
        "randomchat_guest_id"
      );

    if (!guestId) {
      guestId = crypto.randomUUID();

      localStorage.setItem(
        "randomchat_guest_id",
        guestId
      );
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      "http://localhost:4000";

    const socket = io(
      socketUrl,
      {
        auth: {
          guestId,
        },
      }
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);

      setStatus(
        "Connected. Click Start Chat to find a stranger..."
      );
    });

    socket.on("connect_error", () => {
      setConnected(false);

      setStatus(
        "Unable to connect to the chat server."
      );
    });

    socket.on("disconnect", () => {
      setConnected(false);

      setMatched(false);

      setStrangerTyping(false);

      partnerSocketIdRef.current = null;

      partnerGuestIdRef.current = null;

      setMessages([]);

      setStatus(
        "Disconnected from the chat server."
      );
    });

    // =========================
    // ONLINE USERS
    // =========================

    socket.on(
      "online-users",
      (data: { count: number }) => {
        setOnlineUsers(data.count);
      }
    );

    socket.on("queue-status", () => {
      setMatched(false);

      setStrangerTyping(false);

      partnerSocketIdRef.current = null;

      partnerGuestIdRef.current = null;

      setStatus(
        "Waiting for a stranger to connect..."
      );
    });

    socket.on(
      "matched",
      (data: MatchData) => {
        partnerSocketIdRef.current =
          data.partnerSocketId;

        partnerGuestIdRef.current =
          data.partnerGuestId;

        setMatched(true);

        setMessages([]);

        setStrangerTyping(false);

        setStatus(
          "You are now connected with a stranger!"
        );
      }
    );

    socket.on(
      "chat-message",
      (data: { message: string }) => {
        setMessages((prev) => [
          ...prev,
          {
            text: data.message,
            sender: "stranger",
          },
        ]);

        setStrangerTyping(false);
      }
    );

    // =========================
    // STRANGER TYPING
    // =========================

    socket.on(
      "typing",
      (data: { isTyping: boolean }) => {
        setStrangerTyping(
          data.isTyping
        );
      }
    );

    socket.on("partner-left", () => {
      setMatched(false);

      setStrangerTyping(false);

      partnerSocketIdRef.current = null;

      partnerGuestIdRef.current = null;

      setMessages([]);

      setStatus(
        "The stranger left the chat."
      );
    });

    socket.on(
      "partner-reported",
      () => {
        setMatched(false);

        setStrangerTyping(false);

        partnerSocketIdRef.current =
          null;

        partnerGuestIdRef.current =
          null;

        setMessages([]);

        setStatus(
          "The stranger ended the chat."
        );
      }
    );

    socket.on(
      "partner-blocked",
      () => {
        setMatched(false);

        setStrangerTyping(false);

        partnerSocketIdRef.current =
          null;

        partnerGuestIdRef.current =
          null;

        setMessages([]);

        setStatus(
          "The stranger ended the chat."
        );
      }
    );

    socket.on(
      "report-submitted",
      () => {
        setShowReport(false);

        setMessages([]);

        setStrangerTyping(false);

        setStatus(
          "Report submitted. Finding a new stranger..."
        );
      }
    );

    socket.on(
      "block-submitted",
      () => {
        setMessages([]);

        setStrangerTyping(false);

        setStatus(
          "User blocked. Finding a new stranger..."
        );
      }
    );

    socket.on(
      "server-error",
      (data: {
        message?: string;
      }) => {
        setStatus(
          data.message ||
            "Server error."
        );
      }
    );

    return () => {
      if (
        typingTimeoutRef.current
      ) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }

      socket.disconnect();
    };
  }, []);

  const buildMatchPayload = () => ({
    sameCountry,
    ...(isPremium && gender && lookingFor
      ? { gender, lookingFor }
      : {}),
  });

  const startChat = () => {
    if (
      !socketRef.current?.connected
    ) {
      setStatus(
        "Unable to connect to the chat server."
      );

      return;
    }

    setMessages([]);

    setMessage("");

    setMatched(false);

    setStrangerTyping(false);

    partnerSocketIdRef.current = null;

    partnerGuestIdRef.current = null;

    setStatus(
      "Looking for a stranger..."
    );

    socketRef.current.emit(
      "find-partner",
      buildMatchPayload()
    );
  };

  // =========================
  // SEND TYPING STATUS
  // =========================

  const handleMessageChange = (
    value: string
  ) => {
    setMessage(value);

    if (
      !socketRef.current?.connected ||
      !matched ||
      !partnerSocketIdRef.current
    ) {
      return;
    }

    socketRef.current.emit("typing", {
      target:
        partnerSocketIdRef.current,

      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    typingTimeoutRef.current =
      setTimeout(() => {
        if (
          socketRef.current?.connected &&
          partnerSocketIdRef.current
        ) {
          socketRef.current.emit(
            "typing",
            {
              target:
                partnerSocketIdRef.current,

              isTyping: false,
            }
          );
        }
      }, 1500);
  };

  const sendMessage = () => {
    if (
      !socketRef.current?.connected ||
      !matched ||
      !partnerSocketIdRef.current ||
      !message.trim()
    ) {
      return;
    }

    const text = message.trim();

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    socketRef.current.emit("typing", {
      target:
        partnerSocketIdRef.current,

      isTyping: false,
    });

    socketRef.current.emit(
      "chat-message",
      {
        target:
          partnerSocketIdRef.current,

        message: text,
      }
    );

    setMessages((prev) => [
      ...prev,
      {
        text,
        sender: "me",
      },
    ]);

    setMessage("");
  };

  const nextChat = () => {
    if (
      !socketRef.current?.connected
    ) {
      return;
    }

    if (!matched) {
      setStatus(
        "Looking for a stranger..."
      );

      socketRef.current.emit(
        "find-partner",
        buildMatchPayload()
      );

      return;
    }

    if (
      partnerSocketIdRef.current
    ) {
      socketRef.current.emit(
        "typing",
        {
          target:
            partnerSocketIdRef.current,

          isTyping: false,
        }
      );
    }

    setMessages([]);

    setMessage("");

    setMatched(false);

    setStrangerTyping(false);

    partnerSocketIdRef.current = null;

    partnerGuestIdRef.current = null;

    setStatus(
      "Looking for a new stranger..."
    );

    socketRef.current.emit(
      "next",
      buildMatchPayload()
    );
  };

  const blockUser = () => {
    if (
      !socketRef.current?.connected ||
      !matched ||
      !partnerGuestIdRef.current
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to block this user? You will not be matched with them again."
      );

    if (!confirmed) return;

    setMatched(false);

    setStrangerTyping(false);

    socketRef.current.emit(
      "block",
      {
        blockedGuestId:
          partnerGuestIdRef.current,
      }
    );
  };

  const submitReport = () => {
    if (
      !socketRef.current?.connected ||
      !matched ||
      !partnerGuestIdRef.current
    ) {
      return;
    }

    socketRef.current.emit(
      "report",
      {
        reportedGuestId:
          partnerGuestIdRef.current,

        reason:
          reportReason,
      }
    );

    setShowReport(false);

    setMatched(false);

    setStrangerTyping(false);

    partnerSocketIdRef.current =
      null;

    partnerGuestIdRef.current =
      null;

    setMessages([]);

    setStatus(
      "Submitting report..."
    );
  };

  return (
    <main className="h-dvh h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      {isPremium && !genderPromptResolved && (
        <GenderModal
          onConfirm={({
            gender: g,
            lookingFor: lf,
          }) => {
            setGender(g);
            setLookingFor(lf);
            setGenderPromptResolved(true);
          }}
        />
      )}
      {/* Header */}

      <header className="flex-none bg-white dark:bg-gray-900 shadow-sm py-3 px-4 md:py-4 md:px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() =>
            router.push("/")
          }
          className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity"
        >
          RandomChat
        </button>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>

            {onlineUsers}{" "}
            <span className="hidden sm:inline">
              {onlineUsers === 1
                ? "user"
                : "users"}{" "}
              online
            </span>
          </div>

          <ThemeToggle />
          <AuthMenu />
        </div>
      </header>

      <div className="flex-1 min-h-0 h-full max-w-4xl w-full mx-auto p-3 md:p-6 flex flex-col">
        <div className="flex-none bg-white dark:bg-gray-900 w-full rounded-t-2xl border border-b-0 border-gray-200 dark:border-gray-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={sameCountry}
              onChange={(e) =>
                setSameCountry(
                  e.target.checked
                )
              }
              className="w-4 h-4 accent-blue-600"
            />
            🌍 Match with my country only
          </label>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Applies to your next search
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 w-full rounded-b-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 md:p-6 flex flex-col flex-1 min-h-0">
          {/* Chat messages */}

          <div className="flex-1 min-h-0 border border-gray-300 dark:border-gray-700 rounded-xl p-4 mb-3 overflow-y-auto space-y-3 bg-gray-50 dark:bg-gray-950">
            {messages.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center">
                {status}
              </p>
            ) : (
              messages.map(
                (item, index) => (
                  <div
                    key={index}
                    className={
                      item.sender === "me"
                        ? "text-right"
                        : "text-left"
                    }
                  >
                    <span
                      className={
                        item.sender === "me"
                          ? "inline-block bg-blue-600 text-white px-4 py-2 rounded-xl max-w-[80%] break-words text-left"
                          : "inline-block bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-xl max-w-[80%] break-words"
                      }
                    >
                      {item.text}
                    </span>
                  </div>
                )
              )
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator */}

          <div className="flex-none h-6 mb-2">
            {matched &&
              strangerTyping && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic animate-pulse">
                  Stranger is typing...
                </p>
              )}
          </div>

          {/* Message input */}

          <div className="flex-none flex gap-2 md:gap-3 w-full mb-4">
            <input
              type="text"
              value={message}
              disabled={!matched}
              onChange={(e) =>
                handleMessageChange(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  e.preventDefault();

                  sendMessage();
                }
              }}
              placeholder={
                matched
                  ? "Type a message..."
                  : "Connect with a stranger first..."
              }
              className="flex-1 min-w-0 border-2 border-gray-400 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-xl px-4 py-3 outline-none focus:border-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-900 disabled:text-gray-500"
            />

            <button
              onClick={sendMessage}
              disabled={
                !matched ||
                !message.trim() ||
                !partnerSocketIdRef.current
              }
              className="bg-blue-600 text-white px-5 md:px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>

          {/* Buttons */}

          <div className="flex-none flex flex-wrap gap-3">
            <button
              onClick={startChat}
              disabled={
                !connected ||
                matched
              }
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold disabled:bg-gray-400"
            >
              Start Chat
            </button>

            <button
              onClick={nextChat}
              disabled={!connected}
              className="bg-gray-800 text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-900 disabled:bg-gray-400"
            >
              Next
            </button>

            <button
              onClick={blockUser}
              disabled={!matched}
              className="bg-orange-500 text-white px-5 py-3 rounded-xl font-bold hover:bg-orange-600 disabled:bg-gray-300"
            >
              Block
            </button>

            <button
              onClick={() =>
                setShowReport(true)
              }
              disabled={!matched}
              className="bg-red-500 text-white px-5 py-3 rounded-xl font-bold hover:bg-red-600 disabled:bg-gray-300"
            >
              Report
            </button>
          </div>

          <p className="flex-none text-sm text-gray-500 dark:text-gray-400 mt-4">
            Server:{" "}

            {connected ? (
              <span className="text-green-600 dark:text-green-400 font-bold">
                Connected
              </span>
            ) : (
              <span className="text-red-500 font-bold">
                Disconnected
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Report Modal */}

      {showReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Report Stranger
            </h3>

            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Please select the reason
              for your report.
            </p>

            <select
              value={reportReason}
              onChange={(e) =>
                setReportReason(
                  e.target
                    .value as ReportReason
                )
              }
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 mb-5"
            >
              <option value="HARASSMENT">
                Harassment
              </option>

              <option value="SEXUAL_CONTENT">
                Sexual Content
              </option>

              <option value="SPAM">
                Spam
              </option>

              <option value="SCAM">
                Scam
              </option>

              <option value="HATE">
                Hate Speech
              </option>

              <option value="OTHER">
                Other
              </option>
            </select>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setShowReport(false)
                }
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 py-3 rounded-xl font-bold"
              >
                Cancel
              </button>

              <button
                onClick={submitReport}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
