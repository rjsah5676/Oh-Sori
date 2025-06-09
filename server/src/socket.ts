import { Server } from "socket.io";
import dotenv from "dotenv";
import { setUserStatus, getUserStatus } from "./services/statusService";

import DMMessage from "./models/DMMessage";
import DMRoom from "./models/DMRoom";
import mongoose from "mongoose";

import {
  startCallSession,
  endCallForUser,
  getCallSession,
  acceptCall,
  reconnCall,
  getCallRoomKey,
  isUserInCall,
} from "./services/callService";

import redis from "./utils/redis";

dotenv.config();

let ioInstance: Server | null = null;

// 이메일 → 소켓 ID
export const userSocketMap = new Map<string, string>();
// 소켓 ID → 이메일 (역매핑)
const socketToEmail = new Map<string, string>();
const roomTimeouts = new Map<string, NodeJS.Timeout>();

function start3MinTimeout(roomId: string, caller: string, callee: string) {
  if (roomTimeouts.has(roomId)) return; // 중복 방지

  const timeout = setTimeout(async () => {
    const session = await getCallSession(roomId);
    if (!session) return;

    const callerEnded = session.callerEnded === "true";
    const calleeEnded = session.calleeEnded === "true";
    if (callerEnded && calleeEnded) return; // 이미 둘 다 종료 상태면 skip

    console.log(`⏰ 3분 경과 - ${roomId} 방 제거`);
    await redis.del(getCallRoomKey(roomId));
    roomTimeouts.delete(roomId);

    const callerSocket = userSocketMap.get(caller);
    const calleeSocket = userSocketMap.get(callee);

    if (callerSocket) ioInstance?.to(callerSocket).emit("call:clear");
    if (calleeSocket) ioInstance?.to(calleeSocket).emit("call:clear");
  }, 180_000);

  roomTimeouts.set(roomId, timeout);
}

function clearTimeoutForRoom(roomId: string) {
  const timeout = roomTimeouts.get(roomId);
  if (timeout) {
    clearTimeout(timeout);
    roomTimeouts.delete(roomId);
  }
}

const handleCallCleanup = async (email: string) => {
  const keys = await redis.keys("call_room:*");

  for (const key of keys) {
    const session = await redis.hgetall(key);
    if (!session) continue;

    const { caller, callee, callerEnded, calleeEnded } = session;
    const roomId = key.replace("call_room:", "");

    if (caller === email || callee === email) {
      await endCallForUser(roomId, email);

      const peerEmail = caller === email ? callee : caller;
      const peerSocketId = userSocketMap.get(peerEmail);

      if (peerSocketId) {
        ioInstance?.to(peerSocketId).emit("call:end");
        console.log(`📴 통화 종료 알림 (본인만 종료): ${email} → ${peerEmail}`);
      }

      // 🔥 타이머 돌리기 (이미 종료 안 됐을 때만)
      const oneEnded = callerEnded === "true" || calleeEnded === "true";
      const bothEnded = callerEnded === "true" && calleeEnded === "true";

      if (!bothEnded && oneEnded) {
        start3MinTimeout(roomId, caller, callee);
      }

      break;
    }
  }
};

export const initSocket = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 소켓 연결됨:", socket.id);

    socket.on("register", async (email: string) => {
      userSocketMap.set(email, socket.id);
      socketToEmail.set(socket.id, email);

      console.log(`✅ 사용자 등록됨: ${email} → ${socket.id}`);
      await setUserStatus(email, "online");

      const keys = await redis.keys("call_room:*");
      console.log("🧪 현재 Redis 통화 키 수:", keys.length);

      for (const key of keys) {
        const session = await redis.hgetall(key);
        if (!session || !session.startedAt) continue;

        const { caller, callee, callerEnded, calleeEnded } = session;
        const roomId = key.replace("call_room:", "");

        if (caller !== email && callee !== email) continue;

        const isCaller = caller === email;
        const target = isCaller ? callee : caller;

        const mySocketId = socket.id;
        const targetSocketId = userSocketMap.get(target);

        const payload = {
          roomId,
          isCaller,
          target,
          resumedBy: email, // ✅ 누가 새로고침했는지 식별용
          startedAt: Number(session.startedAt),
          callerEnded: callerEnded === "true",
          calleeEnded: calleeEnded === "true",
        };

        // ✅ 나한테도 보내고
        io.to(mySocketId).emit("call:resume-success", payload);

        // ✅ 상대방에게도 같은 payload 보내기
        if (targetSocketId) {
          io.to(targetSocketId).emit("call:resume-success", payload);
        }

        console.log(`📞 resume-success → ${email} + ${target}`);
      }

      const currentStatus = await getUserStatus(email);
      io.emit("status-update", { email, status: currentStatus });
      socket.emit("registered");
    });

    socket.on("joinRoom", (roomId: string) => {
      socket.join(roomId);
      console.log(`🟡 ${socket.id} 방 입장: ${roomId}`);
    });

    socket.on("leaveRoom", (roomId: string) => {
      socket.leave(roomId);
      console.log(`⚪ ${socket.id} 방 퇴장: ${roomId}`);
    });

    socket.on("sendMessage", async (payload) => {
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
          io.to(receiverSocketId).emit("receiveMessage", message);
        }

        if (senderSocketId) {
          io.to(senderSocketId).emit("receiveMessage", message);
        }
      } catch (err) {
        console.error("❌ 메시지 저장 실패:", err);
      }
    });

    socket.on("markAsRead", async ({ roomId, email }) => {
      await DMMessage.updateMany(
        { roomId, isReadBy: { $ne: email } },
        { $push: { isReadBy: email } }
      );
    });

    socket.on("deleteMessage", async ({ messageId, email }) => {
      await DMMessage.findByIdAndUpdate(messageId, {
        $addToSet: { deletedBy: email },
      });
    });

    // ✅ 본인 DM 리스트 갱신 요청 시
    socket.on("refreshDmList", () => {
      const email = socketToEmail.get(socket.id);
      if (!email) return;

      const socketId = userSocketMap.get(email);
      if (socketId) {
        io.to(socketId).emit("refreshDmList");
      }
    });

    socket.on(
      "call:request",
      async ({ to, roomId, from, nickname, tag, profileImage, color }) => {
        const receiverSocketId = userSocketMap.get(to);
        const callerSocketId = userSocketMap.get(from);

        // 🔍 from이 포함된 모든 통화방 강제 종료
        const keys = await redis.keys("call_room:*");

        for (const key of keys) {
          const session = await redis.hgetall(key);
          if (!session) continue;

          const { caller, callee, callerEnded, calleeEnded } = session;
          const sessionRoomId = key.replace("call_room:", "");

          const isCaller = caller === from;
          const isCallee = callee === from;

          if (isCaller || isCallee) {
            console.log(`☎️ 기존 통화(${sessionRoomId}) 종료 중: ${from}`);

            await endCallForUser(sessionRoomId, from);
            await endCallForUser(sessionRoomId, to);

            const peerEmail = isCaller ? callee : caller;
            const peerSocket = userSocketMap.get(peerEmail);
            if (peerSocket) {
              io.to(peerSocket).emit("call:re-clear");
            }

            if (callerSocketId) {
              io.to(callerSocketId).emit("call:re-call");
            }

            clearTimeoutForRoom(sessionRoomId);
            await redis.del(key);
          }
        }

        // 🔒 상대방이 통화 중이면 새 통화 차단
        const isBusy = await isUserInCall(to);
        if (isBusy) {
          if (callerSocketId) {
            io.to(callerSocketId).emit("call:busy");
          }
          console.log(`🚫 통화 차단: ${to}는 현재 통화 중`);
          return;
        }

        await startCallSession(roomId, from, to, false, true);
        start3MinTimeout(roomId, from, to);

        if (receiverSocketId) {
          io.to(receiverSocketId).emit("call:incoming", {
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
      }
    );

    socket.on("call:accept", ({ to, roomId }) => {
      const callerSocketId = userSocketMap.get(to);
      clearTimeoutForRoom(roomId);
      if (callerSocketId) {
        io.to(callerSocketId).emit("call:peer-connected");
      }
      socket.emit("call:peer-connected");
      acceptCall(roomId);
      console.log(`✅ 통화 수락됨: ${to}와 연결됨`);
    });

    socket.on("call:end", async ({ roomId, to }) => {
      const from = socketToEmail.get(socket.id);
      if (!from) return;

      await endCallForUser(roomId, from);

      const session = await getCallSession(roomId);
      console.log(session);
      if (session) {
        const { caller, callee, callerEnded, calleeEnded } = session;

        if (callerEnded === "true" && calleeEnded === "true") {
          clearTimeoutForRoom(roomId); // 완전 종료
        } else if (callerEnded === "true" || calleeEnded === "true") {
          start3MinTimeout(roomId, caller, callee); // 3분 타이머 시작
        }
      }

      const receiverSocketId = userSocketMap.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("call:end");
      }

      console.log(`📴 통화 종료됨: ${from} → ${to}`);
    });

    socket.on("call:resume", async ({ roomId }) => {
      const email = socketToEmail.get(socket.id);
      if (!email) return;

      const session = await getCallSession(roomId);
      if (!session) return;

      const isCaller = session.caller === email;

      socket.emit("call:resume-success", {
        roomId,
        isCaller,
        startedAt: Number(session.startedAt),
        callerEnded: session.callerEnded === "true",
        calleeEnded: session.calleeEnded === "true",
      });
    });

    socket.on("call:reconn", async ({ roomId, from }) => {
      const sess = await getCallSession(roomId);
      if (!sess) return;

      const isCaller = sess.caller === from;

      const session = await reconnCall(roomId, isCaller);

      if (!session) return;
      clearTimeoutForRoom(roomId);
      socket.emit("call:reconn-success", {
        roomId,
        isCaller,
        rejoiner: from, // ✅ 추가!
        startedAt: Number(session.startedAt),
        callerEnded: session.callerEnded === "true",
        calleeEnded: session.calleeEnded === "true",
      });

      const peerEmail = isCaller ? session.callee : session.caller;
      const peerSocketId = userSocketMap.get(peerEmail);

      if (peerSocketId) {
        io.to(peerSocketId).emit("call:reconn-success", {
          roomId,
          isCaller: !isCaller,
          rejoiner: from, // ✅ 추가!
          startedAt: Number(session.startedAt),
          callerEnded: session.callerEnded === "true",
          calleeEnded: session.calleeEnded === "true",
        });
      }
    });

    socket.on("call:clear", async ({ roomId, to }) => {
      const from = socketToEmail.get(socket.id);
      if (!from) return;

      await redis.del(`call_room:${roomId}`);
      console.log(`🧹 call_room 삭제됨: ${roomId} by ${from}`);

      const receiverSocketId = userSocketMap.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("call:clear");
        console.log(`📴 통화 거절 알림 전송: ${from} → ${to}`);
      }
    });

    socket.on("webrtc:offer", ({ to, offer }) => {
      const receiverSocketId = userSocketMap.get(to);
      console.log("offer id:", receiverSocketId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("webrtc:offer", {
          from: socketToEmail.get(socket.id),
          offer,
        });
      }
    });

    socket.on("webrtc:answer", ({ to, answer }) => {
      const callerSocketId = userSocketMap.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit("webrtc:answer", {
          from: socketToEmail.get(socket.id), // ✅ 추가
          answer,
        });
      }
    });

    socket.on("webrtc:ice-candidate", ({ to, candidate }) => {
      const peerSocketId = userSocketMap.get(to);
      console.log("ice id:", peerSocketId);
      if (peerSocketId) {
        io.to(peerSocketId).emit("webrtc:ice-candidate", {
          from: socketToEmail.get(socket.id), // ✅ 추가
          candidate,
        });
      }
    });

    socket.on("voice:sync", ({ roomId, to }) => {
      const targetSocketId = userSocketMap.get(to);
      if (!targetSocketId) return;
      const from = socketToEmail.get(socket.id);
      if (!from) return;

      io.to(targetSocketId).emit("voice:sync", {
        roomId,
        to: from,
      });
    });
    socket.on("voice:active", ({ roomId, email }) => {
      socket.to(roomId).emit("voice:active", { email });
    });

    // 마이크 감지 - 비활성화
    socket.on("voice:inactive", ({ roomId, email }) => {
      socket.to(roomId).emit("voice:inactive", { email });
    });

    socket.on("logout", async (email: string) => {
      const existingSocketId = userSocketMap.get(email);

      if (existingSocketId === socket.id) {
        await handleCallCleanup(email); //통화 종료

        userSocketMap.delete(email);
        socketToEmail.delete(socket.id);

        await setUserStatus(email, "offline");

        const currentStatus = await getUserStatus(email);
        io.emit("status-update", { email, status: currentStatus });

        console.log(`🟥 로그아웃 처리됨: ${email}`);
      }
    });

    socket.on("disconnect", async () => {
      console.log("🔴 소켓 해제됨:", socket.id);
      const email = socketToEmail.get(socket.id);

      setTimeout(async () => {
        const currentSocketId = userSocketMap.get(email!);
        const isSameSocket = currentSocketId === socket.id;

        if (isSameSocket) {
          if (email) {
            await handleCallCleanup(email);
            userSocketMap.delete(email);
            socketToEmail.delete(socket.id);

            await setUserStatus(email, "offline");

            const currentStatus = await getUserStatus(email);
            io.emit("status-update", { email, status: currentStatus });

            console.log(`🟥 오프라인 처리 완료: ${email}`);
          }
        } else {
          console.log(`🔁 ${email} 새로고침 감지됨`);
        }
      }, 3000);
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
};
