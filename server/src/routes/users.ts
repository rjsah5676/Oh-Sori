import express, { Request, Response } from 'express';
import User from '../models/User';
import { getUserStatus } from '../services/statusService';

const router = express.Router();

const getDMUserInfoHandler = async (
  req: Request<{}, {}, {}, { email: string }>,
  res: Response
) => {
  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: '이메일이 필요합니다.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const status = await getUserStatus(email);

    return res.status(200).json({
      nickname: user.nickname,
      tag: user.tag,
      profileImage: user.profileImage,
      color: user.color || '#ccc',
      userStatus: status,
    });
  } catch (err) {
    console.error('DM 유저 정보 조회 실패:', err);
    return res.status(500).json({ message: '서버 오류' });
  }
};

router.get('/user-info', getDMUserInfoHandler as unknown as express.RequestHandler);

export default router;