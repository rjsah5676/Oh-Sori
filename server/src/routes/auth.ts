import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import User from '../models/User';

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
      user = new User({
        email,
        nickname,
        provider: 'naver',
        profileImage,
        createdAt: new Date(),
      });
      await user.save();
    }
    if (user && user.provider !== 'naver') {
      return res.redirect(`http://localhost:3000/oauth/duplicate?email=${encodeURIComponent(email)}&provider=${user.provider}`);
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
    res.redirect(`http://localhost:3000/oauth/success?nickname=${encodeURIComponent(user.nickname)}&profileImage=${encodeURIComponent(user.profileImage || '')}`);
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
      user = new User({ email, nickname, provider: 'google', profileImage, createdAt: new Date() });
      await user.save();
    }
    if (user && user.provider !== 'google') {
      return res.redirect(`http://localhost:3000/oauth/duplicate?email=${encodeURIComponent(email)}&provider=${user.provider}`);
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

    res.redirect(`http://localhost:3000/oauth/success?nickname=${encodeURIComponent(user.nickname)}&profileImage=${encodeURIComponent(user.profileImage || '')}`);
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
      user = new User({ email, nickname, provider: 'kakao', profileImage, createdAt: new Date() });
      await user.save();
    }

    if (user && user.provider !== 'kakao') {
      return res.redirect(`http://localhost:3000/oauth/duplicate?email=${encodeURIComponent(email)}&provider=${user.provider}`);
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

    res.redirect(`http://localhost:3000/oauth/success?nickname=${encodeURIComponent(user.nickname)}&profileImage=${encodeURIComponent(user.profileImage || '')}`);
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


export default router;
