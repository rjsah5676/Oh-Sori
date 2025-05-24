import express, { Router, Request, Response, RequestHandler } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import User from '../models/User';
import { generateUniqueTag } from '../utils/generateTag';
import bcrypt from 'bcrypt';
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!;
const NAVER_REDIRECT_URI = process.env.NAVER_REDIRECT_URI!;
const JWT_SECRET = process.env.JWT_SECRET!;

// 1. 프론트 → 네이버 로그인 리디렉트
router.get('/naver', (req, res) => {
  const state = Math.random().toString(36).substring(2);
  const redirectUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(NAVER_REDIRECT_URI)}&state=${state}`;
  res.redirect(redirectUrl);
});

router.get('/naver/callback', async (req, res) => {
  const { code, state } = req.query;

  try {
    const tokenRes = await axios.get('https://nid.naver.com/oauth2.0/token', {
      params: {
        grant_type: 'authorization_code',
        client_id: NAVER_CLIENT_ID,
        client_secret: NAVER_CLIENT_SECRET,
        code,
        state,
      },
    });

    const accessToken = tokenRes.data.access_token;

    const profileRes = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profile = profileRes.data.response;
    const email = profile.email;
    const nickname = profile.nickname;
    const profileImage = profile.profile_image;
    let user = await User.findOne({ email });

    if (!user) {
      const tag = await generateUniqueTag(nickname);
      user = new User({
        email,
        nickname,
        tag,
        provider: 'naver',
        profileImage,
        createdAt: new Date(),
      });
      await user.save();
    }
    if (user && user.provider !== 'naver') {
      return res.redirect(`${process.env.SOCKET_CLIENT_ORIGIN}/oauth/duplicate?email=${encodeURIComponent(email)}&provider=${user.provider}`);
    }
    const payload = { email: user.email, nickname: user.nickname };
    const jwtToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    console.log('cookie is:', cookie);
    // 👉 여기서 HttpOnly 쿠키로 토큰 저장
    res.setHeader('Set-Cookie', cookie.serialize('accessToken', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7일
    }));

    // 유저 정보는 쓸 수 있게 쿼리로 전달
    res.redirect(`${process.env.SOCKET_CLIENT_ORIGIN}/oauth/success?email=${encodeURIComponent(email)}&nickname=${encodeURIComponent(user.nickname)}&tag=${user.tag}&profileImage=${encodeURIComponent(user.profileImage || '')}&color=${encodeURIComponent(user.color || '#ccc')}`);
  } catch (err: any) {
    console.error('Naver 로그인 실패:', err.response?.data || err.message);
    res.status(500).send('로그인 실패');
  }
});

// 1. 프론트 → 구글 로그인 리디렉트
router.get('/google', (req, res) => {
  const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI!)}&scope=openid%20email%20profile&access_type=offline`;
  res.redirect(redirectUrl);
});

// 2. 구글 → 콜백 처리
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      },
    });

    const accessToken = tokenRes.data.access_token;

    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { email, name: nickname, picture: profileImage } = profileRes.data;

    let user = await User.findOne({ email });
    if (!user) {
      const tag = await generateUniqueTag(nickname);
      user = new User({ email, nickname,tag, provider: 'google', profileImage, createdAt: new Date() });
      await user.save();
    }
    if (user && user.provider !== 'google') {
      return res.redirect(`${process.env.SOCKET_CLIENT_ORIGIN}/oauth/duplicate?email=${encodeURIComponent(email)}&provider=${user.provider}`);
    }

    const payload = { email: user.email, nickname: user.nickname };
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.setHeader('Set-Cookie', cookie.serialize('accessToken', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    }));

    res.redirect(`${process.env.SOCKET_CLIENT_ORIGIN}/oauth/success?email=${encodeURIComponent(email)}&nickname=${encodeURIComponent(user.nickname)}&tag=${user.tag}&profileImage=${encodeURIComponent(user.profileImage || '')}&color=${encodeURIComponent(user.color || '#ccc')}`);
   } catch (err: any) {
    console.error('Google 로그인 실패:', err.response?.data || err.message);
    res.status(500).send('구글 로그인 실패');
  }
});

// 1. 프론트 → 카카오 로그인 리디렉트
router.get('/kakao', (req, res) => {
  const redirectUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.KAKAO_REDIRECT_URI!)}`;
  res.redirect(redirectUrl);
});

// 2. 카카오 콜백 처리
router.get('/kakao/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenRes = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        client_secret: process.env.KAKAO_CLIENT_SECRET, // 있으면 추가
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code,
      },
    });

    const accessToken = tokenRes.data.access_token;

    const profileRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const kakaoAccount = profileRes.data.kakao_account;
    const email = kakaoAccount.email;
    const nickname = kakaoAccount.profile.nickname;
    const profileImage = kakaoAccount.profile.profile_image_url;

    let user = await User.findOne({ email });
    
    if (!user) {
      const tag = await generateUniqueTag(nickname);
      user = new User({ email, nickname,tag, provider: 'kakao', profileImage, createdAt: new Date() });
      await user.save();
    }

    if (user && user.provider !== 'kakao') {
      return res.redirect(`${process.env.SOCKET_CLIENT_ORIGIN}/oauth/duplicate?email=${encodeURIComponent(email)}&provider=${user.provider}`);
    }

    const payload = { email: user.email, nickname: user.nickname };
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.setHeader('Set-Cookie', cookie.serialize('accessToken', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    }));
    res.redirect(`${process.env.SOCKET_CLIENT_ORIGIN}/oauth/success?email=${encodeURIComponent(email)}&nickname=${encodeURIComponent(user.nickname)}&tag=${user.tag}&profileImage=${encodeURIComponent(user.profileImage || '')}&color=${encodeURIComponent(user.color || '#ccc')}`);

  } catch (err: any) {
    console.error('Kakao 로그인 실패:', err.response?.data || err.message);
    res.status(500).send('카카오 로그인 실패');
  }
});


router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', cookie.serialize('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  }));
  res.status(200).json({ message: 'Logged out' });
});

interface RegisterRequestBody {
  email: string;
  password: string;
  nickname: string;
  profileImage?: string;
}

const registerHandler = async (
    req: Request<{}, {}, RegisterRequestBody>,
    res: Response
  )  => {
  const { email, password, nickname, profileImage } = req.body;
   if (!email || !password || !nickname) {
      return res.status(400).json({ message: '필수 항목이 누락되었습니다.' });
    }

    try {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: '이미 가입된 이메일입니다.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const tag = await generateUniqueTag(nickname);

      const defaultColors = ['#ffb6b6', '#b6e3ff', '#b6ffba', '#fdfd96', '#c3b6ff', '#ffd6a5'];
      const randomColor = defaultColors[Math.floor(Math.random() * defaultColors.length)];

      const user = new User({
        email,
        nickname,
        tag,
        provider: 'local',
        password: hashedPassword,
        profileImage: '',
        color: randomColor,
        createdAt: new Date(),
      });

      await user.save();

      const payload = { email: user.email, nickname: user.nickname };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      res.setHeader(
        'Set-Cookie',
        cookie.serialize('accessToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        })
      );

      return res.status(201).json({
        message: '회원가입 성공',
        user: {
          email: user.email,
          nickname: user.nickname,
          tag: user.tag,
          profileImage: user.profileImage,
        },
      });
    } catch (err) {
      console.error('회원가입 에러:', err);
      return res.status(500).json({ message: '회원가입 실패' });
    }
};

router.post('/register', registerHandler as unknown as express.RequestHandler);

interface LoginRequestBody {
  email: string;
  password: string;
}

const loginHandler = async (
  req: Request<{}, {}, LoginRequestBody>,
  res: Response
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력해주세요.' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user || user.provider !== 'local') {
      return res.status(401).json({ message: '가입된 계정이 없거나 소셜 로그인 계정입니다.' });
    }

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    const payload = { email: user.email, nickname: user.nickname };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.setHeader(
      'Set-Cookie',
      cookie.serialize('accessToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    );

    return res.status(200).json({
      email: user.email,
      nickname: user.nickname,
      tag: user.tag,
      profileImage: user.profileImage,
      color: user.color || '#ccc',
    });
    
  } catch (err) {
    console.error('로그인 에러:', err);
    return res.status(500).json({ message: '로그인 실패' });
  }
};

router.post('/login', loginHandler as unknown as express.RequestHandler);

export default router;
