import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setUserStatus, getUserStatus } from './services/statusService';

import DMMessage from './models/DMMessage';
import DMRoom from './models/DMRoom';
import mongoose from 'mongoose';

dotenv.config();

let ioInstance: Server | null = null;

// 이메일 → 소켓 ID
export const userSocketMap = new Map<string, string>();
// 소켓 ID → 이메일 (역매핑)
const socketToEmail = new Map<string, string>();

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
      socketToEmail.set(socket.id, email);

      console.log(`✅ 사용자 등록됨: ${email} → ${socket.id}`);
      await setUserStatus(email, 'online');

      const currentStatus = await getUserStatus(email);
      io.emit('status-update', { email, status: currentStatus });
    });

    socket.on('joinRoom', (roomId: string) => {
      socket.join(roomId);
      console.log(`🟡 ${socket.id} 방 입장: ${roomId}`);
    });

    socket.on('leaveRoom', (roomId: string) => {
      socket.leave(roomId);
      console.log(`⚪ ${socket.id} 방 퇴장: ${roomId}`);
    });

    socket.on('sendMessage', async (payload) => {
      const { roomId, sender, content, attachments = [] } = payload;

      if (!roomId || !sender) return;

      try {
        const message = await DMMessage.create({
          roomId: new mongoose.Types.ObjectId(roomId),
          sender,
          content,
          attachments,
          isReadBy: [sender],
        });

        const room = await DMRoom.findById(roomId);
        if (!room) return;

        const receiver = room.participants.find((p: string) => p !== sender);
        if (!receiver) return;

        const receiverSocketId = userSocketMap.get(receiver);
        const senderSocketId = userSocketMap.get(sender);

        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receiveMessage', message);
        }

        if (senderSocketId) {
          io.to(senderSocketId).emit('receiveMessage', message);
        }
      } catch (err) {
        console.error('❌ 메시지 저장 실패:', err);
      }
    });

    socket.on('markAsRead', async ({ roomId, email }) => {
      await DMMessage.updateMany(
        { roomId, isReadBy: { $ne: email } },
        { $push: { isReadBy: email } }
      );
    });

    socket.on('deleteMessage', async ({ messageId, email }) => {
      await DMMessage.findByIdAndUpdate(messageId, {
        $addToSet: { deletedBy: email },
      });
    });

    // ✅ 본인 DM 리스트 갱신 요청 시
    socket.on('refreshDmList', () => {
      const email = socketToEmail.get(socket.id);
      if (!email) return;

      const socketId = userSocketMap.get(email);
      if (socketId) {
        io.to(socketId).emit('refreshDmList');
      }
    });

    socket.on('logout', async (email: string) => {
      const existingSocketId = userSocketMap.get(email);

      if (existingSocketId === socket.id) {
        userSocketMap.delete(email);
        socketToEmail.delete(socket.id);

        await setUserStatus(email, 'offline');

        const currentStatus = await getUserStatus(email);
        io.emit('status-update', { email, status: currentStatus });

        console.log(`🟥 로그아웃 처리됨: ${email}`);
      }
    });

    socket.on('disconnect', async () => {
      console.log('🔴 소켓 해제됨:', socket.id);

      const email = socketToEmail.get(socket.id);
      if (email) {
        userSocketMap.delete(email);
        socketToEmail.delete(socket.id);

        await setUserStatus(email, 'offline');

        const currentStatus = await getUserStatus(email);
        io.emit('status-update', { email, status: currentStatus });
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
