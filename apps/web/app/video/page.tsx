"use client";

export const dynamic = "force-dynamic";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { io, Socket } from "socket.io-client";

import { useSession } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import AuthMenu from "@/components/AuthMenu";
import GenderModal, {
  GenderOption,
  LookingForOption,
} from "@/components/GenderModal";

type MatchData = {
  partnerGuestId: string;
  partnerSocketId: string;
  partnerCountry?: string | null;
  initiator: boolean;
};

type Message = {
  text: string;
  sender: "me" | "stranger";
};

type ReportReason =
  | "HARASSMENT"
  | "SEXUAL_CONTENT"
  | "SPAM"
  | "SCAM"
  | "HATE"
  | "OTHER";

type SignalData = {
  type: "offer" | "answer" | "candidate";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type SignalPayload = {
  from?: string;
  target?: string;
  signal?: SignalData;
  data?: SignalData;
};

/* -------------------------------------------------------
   Country helpers
------------------------------------------------------- */

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  IN: "India",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  BR: "Brazil",
  JP: "Japan",
  CN: "China",
  RU: "Russia",
  MX: "Mexico",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  PH: "Philippines",
  PK: "Pakistan",
  BD: "Bangladesh",
  ID: "Indonesia",
  NG: "Nigeria",
  ZA: "South Africa",
  KR: "South Korea",
  TR: "Turkey",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  SG: "Singapore",
  MY: "Malaysia",
  VN: "Vietnam",
  TH: "Thailand",
  EG: "Egypt",
  AR: "Argentina",
};

function flagEmoji(code?: string | null) {
  if (!code || code.length !== 2) return "🌍";

  const points = [...code.toUpperCase()].map(
    (c) => 127397 + c.charCodeAt(0)
  );

  return String.fromCodePoint(...points);
}

function countryLabel(code?: string | null) {
  if (!code) return null;

  const name =
    COUNTRY_NAMES[code.toUpperCase()] ??
    code.toUpperCase();

  return `${name} ${flagEmoji(code)}`;
}

/* -------------------------------------------------------
   WebRTC configuration
------------------------------------------------------- */

function getIceServers(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return { iceServers };
}

/* -------------------------------------------------------
   Page
------------------------------------------------------- */

export default function VideoChatPage() {
  const router = useRouter();

  const socketRef = useRef<Socket | null>(null);

  const peerRef =
    useRef<RTCPeerConnection | null>(null);

  const localStreamRef =
    useRef<MediaStream | null>(null);

  const remoteStreamRef =
    useRef<MediaStream | null>(null);

  const localVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const localVideoDesktopRef =
    useRef<HTMLVideoElement | null>(null);

  const remoteVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const partnerSocketIdRef =
    useRef<string | null>(null);

  const partnerGuestIdRef =
    useRef<string | null>(null);

  const pendingCandidatesRef =
    useRef<RTCIceCandidateInit[]>([]);

  const makingOfferRef =
    useRef(false);

  const ignoreOfferRef =
    useRef(false);

  const isClosingRef =
    useRef(false);

  const [connected, setConnected] =
    useState(false);

  const [onlineUsers, setOnlineUsers] =
    useState(0);

  const [matched, setMatched] =
    useState(false);

  const [partnerCountry, setPartnerCountry] =
    useState<string | null>(null);

  const [searching, setSearching] =
    useState(false);

  const [cameraReady, setCameraReady] =
    useState(false);

  const [micEnabled, setMicEnabled] =
    useState(true);

  const [cameraEnabled, setCameraEnabled] =
    useState(true);

  const [remoteVideoReady, setRemoteVideoReady] =
    useState(false);

  const [status, setStatus] = useState(
    "Click Start Video to find a stranger..."
  );

  const [showReport, setShowReport] =
    useState(false);

  const [reportReason, setReportReason] =
    useState<ReportReason>("HARASSMENT");

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
    useState<LookingForOption | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [messageInput, setMessageInput] =
    useState("");

  const [strangerTyping, setStrangerTyping] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const typingTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  /* -------------------------------------------------------
     Authentication / Premium
  ------------------------------------------------------- */

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setGenderPromptResolved(true);
      return;
    }

    let cancelled = false;

    fetch("/api/subscription/status")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Subscription request failed");
        }

        return res.json();
      })
      .then((data) => {
        if (cancelled) return;

        const premium = Boolean(data.isPremium);

        setIsPremium(premium);

        setGenderPromptResolved(!premium);
      })
      .catch(() => {
        if (cancelled) return;

        setIsPremium(false);
        setGenderPromptResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus]);

  /* -------------------------------------------------------
     Auto-scroll chat to latest message
  ------------------------------------------------------- */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /* -------------------------------------------------------
     Match payload
  ------------------------------------------------------- */

  const buildMatchPayload = useCallback(
    () => ({
      sameCountry,
      ...(isPremium && gender && lookingFor
        ? {
            gender,
            lookingFor,
          }
        : {}),
    }),
    [sameCountry, isPremium, gender, lookingFor]
  );

  /* -------------------------------------------------------
     Stop local media
  ------------------------------------------------------- */

  const stopLocalStream = useCallback(() => {
    if (!localStreamRef.current) {
      return;
    }

    localStreamRef.current
      .getTracks()
      .forEach((track) => {
        track.stop();
      });

    localStreamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (localVideoDesktopRef.current) {
      localVideoDesktopRef.current.srcObject = null;
    }

    setCameraReady(false);
  }, []);

  /* -------------------------------------------------------
     Close WebRTC connection
  ------------------------------------------------------- */

  const closePeerConnection = useCallback(() => {
    const peer = peerRef.current;

    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.oniceconnectionstatechange = null;
      peer.ondatachannel = null;

      try {
        peer.close();
      } catch {
        // Already closed.
      }
    }

    peerRef.current = null;

    pendingCandidatesRef.current = [];

    makingOfferRef.current = false;
    ignoreOfferRef.current = false;

    remoteStreamRef.current = null;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setRemoteVideoReady(false);
  }, []);

  /* -------------------------------------------------------
     Get camera + microphone
  ------------------------------------------------------- */

  const getLocalMedia = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error(
        "Your browser does not support camera and microphone access."
      );
    }

    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;

      try {
        await localVideoRef.current.play();
      } catch {
        // Browser may require user interaction.
      }
    }

    if (localVideoDesktopRef.current) {
      localVideoDesktopRef.current.srcObject = stream;

      try {
        await localVideoDesktopRef.current.play();
      } catch {
        // Browser may require user interaction.
      }
    }

    setCameraReady(true);

    return stream;
  }, []);

  /* -------------------------------------------------------
     Flush queued ICE candidates
  ------------------------------------------------------- */

  const flushPendingCandidates = useCallback(
    async (peer: RTCPeerConnection) => {
      if (
        pendingCandidatesRef.current.length === 0
      ) {
        return;
      }

      const candidates = [
        ...pendingCandidatesRef.current,
      ];

      pendingCandidatesRef.current = [];

      for (const candidate of candidates) {
        try {
          await peer.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.warn(
            "Unable to add queued ICE candidate:",
            error
          );
        }
      }
    },
    []
  );

  /* -------------------------------------------------------
     Create peer connection
  ------------------------------------------------------- */

  const createPeerConnection = useCallback(
    async (initiator: boolean) => {
      closePeerConnection();

      const socket = socketRef.current;

      const partnerSocketId =
        partnerSocketIdRef.current;

      if (!socket?.connected) {
        throw new Error(
          "Chat server is not connected."
        );
      }

      if (!partnerSocketId) {
        throw new Error(
          "No stranger is currently connected."
        );
      }

      const localStream =
        await getLocalMedia();

      const peer =
        new RTCPeerConnection(getIceServers());

      peerRef.current = peer;

      remoteStreamRef.current =
        new MediaStream();

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject =
          remoteStreamRef.current;
      }

      /* Add local tracks */

      localStream
        .getTracks()
        .forEach((track) => {
          peer.addTrack(track, localStream);
        });

      /* Receive remote tracks */

      peer.ontrack = (event) => {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current =
            new MediaStream();
        }

        const remoteStream =
          remoteStreamRef.current;

        const existingTrack = remoteStream
          .getTracks()
          .find(
            (track) =>
              track.id === event.track.id
          );

        if (!existingTrack) {
          remoteStream.addTrack(event.track);
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject =
            remoteStream;

          remoteVideoRef.current
            .play()
            .catch(() => {
              // Browser autoplay policy.
            });
        }

        setRemoteVideoReady(true);
      };

      /* ICE candidates */

      peer.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        const target =
          partnerSocketIdRef.current;

        if (!target) {
          return;
        }

        const signal: SignalData = {
          type: "candidate",
          candidate: event.candidate.toJSON(),
        };

        socket.emit("signal", {
          target,
          signal,
        });
      };

      /* Connection state */

      peer.onconnectionstatechange = () => {
        const state =
          peer.connectionState;

        console.log(
          "WebRTC connection state:",
          state
        );

        if (state === "connected") {
          setStatus(
            "You are now connected with a stranger!"
          );
        }

        if (state === "disconnected") {
          setStatus(
            "Video connection interrupted..."
          );
        }

        if (state === "failed") {
          setStatus(
            "Video connection failed. Try Skip."
          );
        }

        if (state === "closed") {
          setRemoteVideoReady(false);
        }
      };

      peer.oniceconnectionstatechange =
        () => {
          const state =
            peer.iceConnectionState;

          console.log(
            "ICE connection state:",
            state
          );

          if (
            state === "failed" ||
            state === "closed"
          ) {
            setRemoteVideoReady(false);
          }
        };

      /* Only initiator creates the offer */

      if (initiator) {
        makingOfferRef.current = true;

        try {
          const offer =
            await peer.createOffer();

          await peer.setLocalDescription(
            offer
          );

          socket.emit("signal", {
            target: partnerSocketId,
            signal: {
              type: "offer",
              sdp: peer.localDescription ?? undefined,
            } satisfies SignalData,
          });
        } finally {
          makingOfferRef.current = false;
        }
      }

      return peer;
    },
    [
      closePeerConnection,
      getLocalMedia,
    ]
  );

  /* -------------------------------------------------------
     Handle WebRTC signaling
  ------------------------------------------------------- */

  const handleSignal = useCallback(
    async (payload: SignalPayload) => {
      const signal =
        payload.signal ?? payload.data;

      if (!signal) {
        console.warn(
          "Received invalid WebRTC signal."
        );

        return;
      }

      const socket =
        socketRef.current;

      if (!socket?.connected) {
        return;
      }

      if (
        payload.from &&
        partnerSocketIdRef.current &&
        payload.from !==
          partnerSocketIdRef.current
      ) {
        return;
      }

      try {
        if (signal.type === "offer") {
          let peer = peerRef.current;

          if (!peer) {
            peer =
              await createPeerConnection(false);
          }

          if (!signal.sdp) {
            return;
          }

          const description =
            new RTCSessionDescription(
              signal.sdp
            );

          const offerCollision =
            description.type === "offer" &&
            (makingOfferRef.current ||
              peer.signalingState !==
                "stable");

          ignoreOfferRef.current =
            offerCollision;

          if (offerCollision) {
            console.warn(
              "Ignoring colliding WebRTC offer."
            );

            return;
          }

          await peer.setRemoteDescription(
            description
          );

          await flushPendingCandidates(peer);

          const answer =
            await peer.createAnswer();

          await peer.setLocalDescription(
            answer
          );

          const target =
            partnerSocketIdRef.current;

          if (!target) {
            return;
          }

          socket.emit("signal", {
            target,
            signal: {
              type: "answer",
              sdp: peer.localDescription ?? undefined,
            } satisfies SignalData,
          });

          return;
        }

        if (signal.type === "answer") {
          const peer =
            peerRef.current;

          if (!peer || !signal.sdp) {
            return;
          }

          if (
            peer.signalingState !==
            "have-local-offer"
          ) {
            return;
          }

          await peer.setRemoteDescription(
            new RTCSessionDescription(
              signal.sdp
            )
          );

          await flushPendingCandidates(peer);

          return;
        }

        if (signal.type === "candidate") {
          if (!signal.candidate) {
            return;
          }

          const peer =
            peerRef.current;

          if (
            !peer ||
            !peer.remoteDescription
          ) {
            pendingCandidatesRef.current.push(
              signal.candidate
            );

            return;
          }

          try {
            await peer.addIceCandidate(
              new RTCIceCandidate(
                signal.candidate
              )
            );
          } catch (error) {
            if (!ignoreOfferRef.current) {
              console.warn(
                "Unable to add ICE candidate:",
                error
              );
            }
          }
        }
      } catch (error) {
        console.error(
          "WebRTC signaling error:",
          error
        );

        setStatus(
          "Unable to establish video connection. Try Skip."
        );
      }
    },
    [
      createPeerConnection,
      flushPendingCandidates,
    ]
  );

  /* -------------------------------------------------------
     Clear current match
  ------------------------------------------------------- */

  const clearMatch = useCallback(() => {
    setMatched(false);
    setPartnerCountry(null);
    setSearching(false);
    setRemoteVideoReady(false);
    setMessages([]);
    setStrangerTyping(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    partnerSocketIdRef.current = null;
    partnerGuestIdRef.current = null;

    closePeerConnection();
  }, [closePeerConnection]);

  /* -------------------------------------------------------
     Socket connection
  ------------------------------------------------------- */

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

    const socket = io(socketUrl, {
      auth: {
        guestId,
      },

      transports: ["websocket", "polling"],

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);

      setStatus(
        "Connected. Click Start Video to find a stranger."
      );
    });

    socket.on(
      "connect_error",
      (error) => {
        console.error(
          "Socket connection error:",
          error
        );

        setConnected(false);

        setStatus(
          "Unable to connect to the chat server."
        );
      }
    );

    socket.on("disconnect", () => {
      setConnected(false);
      setSearching(false);

      clearMatch();

      setStatus(
        "Disconnected from the chat server."
      );
    });

    socket.on(
      "online-users",
      (data: { count: number }) => {
        if (
          typeof data?.count ===
          "number"
        ) {
          setOnlineUsers(data.count);
        }
      }
    );

    socket.on("queue-status", () => {
      closePeerConnection();

      setMatched(false);
      setPartnerCountry(null);
      setSearching(true);
      setRemoteVideoReady(false);

      partnerSocketIdRef.current = null;
      partnerGuestIdRef.current = null;

      setStatus(
        "Waiting for a stranger to connect..."
      );
    });

    socket.on(
      "matched",
      async (data: MatchData) => {
        if (
          !data?.partnerSocketId
        ) {
          setStatus(
            "Invalid match received from server."
          );

          return;
        }

        partnerSocketIdRef.current =
          data.partnerSocketId;

        partnerGuestIdRef.current =
          data.partnerGuestId;

        setMatched(true);
        setSearching(false);

        setPartnerCountry(
          data.partnerCountry ?? null
        );

        setRemoteVideoReady(false);
        setMessages([]);
        setStrangerTyping(false);

        setStatus(
          "Stranger found. Connecting video..."
        );

        try {
          await getLocalMedia();

          await createPeerConnection(
            Boolean(data.initiator)
          );
        } catch (error) {
          console.error(
            "Unable to initialize video:",
            error
          );

          setStatus(
            "Camera or microphone permission is required for video chat."
          );
        }
      }
    );

    socket.on(
      "signal",
      handleSignal
    );

    socket.on(
      "webrtc-signal",
      handleSignal
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

    socket.on(
      "typing",
      (data: { isTyping: boolean }) => {
        setStrangerTyping(data.isTyping);
      }
    );

    socket.on(
      "partner-left",
      () => {
        clearMatch();

        setStatus(
          "The stranger left the video chat."
        );
      }
    );

    socket.on(
      "partner-reported",
      () => {
        clearMatch();

        setStatus(
          "The stranger ended the chat."
        );
      }
    );

    socket.on(
      "partner-blocked",
      () => {
        clearMatch();

        setStatus(
          "The stranger ended the chat."
        );
      }
    );

    socket.on(
      "report-submitted",
      () => {
        setShowReport(false);

        clearMatch();

        setStatus(
          "Report submitted. Finding a new stranger..."
        );
      }
    );

    socket.on(
      "server-error",
      (data: {
        message?: string;
      }) => {
        setStatus(
          data?.message ||
            "Server error."
        );
      }
    );

    return () => {
      socket.removeAllListeners();

      socket.disconnect();

      socketRef.current = null;

      closePeerConnection();

      stopLocalStream();
    };
  }, [
    clearMatch,
    closePeerConnection,
    createPeerConnection,
    getLocalMedia,
    handleSignal,
    stopLocalStream,
  ]);

  /* -------------------------------------------------------
     Text chat: typing + send
  ------------------------------------------------------- */

  const handleMessageInputChange = (
    value: string
  ) => {
    setMessageInput(value);

    const socket = socketRef.current;
    const target = partnerSocketIdRef.current;

    if (!socket?.connected || !matched || !target) {
      return;
    }

    socket.emit("typing", {
      target,
      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socket.connected && partnerSocketIdRef.current) {
        socket.emit("typing", {
          target: partnerSocketIdRef.current,
          isTyping: false,
        });
      }
    }, 1500);
  };

  const sendMessage = () => {
    const socket = socketRef.current;
    const target = partnerSocketIdRef.current;
    const text = messageInput.trim();

    if (!socket?.connected || !matched || !target || !text) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit("typing", {
      target,
      isTyping: false,
    });

    socket.emit("chat-message", {
      target,
      message: text,
    });

    setMessages((prev) => [
      ...prev,
      { text, sender: "me" },
    ]);

    setMessageInput("");
  };

  /* -------------------------------------------------------
     Start video chat
  ------------------------------------------------------- */

  const startVideoChat = async () => {
    const socket =
      socketRef.current;

    if (!socket?.connected) {
      setStatus(
        "Unable to connect to the chat server."
      );

      return;
    }

    try {
      setStatus(
        "Requesting camera and microphone..."
      );

      await getLocalMedia();

      clearMatch();

      setSearching(true);

      setStatus(
        "Looking for a stranger..."
      );

      socket.emit(
        "find-partner",
        buildMatchPayload()
      );
    } catch (error) {
      console.error(
        "Media permission error:",
        error
      );

      setStatus(
        "Please allow camera and microphone access to use video chat."
      );
    }
  };

  /* -------------------------------------------------------
     Skip to next stranger
  ------------------------------------------------------- */

  const nextVideoChat = async () => {
    const socket =
      socketRef.current;

    if (!socket?.connected) {
      return;
    }

    try {
      await getLocalMedia();
    } catch {
      setStatus(
        "Camera and microphone permission is required."
      );

      return;
    }

    closePeerConnection();

    partnerSocketIdRef.current = null;
    partnerGuestIdRef.current = null;

    setMatched(false);
    setPartnerCountry(null);
    setRemoteVideoReady(false);
    setSearching(true);

    setStatus(
      "Looking for a new stranger..."
    );

    socket.emit(
      "next",
      buildMatchPayload()
    );
  };

  /* -------------------------------------------------------
     Toggle microphone
  ------------------------------------------------------- */

  const toggleMicrophone = () => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    const audioTracks =
      stream.getAudioTracks();

    if (audioTracks.length === 0) {
      return;
    }

    const nextState =
      !audioTracks[0].enabled;

    audioTracks.forEach(
      (track) => {
        track.enabled =
          nextState;
      }
    );

    setMicEnabled(nextState);
  };

  /* -------------------------------------------------------
     Toggle camera
  ------------------------------------------------------- */

  const toggleCamera = () => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    const videoTracks =
      stream.getVideoTracks();

    if (videoTracks.length === 0) {
      return;
    }

    const nextState =
      !videoTracks[0].enabled;

    videoTracks.forEach(
      (track) => {
        track.enabled =
          nextState;
      }
    );

    setCameraEnabled(nextState);
  };

  /* -------------------------------------------------------
     Report user
  ------------------------------------------------------- */

  const submitReport = () => {
    const socket =
      socketRef.current;

    const partnerGuestId =
      partnerGuestIdRef.current;

    if (
      !socket?.connected ||
      !matched ||
      !partnerGuestId
    ) {
      return;
    }

    socket.emit("report", {
      reportedGuestId:
        partnerGuestId,

      reason: reportReason,
    });

    setShowReport(false);

    clearMatch();

    setStatus(
      "Submitting report..."
    );
  };

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  return (
    <main className="h-dvh overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col transition-colors">
      {/* Premium gender modal */}

      {isPremium &&
        !genderPromptResolved && (
          <GenderModal
            onConfirm={({
              gender: selectedGender,
              lookingFor:
                selectedLookingFor,
            }) => {
              setGender(
                selectedGender
              );

              setLookingFor(
                selectedLookingFor
              );

              setGenderPromptResolved(
                true
              );
            }}
          />
        )}

      {/* Header */}

      <header className="flex-none bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between">
        <button
          onClick={() =>
            router.push("/")
          }
          className="flex items-center gap-2 text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400 hover:opacity-80 transition"
        >
          <Image src="/logo.png" alt="RandomChat logo" width={32} height={32} />
          <span className="hidden sm:inline">RandomChat</span>
        </button>

        <div className="flex items-center gap-3 md:gap-5">
          <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />

              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>

            {onlineUsers} online
          </div>

          <ThemeToggle />

          <AuthMenu />
        </div>
      </header>

      {/* Main */}

      <div className="flex-1 w-full p-3 md:p-6 flex flex-col min-h-0 gap-3">
        <p className="flex-none text-center text-xs text-gray-500 dark:text-gray-400">
          {status}
          {"  ·  Server: "}
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

        {matched && partnerCountry && (
          <p className="flex-none text-center text-sm font-medium text-green-600 dark:text-green-400">
            You&apos;re now talking to a random stranger{" "}
            {countryLabel(partnerCountry)}
          </p>
        )}

        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 md:gap-4">
          {/* LEFT: single unified box holding both video slots */}

          <div className="flex flex-col w-full md:w-1/2 bg-black rounded-2xl overflow-hidden border border-gray-800">
            {/* Stranger video slot */}

            <div className="relative flex-1 md:flex-[3] min-h-[220px] md:min-h-[180px] bg-black">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {!remoteVideoReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950">
                  <div className="text-4xl mb-3">
                    👤
                  </div>

                  <p className="text-gray-400 text-xs text-center px-4">
                    {searching
                      ? "Waiting for a stranger..."
                      : "Stranger video will appear here"}
                  </p>
                </div>
              )}

              {matched && (
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-green-500/90 px-2 py-1 rounded-md text-[10px] font-bold text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>
              )}

              {/* Mobile-only floating local video (picture-in-picture) */}

              <div className="md:hidden absolute top-2 right-2 w-20 h-28 sm:w-24 sm:h-32 rounded-lg overflow-hidden border-2 border-white/70 shadow-lg bg-black z-10">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
                    <span className="text-xl">📷</span>
                  </div>
                )}

                {!cameraEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 text-[9px] font-bold text-white text-center px-1">
                    Camera Off
                  </div>
                )}
              </div>

              {/* Mobile-only label + report, overlaid on the video since there's no separator bar on mobile */}

              <div className="md:hidden absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold text-white">
                <span className="text-blue-400">💬</span>
                Stranger
              </div>

              <button
                onClick={() => setShowReport(true)}
                disabled={!matched}
                title="Report this user"
                className="md:hidden absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-600/90 hover:bg-red-500 disabled:bg-gray-700 disabled:opacity-60 text-xs font-bold text-white transition z-10"
              >
                !
              </button>

              {/* Mobile-only floating mic + camera toggle buttons, bottom center */}

              <div className="md:hidden absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <button
                  onClick={toggleMicrophone}
                  disabled={!cameraReady}
                  title={micEnabled ? "Mute microphone" : "Unmute microphone"}
                  className={`w-9 h-9 flex items-center justify-center rounded-full text-white text-sm transition disabled:opacity-50 ${
                    micEnabled
                      ? "bg-black/60 hover:bg-black/80 backdrop-blur-sm"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {micEnabled ? "🎙️" : "🔇"}
                </button>

                <button
                  onClick={toggleCamera}
                  disabled={!cameraReady}
                  title={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                  className={`w-9 h-9 flex items-center justify-center rounded-full text-white text-sm transition disabled:opacity-50 ${
                    cameraEnabled
                      ? "bg-black/60 hover:bg-black/80 backdrop-blur-sm"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {cameraEnabled ? "📷" : "🚫"}
                </button>
              </div>
            </div>

            {/* Desktop-only separator bar: label on left, report icon on right — sits between the two slots */}

            <div className="hidden md:flex flex-none items-center justify-between px-3 py-2 bg-black border-t border-gray-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <span className="text-blue-400">💬</span>
                Stranger
              </div>

              <button
                onClick={() => setShowReport(true)}
                disabled={!matched}
                title="Report this user"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-red-600/90 hover:bg-red-500 disabled:bg-gray-700 disabled:opacity-60 text-xs font-bold text-white transition"
              >
                !
              </button>
            </div>

            {/* Desktop-only local camera slot */}

            <div className="hidden md:block relative flex-[2] min-h-[140px] bg-black">
              <video
                ref={localVideoDesktopRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />

              {!cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950">
                  <div className="text-4xl mb-3">
                    📷
                  </div>

                  <p className="text-gray-400 text-xs">
                    Your camera preview
                  </p>
                </div>
              )}

              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold text-white">
                You
              </div>

              {!cameraEnabled && (
                <div className="absolute top-2 right-2 bg-red-500/90 px-2 py-1 rounded-md text-[10px] font-bold text-white">
                  Camera Off
                </div>
              )}

              {/* Desktop floating mic + camera toggle buttons */}

              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <button
                  onClick={toggleMicrophone}
                  disabled={!cameraReady}
                  title={micEnabled ? "Mute microphone" : "Unmute microphone"}
                  className={`w-9 h-9 flex items-center justify-center rounded-full text-white text-sm transition disabled:opacity-50 ${
                    micEnabled
                      ? "bg-black/60 hover:bg-black/80 backdrop-blur-sm"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {micEnabled ? "🎙️" : "🔇"}
                </button>

                <button
                  onClick={toggleCamera}
                  disabled={!cameraReady}
                  title={cameraEnabled ? "Turn camera off" : "Turn camera on"}
                  className={`w-9 h-9 flex items-center justify-center rounded-full text-white text-sm transition disabled:opacity-50 ${
                    cameraEnabled
                      ? "bg-black/60 hover:bg-black/80 backdrop-blur-sm"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {cameraEnabled ? "📷" : "🚫"}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: rules panel (before match) or live chat (after match) — other half */}

          <div className="flex-1 min-h-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 md:p-5 flex flex-col">
            {!matched ? (
              <div className="flex-1 flex flex-col">
                <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-900 dark:text-white">
                  Press Start to begin video chat.
                </h2>

                <label className="inline-flex items-center gap-2 text-sm font-semibold bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 w-fit mb-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameCountry}
                    onChange={(e) =>
                      setSameCountry(
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 accent-orange-500"
                  />
                  🌍 Same country
                </label>

                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="text-red-500 dark:text-red-400 font-bold">
                    You must be 18+
                  </li>
                  <li>
                    No explicit content, hate speech, or harassment
                  </li>
                  <li>Your camera must show you, live</li>
                  <li>
                    Do not ask for gender. This is not a dating site
                  </li>
                  <li>
                    Reports help moderators keep RandomChat safe
                  </li>
                  <li className="text-red-500 dark:text-red-400 font-bold">
                    Violators will be banned
                  </li>
                </ul>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-500 text-sm text-center mt-6">
                      Say hi to your stranger!
                    </p>
                  ) : (
                    messages.map((item, index) => (
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
                              ? "inline-block bg-blue-600 text-white px-3 py-2 rounded-xl max-w-[85%] break-words text-sm text-left"
                              : "inline-block bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-xl max-w-[85%] break-words text-sm"
                          }
                        >
                          {item.text}
                        </span>
                      </div>
                    ))
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="flex-none h-5">
                  {strangerTyping && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic animate-pulse">
                      Stranger is typing...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Single Start/Skip + message input bar */}

            <div className="flex-none pt-3 flex gap-2 items-stretch">
              <button
                onClick={
                  matched ? nextVideoChat : startVideoChat
                }
                disabled={!connected || searching}
                className="flex-none px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold transition"
              >
                {matched
                  ? "⏭ Skip"
                  : searching
                  ? "Searching..."
                  : "▶ Start"}
              </button>

              <input
                type="text"
                value={messageInput}
                disabled={!matched}
                onChange={(e) =>
                  handleMessageInputChange(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  matched
                    ? "Type a message..."
                    : "Connect with a stranger first..."
                }
                className="flex-1 min-w-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 disabled:opacity-60"
              />

              <button
                onClick={sendMessage}
                disabled={!matched || !messageInput.trim()}
                className="flex-none px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold transition"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report modal */}

      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              Report Stranger
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Select the reason for your
              report.
            </p>

            <select
              value={reportReason}
              onChange={(e) =>
                setReportReason(
                  e.target
                    .value as ReportReason
                )
              }
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white mb-5 outline-none focus:border-blue-500"
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
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold"
              >
                Cancel
              </button>

              <button
                onClick={
                  submitReport
                }
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
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
