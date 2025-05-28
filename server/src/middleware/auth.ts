import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

// 타입 확장
declare module 'express' {
  interface Request {
    user?: { email: string; nickname: string };
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.accessToken;

  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string; nickname: string };
    req.user = decoded; // ✅ 여기서 req.user 설정
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};