import express, { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import FriendRequest from '../models/FriendRequest';
import { getIO, userSocketMap } from '../socket';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

function getUserFromToken(req: any) {
  const token = req.headers.cookie?.split(';').find((c: string) => c.trim().startsWith('accessToken='))?.split('=')[1];
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
  if (!authUser) return res.status(401).json({ message: 'Unauthorized' });

  const { nickname, tag } = req.body;
  if (!nickname || !tag) {
    return res.status(400).json({ message: '닉네임과 태그가 필요합니다.' });
  }

  try {
    const fromUser = await User.findOne({ email: authUser.email });
    const toUser = await User.findOne({ nickname, tag });

    if (!toUser) {
      return res.status(404).json({ message: '해당 유저를 찾을 수 없습니다.' });
    }

    if (fromUser._id.equals(toUser._id)) {
      return res.status(400).json({ message: '자기 자신에게는 친구 요청을 보낼 수 없습니다.' });
    }

    const exists = await FriendRequest.findOne({ from: fromUser._id, to: toUser._id, status: 'pending' });
    if (exists) {
      return res.status(400).json({ message: '이미 친구 요청을 보냈습니다.' });
    }

    const reverseExists = await FriendRequest.findOne({
    from: toUser._id,
    to: fromUser._id,
    status: 'pending',
    });
    if (reverseExists) {
    return res.status(400).json({ message: '상대방이 이미 친구 요청을 보냈습니다.' });
    }

    await FriendRequest.create({ from: fromUser._id, to: toUser._id });

    const io = getIO();
    const toSocketId = userSocketMap.get(toUser.email);
    if (toSocketId) {
    io.to(toSocketId).emit('friendRequestReceived', {
        from: {
        nickname: fromUser.nickname,
        tag: fromUser.tag,
        email: fromUser.email,
        profileImage: fromUser.profileImage,
        },
    });
    console.log('✅ emit 완료:', toSocketId);
    }
    else {
    console.warn('❌ 유저 소켓 ID 없음:', toUser.email);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('친구 요청 실패:', err);
    return res.status(500).json({ message: '서버 에러' });
  }
};

const handlePendingCount = async (
  req: Request,
  res: Response
) => {
  const authUser = getUserFromToken(req);
  if (!authUser) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findOne({ email: authUser.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const count = await FriendRequest.countDocuments({
      to: user._id,
      status: 'pending',
    });

    return res.json({ count });
  } catch (err) {
    console.error('알림 수 조회 실패:', err);
    return res.status(500).json({ message: '서버 에러' });
  }
};

// POST /api/friends/add
router.post('/add', handleFriendAdd as unknown as express.RequestHandler);

router.get('/pending-count', handlePendingCount as unknown as express.RequestHandler);


export default router;
