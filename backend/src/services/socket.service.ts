import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { SocketUser } from "../types/index.js";

let io: Server | null = null;

export const initSocketServer = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: [env.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  // JWT Authentication for Socket.IO
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
      (socket.handshake.query?.token as string);

    if (!token) {
      // Allow anonymous connection with restricted rooms if needed, or require auth
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as SocketUser & { id?: string };
      const userId = decoded.userId || decoded.id;
      if (userId) {
        socket.data.user = {
          userId,
          role: decoded.role,
          canteenId: decoded.canteenId,
        };
      }
      next();
    } catch (err) {
      next();
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as SocketUser | undefined;

    if (user?.userId) {
      // User joins personal room for order status and personal alerts
      const userRoom = `user:${user.userId}`;
      socket.join(userRoom);

      // If staff, join canteen room
      if (user.canteenId) {
        socket.join(`canteen:${user.canteenId}`);
      }

      // If admin, join admin room
      if (user.role === "ADMIN") {
        socket.join("admin:all");
      }
    }

    // Clients can also subscribe to canteen rooms or their order rooms
    socket.on("join:canteen", (canteenId: string) => {
      socket.join(`canteen:${canteenId}`);
    });

    socket.on("join:order", (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("disconnect", () => {
      // cleanup handled automatically by Socket.io
    });
  });

  return io;
};

export const getIO = (): Server | null => io;

export const notifyUser = (userId: string, event: string, data: any) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

export const notifyCanteen = (canteenId: string, event: string, data: any) => {
  if (!io) return;
  io.to(`canteen:${canteenId}`).emit(event, data);
};

export const notifyOrder = (orderId: string, event: string, data: any) => {
  if (!io) return;
  io.to(`order:${orderId}`).emit(event, data);
};

export const broadcastAdmin = (event: string, data: any) => {
  if (!io) return;
  io.to("admin:all").emit(event, data);
};
