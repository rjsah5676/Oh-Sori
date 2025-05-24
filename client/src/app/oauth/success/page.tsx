'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setUser } from '@/store/authSlice';

export default function OAuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const nickname = searchParams.get('nickname');
  const profileImage = searchParams.get('profileImage');
  const tag = searchParams.get('tag');
  const email = searchParams.get('email');
  const color = searchParams.get('color');
  useEffect(() => {
    if (nickname) {
      dispatch(setUser({ nickname, tag, profileImage, email, color }));
      router.replace('/');
    }
  }, [nickname, profileImage, dispatch]);

  return <div className="text-center mt-32 text-lg">로그인 처리 중입니다...</div>;
}
