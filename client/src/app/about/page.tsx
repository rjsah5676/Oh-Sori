'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-white to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 text-black dark:text-white p-8">
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 flex items-center gap-2 text-sm px-4 py-2 rounded-lg shadow bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition dark:bg-zinc-800 dark:hover:bg-zinc-700"
      >
        <span className="text-xl">⬅</span>
      </button>
      <div className='mb-6'>
        <Image
          src="/images/logo.png"
          alt="Oh! Sori 로고"
          width={100}
          height={100}
          className="mx-auto dark:hidden"
        />
        <Image
          src="/images/logo_darkk.png"
          alt="Oh! Sori 로고 다크"
          width={100}
          height={100}
          className="mx-auto hidden dark:block"
        />
      </div>
      <div className="max-w-3xl w-full text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-teal-400 dark:from-teal-200 dark:to-blue-400">
          Oh! Sori는 어떤 서비스인가요?
        </h1>
        <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400">
          Oh! Sori는 개발자들을 위한 소통 놀이터입니다. <br />
          익명으로 소통하고, 질문하고, 공유하며 함께 성장해요!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left text-base sm:text-lg mt-8">
          <div className="p-6 bg-white/60 dark:bg-zinc-800 rounded-2xl shadow">
            <h2 className="font-bold text-xl mb-2">🧠 자유로운 질문과 토론</h2>
            <p>어떤 주제든 상관 없어요. 기술, 커리어, 고민까지 모두 환영합니다.</p>
          </div>
          <div className="p-6 bg-white/60 dark:bg-zinc-800 rounded-2xl shadow">
            <h2 className="font-bold text-xl mb-2">🎨 감성 있는 UI</h2>
            <p>다크 모드를 포함한 깔끔한 디자인으로 사용자의 집중을 도와줘요.</p>
          </div>
          <div className="p-6 bg-white/60 dark:bg-zinc-800 rounded-2xl shadow">
            <h2 className="font-bold text-xl mb-2">🙌 함께 성장하는 커뮤니티</h2>
            <p>혼자보다 함께. 좋은 사람들과의 연결이 우리의 가치를 키워요.</p>
          </div>
          <div className="p-6 bg-white/60 dark:bg-zinc-800 rounded-2xl shadow">
            <h2 className="font-bold text-xl mb-2">🔐 안전한 로그인</h2>
            <p>카카오, 구글, 네이버로 간편하고 안전하게 로그인할 수 있어요.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
