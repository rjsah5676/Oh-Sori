"use client";

import { FcGoogle } from "react-icons/fc";
import { SiKakaotalk, SiNaver } from "react-icons/si";
import { useRouter } from "next/navigation";
import useRedirectIfLoggedIn from "@/hooks/useRedirectIfLoggedIn";
import useModalConfirm from "@/hooks/useModalConfirm";

export default function LoginPage() {
  useRedirectIfLoggedIn();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const router = useRouter();
  const { alert, confirm } = useModalConfirm();

  const handleGoogleLogin = () => {
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  const handleKakaoLogin = () => {
    window.location.href = `${apiUrl}/api/auth/kakao`;
  };

  const handleNaverLogin = () => {
    //window.location.href = `${apiUrl}/api/auth/naver`;
    alert("현재 네이버 로그인은 지원되지 않습니다.");
  };

  const handleBasicLogin = () => {
    router.push("/login/basic");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-900 text-black dark:text-white px-4 relative">
      <button
        onClick={() => router.push("/")}
        className="absolute top-4 left-4 flex items-center gap-2 text-sm px-4 py-2 rounded-lg shadow bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition"
      >
        <span className="text-xl">⬅</span>
      </button>

      <h2 className="text-3xl font-bold mb-6">로그인</h2>

      <p className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
        만나서 반가워요 'ㅁ'
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
          <span className="font-medium">Kakao로 로그인</span>
        </button>

        <button
          onClick={handleNaverLogin}
          className="flex items-center gap-3 justify-center w-full py-3 px-4 rounded-xl bg-[#03C75A] text-white border border-green-700 hover:bg-green-500 transition shadow-sm"
        >
          <SiNaver size={20} />
          <span className="font-medium">Naver로 로그인</span>
        </button>

        <button
          onClick={handleBasicLogin}
          className="flex items-center justify-center w-full py-3 px-4 rounded-xl bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 transition shadow-sm"
        >
          <span className="font-medium">일반 로그인</span>
        </button>

        <div className="text-sm text-center text-zinc-500 dark:text-zinc-400 mt-6">
          또는{" "}
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
