import express, { Request, Response } from 'express';
import DMRoom from '../models/DMRoom';
import DMMessage from '../models/DMMessage';
import { getUserFromToken } from '../utils/auth';
import { authenticate } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

const checkOrCreateDMRoomHandler = async (
  req: Request<{}, {}, {}, { target: string }>,
  res: Response
) => {
  const authUser = getUserFromToken(req);
  if (!authUser) return res.status(401).json({ message: '인증 실패' });

  const { target } = req.query;

  if (!target || typeof target !== 'string') {
    return res.status(400).json({ message: '대상 누락' });
  }

  try {
    let room = await DMRoom.findOne({
      participants: { $all: [authUser.email, target] },
    });

    if (!room) {
      room = await DMRoom.create({
        participants: [authUser.email, target],
      });
    }

    return res.status(200).json({ roomId: room._id });
  } catch (err) {
    console.error('채팅방 생성 오류:', err);
    return res.status(500).json({ message: '서버 오류' });
  }
};


const getMessagesHandler = async (
  req: Request<{}, {}, {}, { target: string }>,
  res: Response
) => {
  const authUser = getUserFromToken(req);
  if (!authUser) return res.status(401).json({ message: '인증 실패' });

  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ message: '대상 누락' });
  }

  try {
    const room = await DMRoom.findOne({
      participants: { $all: [authUser.email, target] },
    });

    if (!room) return res.status(404).json({ message: '채팅방 없음' });

    const messages = await DMMessage.find({
      roomId: room._id,
      deletedBy: { $ne: authUser.email },
    })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({ messages });
  } catch (err) {
    console.error('메시지 불러오기 실패:', err);
    return res.status(500).json({ message: '서버 오류' });
  }
};

interface LeanUser {
  email: string;
  nickname: string;
  tag: string;
  profileImage?: string;
  color?: string;
}

interface LeanDMMessage {
  content: string;
  createdAt: Date;
}

const getDMListHandler = async (req: Request, res: Response) => {
  const authUser = getUserFromToken(req);
  if (!authUser) return res.status(401).json({ message: '인증되지 않음' });

  try {
    const myEmail = authUser.email;
    const rooms = await DMRoom.find({ participants: myEmail }).lean();

    const result = await Promise.all(
      rooms.map(async (room) => {
        const opponentEmail = room.participants.find((email: string) => email !== myEmail);
        const opponent = await User.findOne({ email: opponentEmail }).lean<LeanUser>();

        const lastMessage = await DMMessage.findOne({ roomId: room._id })
          .sort({ createdAt: -1 })
          .lean<LeanDMMessage>();

        const unreadCount = await DMMessage.countDocuments({
          roomId: room._id,
          sender: { $ne: myEmail },
          isReadBy: { $ne: myEmail },
        });

        return {
          roomId: room._id,
          opponent: {
            email: opponent?.email,
            nickname: opponent?.nickname,
            tag: opponent?.tag,
            profileImage: opponent?.profileImage,
            color: opponent?.color,
          },
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount,
        };
      })
    );

    // 최신 메시지 기준 정렬
    result.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return res.status(200).json({ rooms: result });
  } catch (err) {
    console.error('DM 리스트 불러오기 실패:', err);
    return res.status(500).json({ message: 'DM 리스트 조회 실패' });
  }
};

const dmReadHandler = async (req: Request, res: Response) =>  {
  const authUser = getUserFromToken(req);
  if (!authUser) return res.status(401).json({ message: '인증 실패' });

  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ message: 'roomId 누락' });

  try {
    await DMMessage.updateMany(
      {
        roomId,
        sender: { $ne: authUser.email },
        isReadBy: { $ne: authUser.email },
      },
      {
        $push: { isReadBy: authUser.email },
      }
    );

    return res.status(200).json({ message: '읽음 처리 완료' });
  } catch (err) {
    console.error('읽음 처리 오류:', err);
    return res.status(500).json({ message: '서버 오류' });
  }
};


router.post('/read', dmReadHandler as any);
router.get('/list', getDMListHandler as any);
router.get('/check-or-create', checkOrCreateDMRoomHandler as unknown as express.RequestHandler);
router.get('/messages', getMessagesHandler as any);

export default router;