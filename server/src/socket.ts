import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setUserStatus, getUserStatus } from './services/statusService';

import DMMessage from './models/DMMessage';
import DMRoom from './models/DMRoom';
import mongoose from 'mongoose';

import { startCallSession, endCallForUser, getCallSession, acceptCall, reconnCall } from './services/callService';

import redis from './utils/redis';

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
      
      const keys = await redis.keys('call_room:*');
      console.log('🧪 현재 Redis 통화 키 수:', keys.length);
        for (const key of keys) {
          const session = await redis.hgetall(key);
          if (!session || !session.startedAt) continue;
          const { caller, callee, callerEnded, calleeEnded } = session;
          const roomId = key.replace('call_room:', '');

          const isParticipant = caller === email || callee === email;
          if (isParticipant) {
            const isCaller = caller === email;
            socket.emit('call:resume-success', {
              roomId,
              isCaller,
              startedAt: Number(session.startedAt),
              callerEnded: callerEnded === 'true',
              calleeEnded: calleeEnded === 'true',
            });
            console.log(`📞 [register] 통화 세션 복구됨 → ${email} (${roomId})`);
          }
        }

      const currentStatus = await getUserStatus(email);
      io.emit('status-update', { email, status: currentStatus });
      socket.emit('registered');
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

    socket.on('call:request', async ({ to, roomId, from, nickname, tag, profileImage, color }) => {
    const receiverSocketId = userSocketMap.get(to);

    // 🔹 Redis에 통화 상태 저장
    await startCallSession(roomId, from, to, false, true);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call:incoming', {
        from,
        roomId,
        nickname,
        tag,
        profileImage,
        color,
      });
      console.log(`📞 ${from} → ${to} 통화 요청`);
    } else {
      console.log(`❌ 수신자 ${to} 소켓 없음`);
    }
  });

    socket.on('call:accept', ({ to, roomId }) => {
      const callerSocketId = userSocketMap.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call:peer-connected');
      }
      socket.emit('call:peer-connected');
      acceptCall(roomId);
      console.log(`✅ 통화 수락됨: ${to}와 연결됨`);
    });

    socket.on('call:end', async ({ roomId, to }) => {
      const from = socketToEmail.get(socket.id);
      if (!from) return;

      await endCallForUser(roomId, from); // 🔹 Redis에서 본인 종료 처리

      const receiverSocketId = userSocketMap.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call:end');
      }

      console.log(`📴 통화 종료됨: ${from} → ${to}`);
    });
    
    socket.on('call:resume', async ({ roomId }) => {
      const email = socketToEmail.get(socket.id);
      if (!email) return;

      const session = await getCallSession(roomId);
      if (!session) return;

      const isCaller = session.caller === email;

      socket.emit('call:resume-success', {
        roomId,
        isCaller,
        startedAt: Number(session.startedAt),
        callerEnded: session.callerEnded === 'true',
        calleeEnded: session.calleeEnded === 'true',
      });
    });

    socket.on('call:reconn', async ({ roomId, from }) => {
      const sess = await getCallSession(roomId);
      if (!sess) return;

      const isCaller = sess.caller === from;

      const session = await reconnCall(roomId, isCaller);

      if(!session) return;

      socket.emit('call:reconn-success', {
        roomId,
        isCaller,
        startedAt: Number(session.startedAt),
        callerEnded: session.callerEnded === 'true',
        calleeEnded: session.calleeEnded === 'true',
      });

      const peerEmail = isCaller ? session.callee : session.caller;
      const peerSocketId = userSocketMap.get(peerEmail);

      if (peerSocketId) {
        io.to(peerSocketId).emit('call:reconn-success', {
          roomId,
          isCaller: !isCaller,
          startedAt: Number(session.startedAt),
          callerEnded: session.callerEnded === 'true',
          calleeEnded: session.calleeEnded === 'true',
        });
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
