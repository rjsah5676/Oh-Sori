'use client';

import { useEffect, useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/api';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';

import { logout } from '@/store/authSlice';
import useRedirectIfLoggedIn from '@/hooks/useRedirectIfLoggedIn';

export default function Home() {
  const [phrase, setPhrase] = useState('');
  const router = useRouter();
  const nickname = useSelector((state: RootState) => state.auth.user?.nickname);
  const phrases = [
    '우리 재밌게 놀아봐요 :)',
    '익숙하지만 새로운 공간',
    '개발자들의 커뮤니티 놀이터',
    'Oh! Sori에 오신 걸 환영해요!',
    '오늘도 좋은 하루 되세요 ☀️',
    '할 말 있으면 Oh! Sori에!',
    '여긴 눈치 안 봐도 돼요 🙌',
    '편하게 말 걸어봐요 👋',
    '이제 시작해볼까요?',
    '같이 성장하는 우리 커뮤니티 💪',
  ];

  const dispatch = useDispatch();
  useRedirectIfLoggedIn();
  useEffect(() => {
    apiFetch('')
      .then((res) => {
        console.log(res.message);
      })
      .catch((err) => console.error(err));

    const random = phrases[Math.floor(Math.random() * phrases.length)];
    setPhrase(random);
  }, [nickname]);

  if (nickname) return null;

  return (
    <main className="min-h-screen bg-white text-black dark:bg-zinc-900 dark:text-zinc-200 flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-3 mb-4">
        <Image
          src="/images/logo.png"
          alt="Oh! Sori 로고"
          width={60}
          height={60}
          priority
          className="block dark:hidden"
        />
        <Image
          src="/images/logo_darkk.png"
          alt="Oh! Sori 다크 로고"
          width={60}
          height={60}
          priority
          className="hidden dark:block"
        />
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 dark:from-teal-200 dark:to-indigo-400">
          Oh! Sori
        </h1>
      </div>
      <p className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
        {nickname ? `${nickname}님, ${phrase}` : phrase}
      </p>

      <div className="bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10 p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-4 transition">
        <>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow flex items-center justify-center gap-2 transition"
          >
            <LogIn size={20} />
            로그인
          </button>
          <button
            onClick={() => router.push('/about')}
            className="w-full py-3 rounded-xl bg-gray-200 hover:bg-gray-100 text-black font-semibold dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white shadow flex items-center justify-center gap-2 transition">
            👀 구경할래요
          </button>
        </>
      </div>
      <footer className="mt-12 text-sm text-zinc-500 dark:text-zinc-400 text-center space-y-1">
        <div className="space-x-4">
          <a href="/notice" className="hover:underline">공지사항</a>
          <a href="/terms" className="hover:underline">이용약관</a>
          <a href="/contact" className="hover:underline">문의하기</a>
        </div>
        <p>&copy; 2025 Oh! Sori. All rights reserved.</p>
      </footer>
    </main>
  );
}
