import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // 꼭 맨 위에서 실행

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Express with .env!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
