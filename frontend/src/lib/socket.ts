import { io, Socket } from "socket.io-client";
import { getAuthToken } from "./api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const token = getAuthToken();
    socketInstance = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      console.log("🔌 Connected to Canteeno live Socket.IO server");
    });

    socketInstance.on("disconnect", () => {
      console.log("🔌 Disconnected from Canteeno Socket.IO server");
    });
  }

  return socketInstance;
};

export const reconnectSocketWithToken = (token?: string | null) => {
  if (socketInstance) {
    socketInstance.disconnect();
  }
  socketInstance = io(SOCKET_URL, {
    auth: { token: token || getAuthToken() },
    autoConnect: true,
    transports: ["websocket", "polling"],
  });
  return socketInstance;
};

export const subscribeToCanteen = (canteenId: string) => {
  const socket = getSocket();
  socket.emit("join:canteen", canteenId);
};

export const subscribeToOrder = (orderId: string) => {
  const socket = getSocket();
  socket.emit("join:order", orderId);
};
