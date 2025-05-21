'use client';

import { FcGoogle } from 'react-icons/fc';
import { SiKakaotalk, SiNaver } from 'react-icons/si';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const router = useRouter();

  const handleGoogleLogin = () => {
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  const handleKakaoLogin = () => {
    window.location.href = `${apiUrl}/api/auth/kakao`;
  };

  const handleNaverLogin = () => {
    window.location.href = `${apiUrl}/api/auth/naver`;
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-900 text-black dark:text-white px-4 relative">
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 flex items-center gap-2 text-sm px-4 py-2 rounded-lg shadow bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
        <span className="text-xl">⬅</span>
      </button>

      <h2 className="text-3xl font-bold mb-6">로그인</h2>

      <p className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
        {`만나서 반가워요 \'ㅁ\'`}
      </p>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={handleGoogleLogin}
          className="flex items-center gap-3 justify-center w-full py-3 px-4 rounded-xl bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-100 transition shadow-sm"
        >
          <FcGoogle size={20} />
          <span className="font-medium">Google로 로그인</span>
        </button>

        <button
          onClick={handleKakaoLogin}
          className="flex items-center gap-3 justify-center w-full py-3 px-4 rounded-xl bg-[#FEE500] text-zinc-800 border border-zinc-300 hover:bg-yellow-300 transition shadow-sm"
        >
          <SiKakaotalk size={20} />
          <span className="font-medium">&nbsp;Kakao로 로그인</span>
        </button>

        <button
          onClick={handleNaverLogin}
          className="flex items-center gap-3 justify-center w-full py-3 px-4 rounded-xl bg-[#03C75A] text-white border border-green-700 hover:bg-green-500 transition shadow-sm"
        >
          <SiNaver size={20} />
          <span className="font-medium">&nbsp;Naver로 로그인</span>
        </button>

        <div className="text-sm text-center text-zinc-500 dark:text-zinc-400 mt-6">
          또는{' '}
          <a
            href="/register"
            className="underline hover:text-blue-500 dark:hover:text-blue-400"
          >
            일반 회원가입
          </a>
        </div>
      </div>
    </main>
  );
}
