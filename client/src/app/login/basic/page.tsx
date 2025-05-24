'use client';

import { useState } from 'react';

export default function BasicLoginPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleSubmit();
    }
    };

  const handleSubmit = () => {
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    // 동적으로 폼 생성해서 submit
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${apiUrl}/api/auth/login`;

    const emailInput = document.createElement('input');
    emailInput.type = 'hidden';
    emailInput.name = 'email';
    emailInput.value = email;
    form.appendChild(emailInput);

    const pwInput = document.createElement('input');
    pwInput.type = 'hidden';
    pwInput.name = 'password';
    pwInput.value = password;
    form.appendChild(pwInput);

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-900 text-black dark:text-white px-4">
      <h2 className="text-3xl font-bold mb-6">일반 로그인</h2>

      <div className="w-full max-w-sm space-y-4">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:text-white"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:text-white"
        />

        {error && <div className="text-sm text-red-500 mt-2">{error}</div>}

        <button
          onClick={handleSubmit}
          className="w-full py-3 px-4 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 transition"
        >
          로그인
        </button>

        <button
          onClick={() => window.location.href = '/'}
          className="w-full py-2 text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-white"
        >
          메인으로 돌아가기
        </button>
      </div>
    </main>
  );
}
