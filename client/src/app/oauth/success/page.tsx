'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setUser } from '@/store/authSlice';
import { Suspense } from 'react';

function OAuthSuccessContent() {
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
  }, [nickname, profileImage, dispatch, tag, email, color, router]);

  return <div className="text-center mt-32 text-lg">로그인 처리 중입니다...</div>;
}

export default function OAuthSuccessPage() {
  return (
    <Suspense fallback={<div className="text-center mt-32 text-lg">로그인 처리 중입니다...</div>}>
      <OAuthSuccessContent />
    </Suspense>
  );
}
