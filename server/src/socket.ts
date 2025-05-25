import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setUserStatus, getUserStatus } from './services/statusService';

dotenv.config();

let ioInstance: Server | null = null;

// 이메일 → socket.id 매핑
export const userSocketMap = new Map<string, string>();

export const initSocket = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('🟢 소켓 연결됨:', socket.id);

    socket.on('register', async (email: string) => {
      userSocketMap.set(email, socket.id);
      console.log(`✅ 사용자 등록됨: ${email} → ${socket.id}`);
      await setUserStatus(email, 'online');

      const currentStatus = await getUserStatus(email);
      io.emit('status-update', { email, status: currentStatus });
    });

    socket.on('disconnect', async () => {
      console.log('🔴 소켓 해제됨:', socket.id);
      for (const [email, id] of userSocketMap.entries()) {
        if (id === socket.id) {
          userSocketMap.delete(email);
          await setUserStatus(email, 'offline');

          const currentStatus = await getUserStatus(email);
          io.emit('status-update', { email, status: currentStatus });
        }
      }
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
};
