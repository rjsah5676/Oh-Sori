import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI!;

// CORS 설정
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

// ✅ 모든 라우트를 /api 하위로 통일
import authRouter from "./routes/auth";
app.use("/api/auth", authRouter);

app.get("/api", (req, res) => {
  res.json({ message: "Hello from /api" });
});

// ✅ MongoDB 연결 후 서버 시작
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB 연결 성공");
    app.listen(PORT, () => {
      console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB 연결 실패:", err);
  });
