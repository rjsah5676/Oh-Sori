"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function TermsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-900 text-black dark:text-zinc-100 p-6 mt-12 flex flex-col items-center">
      {/* 헤더 */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">📜 이용약관</h1>

        {/* 나가기 버튼 (shadcn 없이 Tailwind로 구현) */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">나가기</span>
        </button>
      </div>

      {/* 본문 (ScrollArea 대신 div + overflow-y-auto) */}
      <div className="w-full max-w-3xl h-[70vh] overflow-y-auto bg-zinc-50 dark:bg-zinc-800 rounded-2xl shadow-inner p-6 text-sm leading-relaxed">
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">1. 목적</h2>
          <p>
            본 약관은 오소리(이하 “서비스”)의 이용조건 및 절차, 회원과 서비스
            제공자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">2. 정의</h2>
          <p>
            “회원”이라 함은 본 약관에 동의하고 서비스를 이용하는 이용자를
            말합니다. “콘텐츠”란 서비스 내에서 이용자가 작성하거나 업로드한 모든
            자료를 의미합니다.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">3. 회원의 의무</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>타인의 정보를 도용하거나 허위 정보를 제공하지 않습니다.</li>
            <li>서비스를 부정한 목적으로 이용하지 않습니다.</li>
            <li>다른 이용자의 정상적인 이용을 방해하지 않습니다.</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            4. 서비스의 변경 및 중단
          </h2>
          <p>
            회사는 서비스 개선을 위해 사전 공지 후 서비스를 변경하거나 중단할 수
            있습니다.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">5. 면책조항</h2>
          <p>
            회사는 천재지변, 시스템 오류, 이용자 귀책 사유 등으로 발생한 손해에
            대해 책임을 지지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. 부칙</h2>
          <p>본 약관은 2025년 11월 9일부터 시행됩니다.</p>
        </section>
      </div>

      {/* 하단 */}
      <p className="text-xs text-zinc-400 mt-4">
        © 2025 Osori Project. All rights reserved.
      </p>
    </main>
  );
}
