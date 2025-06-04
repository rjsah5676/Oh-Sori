// index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { initSocket } from "./socket";
import http from "http";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI!;

const server = http.createServer(app);

// 소켓 서버 초기화 (이벤트는 socket.ts에서 관리)
initSocket(server);

// CORS 설정
app.use(
  cors({
    origin: process.env.SOCKET_CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/uploads/dms", express.static(path.join(__dirname, "../uploads/dms")));

// 라우트 등록
import authRouter from "./routes/auth";
app.use("/api/auth", authRouter);

import friendsRouter from "./routes/friend";
app.use("/api/friends", friendsRouter);

import dmRouter from "./routes/dm";
app.use("/api/dms", dmRouter);

import userRouter from "./routes/users";
app.use("/api/users", userRouter);

app.get("/api", (req, res) => {
  res.json({ message: "Hello from /api" });
});

// MongoDB 연결 후 서버 시작
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB 연결 성공");
    server.listen(PORT, () => {
      console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB 연결 실패:", err);
  });
