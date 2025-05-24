'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';

interface RightPanelProps {
  mode: 'friends' | 'dm' | 'add-friend'|'shop';
  setMode: (mode: 'friends' | 'dm' | 'add-friend') => void;
  selectedFriend: { nickname: string; tag: string } | null;
}

export default function RightPanel({ mode, setMode, selectedFriend }: RightPanelProps) {
  const [friendTab, setFriendTab] = useState<'online' | 'all'>('online');
  const [friendSearch, setFriendSearch] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAddFriend = async () => {
    const [nickname, tag] = friendInput.split('#');
    if (!nickname || !tag) {
      setErrorMessage('닉네임과 태그 형식이 올바르지 않습니다.');
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nickname, tag }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || '친구 요청 실패');

      setFriendInput('');
      setErrorMessage('');
      alert('친구 요청이 전송되었습니다.');
      setMode('friends'); // 성공 후 친구 목록으로
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  if (mode === 'friends') {
    return (
      <div className="space-y-4">
        <div
          className="flex items-center gap-2 text-base font-semibold text-black dark:text-white mt-1 cursor-pointer"
        >
          <Users className="w-5 h-5 text-zinc-700 dark:text-white" />
          친구들
      </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFriendTab('online')}
            className={`text-sm px-3 py-1 rounded-md transition ${
              friendTab === 'online'
                ? 'bg-zinc-300 dark:bg-zinc-700 text-black dark:text-white'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            온라인
          </button>
          <button
            onClick={() => setFriendTab('all')}
            className={`text-sm px-3 py-1 rounded-md transition ${
              friendTab === 'all'
                ? 'bg-zinc-300 dark:bg-zinc-700 text-black dark:text-white'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setMode('add-friend')}
            className="text-sm px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition"
          >
            친구 추가
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="친구 검색..."
            className="w-full px-3 py-2 pr-10 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm text-black dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={friendSearch}
            onChange={(e) => setFriendSearch(e.target.value)}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 text-zinc-500 dark:text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
        </div>

        <div className="space-y-2 text-base">
          {friendTab === 'online' && (
            <>
              <div className="p-3 rounded-md bg-zinc-200 dark:bg-zinc-700">
                건모#1234 <span className="text-sm text-green-600 dark:text-green-400">(온라인)</span>
              </div>
            </>
          )}
          {friendTab === 'all' && (
            <>
              <div className="p-3 rounded-md bg-zinc-200 dark:bg-zinc-700">
                건모#1234 <span className="text-sm text-green-600 dark:text-green-400">(온라인)</span>
              </div>
              <div className="p-3 rounded-md bg-zinc-200 dark:bg-zinc-700">
                준모#4211 <span className="text-sm text-yellow-600 dark:text-yellow-400">(자리비움)</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'dm') {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-2">건모#1234님과의 DM</h2>
        <div className="text-base text-zinc-600 dark:text-zinc-300">채팅 내용 들어갈 자리</div>
      </div>
    );
  }

  if (mode === 'shop') {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-2">상점이에용</h2>
      </div>
    );
  }

  if (mode === 'add-friend') {
    return (
      <div className="space-y-4">
        <div className="text-base font-semibold text-black dark:text-white mt-1 flex items-center justify-between">
          <span>👤 친구 추가</span>
          <button
            onClick={() => setMode('friends')}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
          >
            ← 돌아가기
          </button>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          친구의 사용자명을 <span className="font-mono">이름#태그</span> 형식으로 입력해주세요.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={friendInput || ''}
            onChange={(e) => setFriendInput(e.target.value)}
            placeholder="예: gunmo#1234"
            className="flex-1 px-3 py-2 rounded-md border bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-black dark:text-white"
          />
          <button
            onClick={handleAddFriend}
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
          >
            보내기
          </button>
        </div>

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
      </div>
    );
  }

  return null;
}