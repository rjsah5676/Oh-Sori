'use client';

import { useEffect, useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState('');
  const [phrase, setPhrase] = useState('');

  const phrases = [
    '우리 재밌게 놀아봐요 :)',
    '익숙하지만 새로운 공간',
    '개발자들의 커뮤니티 놀이터',
    'WooriBoard에 오신 걸 환영해요!',
    '오늘도 좋은 하루 되세요 ☀️',
    '할 말 있으면 WooriBoard에!',
    '여긴 눈치 안 봐도 돼요 🙌',
    '편하게 말 걸어봐요 👋',
    '이제 시작해볼까요?',
    '같이 성장하는 우리 커뮤니티 💪',
  ];

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || '/api'}`)
      .then((res) => res.text())
      .then((text) => setData(text))
      .catch((err) => console.error(err));

    const random = phrases[Math.floor(Math.random() * phrases.length)];
    setPhrase(random);
  }, []);

  return (
    <main className="min-h-screen bg-white text-black dark:bg-zinc-900 dark:text-zinc-200 flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 dark:from-teal-200 dark:to-indigo-400">
        WooriBoard
      </h1>
      <p className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
        {phrase}
      </p>

      <div className="bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10 p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-4 transition">
        <button className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow flex items-center justify-center gap-2 transition">
          <LogIn size={20} />
          로그인
        </button>
        <button className="w-full py-3 rounded-xl bg-gray-200 hover:bg-gray-100 text-black font-semibold dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white shadow flex items-center justify-center gap-2 transition">
          <UserPlus size={20} />
          회원가입
        </button>
      </div>
    </main>
  );
}
