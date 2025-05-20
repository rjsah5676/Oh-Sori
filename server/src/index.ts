import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true, 
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Express with zzz");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

