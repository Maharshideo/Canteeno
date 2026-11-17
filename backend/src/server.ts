import http from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";
import { initSocketServer } from "./services/socket.service.js";

const server = http.createServer(app);

// Initialize Socket.IO
initSocketServer(server);

const startServer = async () => {
  try {
    // Verify database connectivity
    await prisma.$connect();
    console.log("✅ MongoDB connected successfully via Prisma");

    server.listen(env.PORT, () => {
      console.log(`🚀 Canteeno Backend running on http://localhost:${env.PORT}`);
      console.log(`📡 Socket.IO server ready for connections`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
