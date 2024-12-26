import http from "node:http";
import { Server, Socket } from "socket.io";

import { ffmpegSocket } from "./socket/FFmpegSocket";
import { RTMPStats } from "./socket/statSocket";

declare module "socket.io" {  
  interface Socket {  
      authId?: string; // or whatever type you expect for authId  
  }  
} 

export const socketServer = async (httpServer: http.Server) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket: any, next) => {
    if (socket.handshake.query?.authId) {
      socket.authId = socket.handshake.query.authId;
      next();
    }
  });

  io.on("connection", (socket:Socket) => {
    console.log("connected=", socket.id);
    ffmpegSocket(socket)
    new RTMPStats(socket)
  });
};
