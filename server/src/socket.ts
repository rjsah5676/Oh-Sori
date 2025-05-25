import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setUserStatus, getUserStatus } from './services/statusService';

import DMMessage from './models/DMMessage';
import DMRoom from './models/DMRoom';
import mongoose from 'mongoose';

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

    // 1. 방 입장
    socket.on('joinRoom', (roomId: string) => {
      socket.join(roomId);
      console.log(`🟡 ${socket.id} 방 입장: ${roomId}`);
    });

    // 2. 방 퇴장
    socket.on('leaveRoom', (roomId: string) => {
      socket.leave(roomId);
      console.log(`⚪ ${socket.id} 방 퇴장: ${roomId}`);
    });

    socket.on('sendMessage', async (payload) => {
      const { roomId, sender, content, attachments = [] } = payload;

      if (!roomId || !sender) return;

      try {
        const message = await DMMessage.create({
          roomId: new mongoose.Types.ObjectId(roomId), // ✅ 명시적 변환
          sender,
          content,
          attachments,
          isReadBy: [sender],
        });

        io.to(roomId).emit('receiveMessage', message); // 참여자들에게 메시지 전송
      } catch (err) {
        console.error('❌ 메시지 저장 실패:', err);
      }
    });

    // 4. 읽음 처리
    socket.on('markAsRead', async ({ roomId, email }) => {
      await DMMessage.updateMany(
        { roomId, isReadBy: { $ne: email } },
        { $push: { isReadBy: email } }
      );
    });

    // 5. 삭제 요청 (soft delete)
    socket.on('deleteMessage', async ({ messageId, email }) => {
      await DMMessage.findByIdAndUpdate(messageId, {
        $addToSet: { deletedBy: email },
      });
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
