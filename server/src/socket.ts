import { Server } from 'socket.io';

let ioInstance: Server | null = null;

// 이메일 → socket.id 매핑
export const userSocketMap = new Map<string, string>();

export const initSocket = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('🟢 소켓 연결됨:', socket.id);

    socket.on('register', (email: string) => {
      userSocketMap.set(email, socket.id);
      console.log(`✅ 사용자 등록됨: ${email} → ${socket.id}`);
    });

    socket.on('disconnect', () => {
      console.log('🔴 소켓 해제됨:', socket.id);
      for (const [email, id] of userSocketMap.entries()) {
        if (id === socket.id) userSocketMap.delete(email);
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
