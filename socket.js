/**
 * @fileoverview Socket.IO server with Firebase authentication, role management, and heartbeat support.
 */

import { Server } from "socket.io";
import { getAuth } from "firebase-admin/auth";
import { User } from "./models/User.js";
import {
  runFastapiReply,
  runFastapiGenerate,
  runFastapiAutocomplete
} from "./services/fastapiModelRunner.js";

const corsOriginsEnv = process.env.SOCKET_CORS_ORIGINS;
if (!corsOriginsEnv) {
  throw new Error("❌ SOCKET_CORS_ORIGINS must be defined");
}
const corsOrigins = corsOriginsEnv.split(",").map((o) => o.trim());

export function setupSocket(server) {
  const io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 120000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      const user = await User.findOne({ firebaseUid: decodedToken.uid });

      socket.user = {
        uid: decodedToken.uid,
        role: user?.role || "guest",
      };

      console.log("🔐 Authenticated socket");
      next();
    } catch (err) {
      console.error("❌ Invalid token:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log("🧑 Client connected");

    socket.emit("connected", { message: "Socket successfully connected 🚀" });

    // Heartbeat
    socket.on("heartbeat", (payload) => {
      console.log("💓 Heartbeat received");
      socket.emit("heartbeat_ack", { ts: Date.now() });
    });

    socket.on("assistant_prompt", async (prompt) => {
      try {
        const response = await runFastapiReply({
          prompt,
          language: "",
          code: "",
          user_id: socket.user.uid,
          user_level: socket.user.role,
          token: socket.handshake.auth?.token,
        });
        socket.emit("assistant_response", response);
      } catch (err) {
        console.error("❌ Assistant error:", err.message);
        socket.emit("assistant_response", "Error generating response");
      }
    });

    socket.on("assistant_generate", async ({ prompt, language }) => {
      try {
        const code = await runFastapiGenerate({
          prompt,
          language,
          token: socket.handshake.auth?.token,
        });
        socket.emit("assistant_generate_response", code);
      } catch (err) {
        console.error("❌ Generate error:", err.message);
        socket.emit("assistant_generate_response", "Error generating code");
      }
    });

    socket.on("assistant_autocomplete", async ({ code, language }) => {
      try {
        const suggestion = await runFastapiAutocomplete({
          code,
          language,
          token: socket.handshake.auth?.token,
        });
        socket.emit("assistant_autocomplete_response", suggestion);
      } catch (err) {
        console.error("❌ Autocomplete error:", err.message);
        socket.emit("assistant_autocomplete_response", "Error generating suggestion");
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`👋 Client disconnected (${reason})`);
    });
  });

  return io;
}
