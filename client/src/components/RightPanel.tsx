'use client';

import { useState, useEffect } from 'react';
import { Users, MessageCircle, X } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import UserAvatar from '@/components/UserAvatar';

interface RightPanelProps {
  mode: 'friends' | 'dm' | 'add-friend'|'shop';
  setMode: (mode: 'friends' | 'dm' | 'add-friend') => void;
  selectedFriend: { nickname: string; tag: string } | null;
  pendingCount: number;
  setPendingCount: React.Dispatch<React.SetStateAction<number>>;
}

export default function RightPanel({ mode, setMode, selectedFriend,setPendingCount, pendingCount }: RightPanelProps) {
  const [friendTab, setFriendTab] = useState<'online' | 'all' | 'pending'>('online');
  const [friendSearch, setFriendSearch] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [pendingList, setPendingList] = useState<
    { nickname: string; tag: string; email: string; profileImage?: string, color:string }[]
  >([]); //친구 요청 리스트임

  const [friendList, setFriendList] = useState<
    { nickname: string; tag: string; email: string; profileImage?: string, color:string }[]
  >([]); //실제 친구 목록임

  useEffect(() => {
    if (friendTab !== 'pending') {
      const fetchFriendList = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/list`, {
            credentials: 'include',
          });
          const data = await res.json();
          if (res.ok) {
            setFriendList(data.friends);
          }
        } catch (err) {
          console.error('친구 목록 불러오기 실패:', err);
        }
      };

      fetchFriendList();
    }
    else {
      const fetchPendingList = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/pending-list`, {
            credentials: 'include',
          });
          const data = await res.json();
          if (res.ok) {
            setPendingList(data.list);
          }
        } catch (err) {
          console.error('친구 요청 목록 불러오기 실패:', err);
        }
      };

      fetchPendingList();
    }
  }, [friendTab]);

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

  const handleAccept = async (fromEmail: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fromEmail }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || '수락 실패');

      setPendingList((prev) => prev.filter((f) => f.email !== fromEmail));
      setPendingCount((prev) => prev - 1);
      setFriendTab('online');
      alert('친구 요청을 수락했습니다.');
    } catch (err: any) {
      alert(err.message || '에러 발생');
    }
  };

  const handleReject = async (fromEmail: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fromEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '거절 실패');

      setPendingList((prev) => prev.filter((f) => f.email !== fromEmail));
      setPendingCount((prev) => prev - 1);
      setFriendTab('online');
      
      alert('친구 요청을 거절했습니다.');
    } catch (err: any) {
      alert(err.message || '에러 발생');
    }
  };

  const handleDeleteFriend = async (email: string) => {
    const confirmDelete = confirm('정말 삭제하시겠어요?');
    if (!confirmDelete) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('삭제 실패');
      setFriendList(prev => prev.filter(friend => friend.email !== email));
      alert('친구가 삭제되었습니다.');
    } catch (err: any) {
      alert(err.message || '에러 발생');
    }
  };

  useEffect(() => {
    const socket = getSocket();

    const handleFriendUpdate = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/list`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) {
          setFriendList(data.friends);
        }
      } catch (err) {
        console.error('친구 목록 갱신 실패:', err);
      }
    };

    socket.on('friendListUpdated', handleFriendUpdate);

    return () => {
      socket.off('friendListUpdated', handleFriendUpdate);
    };
  }, []);

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
          {pendingCount > 0 && (
            <button
              onClick={() => setFriendTab('pending')}
              className={`relative text-sm px-3 py-1 rounded-md transition ${
                friendTab === 'pending'
                  ? 'bg-zinc-300 dark:bg-zinc-700 text-black dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              친구 요청
              <span className="absolute -top-1 -right-0.5 px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {pendingCount}
              </span>
            </button>
          )}
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
            {friendTab === 'pending' && (
            <>
            {pendingList.length === 0 ? (
              <div className="p-3 rounded-md bg-zinc-100 dark:bg-zinc-700 text-sm text-zinc-600 dark:text-zinc-300">
                받은 친구 요청이 없습니다.
              </div>
            ) : (
              pendingList.map((req) => (
                <div key={`${req.email}`} className="p-3 rounded-md bg-zinc-200 dark:bg-zinc-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserAvatar profileImage={req.profileImage} color={req.color} size={32} />
                    <div className="text-sm font-medium">
                      {req.nickname}#{req.tag}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAccept(req.email)}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded"
                    >
                      수락
                    </button>
                    <button
                      onClick={() => handleReject(req.email)}
                      className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

          {friendTab === 'online' && (
            <>
              <div className="p-3 rounded-md bg-zinc-200 dark:bg-zinc-700">
                건모#1234 <span className="text-sm text-green-600 dark:text-green-400">(온라인)</span>
              </div>
            </>
          )}
          {friendTab === 'all' && (
            friendList.map((friend) => (
              <div key={friend.email} className="p-3 rounded-md bg-zinc-200 dark:bg-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserAvatar profileImage={friend.profileImage} color={friend.color} size={32} />
                  <div className="text-sm font-medium">
                    {friend.nickname}#{friend.tag}
                  </div>
                </div>
                <div className="flex gap-1 items-center">
                  <button className="p-1 hover:text-blue-500"><MessageCircle size={16} /></button>
                  <button onClick={() => handleDeleteFriend(friend.email)} className="p-1 hover:text-red-600"><X size={16} /></button>
                </div>
              </div>
            ))
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

        <div className="flex gap-2 w-full">
          <input
            type="text"
            value={friendInput || ''}
            onChange={(e) => setFriendInput(e.target.value)}
            placeholder="예: gunmo#1234"
            className="flex-1 min-w-0 px-3 py-2 rounded-md border bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-black dark:text-white"
          />
          <button
            onClick={handleAddFriend}
            className="px-4 py-2 whitespace-nowrap rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
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