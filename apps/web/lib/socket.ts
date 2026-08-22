import { io, Socket } from "socket.io-client";

export function createSocket(guestId: string): Socket {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

  return io(url, {
    transports: ["websocket"],
    auth: { guestId }
  });
}
