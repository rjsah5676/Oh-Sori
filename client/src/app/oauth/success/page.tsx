'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setUser } from '@/store/authSlice';
import { Suspense } from 'react';
import useRedirectIfLoggedIn from '@/hooks/useRedirectIfLoggedIn';

function OAuthSuccessContent() {
  useRedirectIfLoggedIn();
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
      <div className="w-12 h-12 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-4" />
      <div className="text-lg font-semibold">로그인 처리 중입니다...</div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">잠시만 기다려 주세요</p>
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
        <div className="w-12 h-12 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-4" />
        <div className="text-lg font-semibold">로그인 처리 중입니다...</div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">잠시만 기다려 주세요</p>
      </div>
    }>
      <OAuthSuccessContent />
    </Suspense>
  );
}