import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🟢 소켓 연결됨:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('🔴 소켓 연결 해제됨..');
    });
  }

  return socket;
};
