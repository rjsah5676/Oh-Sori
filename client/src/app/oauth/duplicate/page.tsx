'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export default function OAuthDuplicatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  const provider = searchParams.get('provider');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-2xl font-bold mb-4">이미 가입된 이메일입니다.</h1>
      <p className="mb-4">
        {email} 은(는) 이미 <b>{provider}</b> 로그인으로 가입되어 있습니다.
      </p>
      <button
        onClick={() => router.push('/login')}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500"
      >
        로그인 페이지로 이동
      </button>
    </div>
  );
}