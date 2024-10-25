import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from '@vercel/edge';

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: 'edge',
};

const userSocketMap = {};

const getAllConnectedClients = (roomId, io) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};

export default async function handler(req) {
  if (req.method === 'GET') {
    const io = new Server({
      cors: {
        origin: process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    io.on("connection", (socket) => {
      socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId, io);
        
        clients.forEach(({ socketId }) => {
          io.to(socketId).emit(ACTIONS.JOINED, {
            clients,
            username,
            socketId: socket.id,
          });
        });
      });

      socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
      });

      socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
      });

      socket.on("disconnecting", () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
          socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
            socketId: socket.id,
            username: userSocketMap[socket.id],
          });
        });
        delete userSocketMap[socket.id];
        socket.leave();
      });
    });

    return new Response(null, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
  
  return new Response('Method not allowed', { status: 405 });
}