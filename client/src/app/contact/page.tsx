"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ContactPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-white to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 text-black dark:text-white p-8">
      앞으로 해야할 일: 설정 페이지 추가, 화면공유 추가
    </main>
  );
}
