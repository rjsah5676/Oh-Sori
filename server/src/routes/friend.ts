import express, { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Friend from "../models/Friend";
import FriendRequest from "../models/FriendRequest";
import { getIO, userSocketMap } from "../socket";
import { getUserStatus } from "../services/statusService";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

function getUserFromToken(req: any) {
  const token = req.headers.cookie
    ?.split(";")
    .find((c: string) => c.trim().startsWith("accessToken="))
    ?.split("=")[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as { email: string; nickname: string };
  } catch {
    return null;
  }
}

interface FriendAddRequestBody {
  nickname: string;
  tag: string;
}

const handleFriendAdd = async (
  req: Request<{}, {}, FriendAddRequestBody>,
  res: Response
) => {
  const authUser = getUserFromToken(req);
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });

  const { nickname, tag } = req.body;
  if (!nickname || !tag) {
    return res.status(400).json({ message: "닉네임과 태그가 필요합니다." });
  }

  try {
    const fromUser = await User.findOne({ email: authUser.email });
    const toUser = await User.findOne({ nickname, tag });

    if (!toUser) {
      return res.status(404).json({ message: "해당 유저를 찾을 수 없습니다." });
    }

    if (fromUser._id.equals(toUser._id)) {
      return res
        .status(400)
        .json({ message: "자기 자신에게는 친구 요청을 보낼 수 없습니다." });
    }

    const exists = await FriendRequest.findOne({
      from: fromUser._id,
      to: toUser._id,
      status: "pending",
    });
    if (exists) {
      return res.status(400).json({ message: "이미 친구 요청을 보냈습니다." });
    }

    const reverseExists = await FriendRequest.findOne({
      from: toUser._id,
      to: fromUser._id,
      status: "pending",
    });
    if (reverseExists) {
      return res
        .status(400)
        .json({ message: "상대방이 이미 친구 요청을 보냈습니다." });
    }

    await FriendRequest.create({ from: fromUser._id, to: toUser._id });

    const io = getIO();
    const toSocketId = userSocketMap.get(toUser.email);
    if (toSocketId) {
      io.to(toSocketId).emit("friendRequestReceived", {
        from: {
          nickname: fromUser.nickname,
          tag: fromUser.tag,
          email: fromUser.email,
          profileImage: fromUser.profileImage,
          color: fromUser.color,
        },
      });
      console.log("✅ emit 완료:", toSocketId);
    } else {
      console.warn("❌ 유저 소켓 ID 없음:", toUser.email);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("친구 요청 실패:", err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

const handlePendingCount = async (req: Request, res: Response) => {
  const authUser = getUserFromToken(req);
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await User.findOne({ email: authUser.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const count = await FriendRequest.countDocuments({
      to: user._id,
      status: "pending",
    });

    return res.json({ count });
  } catch (err) {
    console.error("알림 수 조회 실패:", err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

const handlePendingList = async (req: Request, res: Response) => {
  const authUser = getUserFromToken(req);
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await User.findOne({ email: authUser.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const requests = await FriendRequest.find({
      to: user._id,
      status: "pending",
    }).populate("from", "nickname tag email profileImage color");

    const formatted = requests.map((req) => ({
      nickname: req.from.nickname,
      tag: req.from.tag,
      email: req.from.email,
      profileImage: req.from.profileImage,
      color: req.from.color,
    }));

    return res.json({ list: formatted });
  } catch (err) {
    console.error("친구 요청 목록 조회 실패:", err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

const handleAcceptFriend = async (req: Request, res: Response) => {
  const authUser = getUserFromToken(req);
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });

  const { fromEmail } = req.body; // 수락 대상자

  try {
    const toUser = await User.findOne({ email: authUser.email });
    const fromUser = await User.findOne({ email: fromEmail });

    if (!fromUser || !toUser)
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });

    const request = await FriendRequest.findOne({
      from: fromUser._id,
      to: toUser._id,
      status: "pending",
    });

    if (!request)
      return res
        .status(404)
        .json({ message: "친구 요청이 존재하지 않습니다." });

    // 상태 변경
    request.status = "accepted";
    await request.save();

    // Friend 생성 (중복 방지)
    const [id1, id2] = [fromUser._id.toString(), toUser._id.toString()].sort();
    const exists = await Friend.findOne({ user1: id1, user2: id2 });
    if (!exists) {
      await Friend.create({ user1: id1, user2: id2 });
    }

    const io = getIO();
    const toSocketId = userSocketMap.get(fromUser.email);
    if (toSocketId) {
      io.to(toSocketId).emit("friendListUpdated");
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("친구 수락 실패:", err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

const handleRejectFriend = async (req: Request, res: Response) => {
  const authUser = getUserFromToken(req);
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });

  const { fromEmail } = req.body;

  try {
    const toUser = await User.findOne({ email: authUser.email });
    const fromUser = await User.findOne({ email: fromEmail });

    if (!fromUser || !toUser)
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });

    const request = await FriendRequest.findOne({
      from: fromUser._id,
      to: toUser._id,
      status: "pending",
    });

    if (!request) return res.status(404).json({ message: "요청 없음" });

    request.status = "rejected";
    await request.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("친구 요청 거절 실패:", err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

const handleFriendList = async (req: Request, res: Response) => {
  const authUser = getUserFromToken(req);
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });

  try {
    const me = await User.findOne({ email: authUser.email });
    if (!me) return res.status(404).json({ message: "User not found" });

    const friends = await Friend.find({
      $or: [{ user1: me._id }, { user2: me._id }],
    })
      .populate("user1", "nickname tag email profileImage color")
      .populate("user2", "nickname tag email profileImage color");

    const result = friends.map((f) => {
      const friend = f.user1._id.equals(me._id) ? f.user2 : f.user1;
      return {
        nickname: friend.nickname,
        tag: friend.tag,
        email: friend.email,
        profileImage: friend.profileImage,
        color: friend.color,
      };
    });

    return res.json({ friends: result });
  } catch (err) {
    console.error("친구 목록 조회 실패:", err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

const handleDeleteFriend = async (req: Request, res: Response) => {
  const authUser = getUserFromToken(req);
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });

  const { email } = req.body;
  if (!email)
    return res
      .status(400)
      .json({ message: "삭제할 친구의 이메일이 필요합니다." });

  try {
    const me = await User.findOne({ email: authUser.email });
    const target = await User.findOne({ email });

    if (!me || !target)
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });

    const [id1, id2] = [me._id.toString(), target._id.toString()].sort();

    const deleted = await Friend.findOneAndDelete({
      user1: id1,
      user2: id2,
    });

    if (!deleted)
      return res.status(404).json({ message: "친구 관계가 없습니다." });

    const io = getIO();
    const toSocketId = userSocketMap.get(target.email);
    if (toSocketId) {
      io.to(toSocketId).emit("friendListUpdated");
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("친구 삭제 실패:", err);
    return res.status(500).json({ message: "서버 에러" });
  }
};

const statusBulkHandler = async (
  req: Request<{}, {}, { emails: string[] }>,
  res: Response
) => {
  const { emails } = req.body;

  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ message: "emails 배열이 필요합니다." });
  }

  try {
    const results: Record<string, "online" | "offline" | "away" | "dnd"> = {};

    for (const email of emails) {
      const status = await getUserStatus(email);
      results[email] = status;
    }

    return res.status(200).json({ statuses: results });
  } catch (err) {
    console.error("상태 일괄 조회 실패:", err);
    return res.status(500).json({ message: "상태 조회 실패" });
  }
};

router.post("/add", handleFriendAdd as unknown as express.RequestHandler);

router.get(
  "/pending-count",
  handlePendingCount as unknown as express.RequestHandler
);

router.get(
  "/pending-list",
  handlePendingList as unknown as express.RequestHandler
);

router.post("/accept", handleAcceptFriend as unknown as express.RequestHandler);

router.post("/reject", handleRejectFriend as unknown as express.RequestHandler);

router.get("/list", handleFriendList as unknown as express.RequestHandler);

router.post("/delete", handleDeleteFriend as unknown as express.RequestHandler);

router.post(
  "/status-bulk",
  statusBulkHandler as unknown as express.RequestHandler
);

export default router;
