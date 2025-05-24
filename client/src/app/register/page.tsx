'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');

    if (!email || !nickname || !password) {
      setError('모든 필수 항목을 입력해주세요.');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nickname, password, profileImage }),
        credentials: 'include', // 쿠키 받아오기 위해 필요
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '회원가입 실패');
      }

      router.push('/login/basic'); // 회원가입 성공 시 일반 로그인 페이지로 이동
    } catch (err: any) {
      setError(err.message || '회원가입 중 오류 발생');
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-900 text-black dark:text-white px-4">
      <h2 className="text-3xl font-bold mb-6">회원가입</h2>

      <div className="w-full max-w-sm space-y-4">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:text-white"
        />
        <input
          type="text"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:text-white"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:text-white"
        />

        {error && (
          <div className="text-sm text-red-500 mt-2">{error}</div>
        )}

        <button
          onClick={handleRegister}
          className="w-full py-3 px-4 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 transition"
        >
          회원가입
        </button>

        <button
          onClick={() => router.push('/')}
          className="w-full py-2 text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-white"
        >
          메인으로 돌아가기
        </button>
      </div>
    </main>
  );
}
