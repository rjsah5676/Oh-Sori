import express, { Request, Response } from 'express';
import DMRoom from '../models/DMRoom';
import DMMessage from '../models/DMMessage';
import { getUserFromToken } from '../utils/auth';

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

router.get('/check-or-create', checkOrCreateDMRoomHandler as unknown as express.RequestHandler);
router.get('/messages', getMessagesHandler as any);

export default router;