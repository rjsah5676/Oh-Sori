'use client';

import { useRef,useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import Image from 'next/image';
import { Mic, Headphones, Settings, Users, Store } from 'lucide-react';
import { logout } from '@/store/authSlice';
import RightPanel from '@/components/RightPanel';
import { getSocket } from '@/lib/socket';
import UserAvatar from '@/components/UserAvatar';

export default function MainRedirectPage() {
  const router = useRouter();
  const nickname = useSelector((state: RootState) => state.auth.user?.nickname);
  const email = useSelector((state: RootState) => state.auth.user?.email);
  const profileImage = useSelector((state: RootState) => state.auth.user?.profileImage);
  const tag = useSelector((state: RootState) => state.auth.user?.tag);
  const dispatch = useDispatch();

  const color = useSelector((state: RootState) => state.auth.user?.color);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mode, setMode] = useState<'friends' | 'dm' | 'add-friend' | 'shop'>('friends');
  const [selectedFriend, setSelectedFriend] = useState<{ nickname: string; tag: string } | null>(null);
  const registerSentRef = useRef(false);

  const socket = getSocket();

  const [pendingCount,setPendingCount] = useState(0);

  const [userStatus, setUserStatus] = useState<'online' | 'offline' | 'away' | 'dnd'| null>(null);

  const [friendStatuses, setFriendStatuses] = useState<Record<string, 'online' | 'offline' | 'away' | 'dnd'|null>>({});

  const fetchPendingCount = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/pending-count`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setPendingCount(data.count);
      }
    } catch (err) {
      console.error('알림 수 가져오기 실패:', err);
    }
  };

  useEffect(() => {
    if(email) {
      const fetchStatus = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/status/${email}`);
          const data = await res.json();
          setUserStatus(data.status); // 'online' or 'offline'
        } catch (e) {
          console.error('상태 가져오기 실패:', e);
        }
      };

      fetchStatus();
    }
    if (!registerSentRef.current && email) {
      fetchPendingCount();
    }
    if (email && socket.connected && !registerSentRef.current) {
      socket.emit('register', email);
      registerSentRef.current = true;
    }

    const handleConnect = () => {
      if (email && !registerSentRef.current) {
        socket.emit('register', email);
        registerSentRef.current = true;
      }
    };

    const handleStatusUpdate = (data: { email: string; status: 'online' | 'offline' | 'away' | 'dnd' | null }) => {
      setFriendStatuses((prev) => ({
        ...prev,
        [data.email]: data.status,
      }));

      if (data.email === email) {
        setUserStatus(data.status);
      }
    };


    socket.on('connect', handleConnect);
    socket.on('friendRequestReceived', (data) => {
      console.log('📩 친구 요청 도착:', data);
      fetchPendingCount();
    });
    socket.on('status-update', handleStatusUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('friendRequestReceived');
      socket.off('status-update', handleStatusUpdate);
    };
  }, [email]);

  const friendList = [
    { nickname: '건모', tag: '1234' },
    { nickname: '준모', tag: '4211' },
    { nickname: '성모', tag: '7777' },
  ];

  useEffect(() => {
    if (!nickname) router.replace('/');
  }, [nickname, router]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!nickname) return null;

  return (
    <>
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 px-3 py-1 rounded bg-zinc-200 dark:bg-zinc-700 shadow text-lg"
        >
          ☰
        </button>
      )}

      {isSidebarOpen && (
        <div
          className="fixed top-0 left-0 h-full w-[304px] z-40 flex bg-transparent transform transition-transform duration-300 ease-in-out md:hidden"
        >
          {/* 왼쪽 아이콘 바 */}
          <aside className="w-16 bg-zinc-200 dark:bg-zinc-900 border-r border-zinc-300 dark:border-zinc-700 flex flex-col pt-4 pb-[60px] items-center">
            <button className="w-10 h-10 bg-zinc-300 dark:bg-zinc-700 rounded-full hover:bg-zinc-400 dark:hover:bg-zinc-600">
              +
            </button>
          </aside>

          {/* 오른쪽 메뉴 바 */}
          <aside className="relative w-60 bg-zinc-100 dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex flex-col pt-4 pb-[60px]">
            {/* 오른쪽 중앙 닫기 버튼 */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-1/2 right-[0px] -translate-y-1/2 z-50 bg-zinc-300 dark:bg-zinc-700 text-black dark:text-white px-2 py-1 rounded-l shadow"
            >
              &lt;
            </button>

            {/* 메뉴 리스트 */}
            <div className="border-b border-zinc-300 dark:border-zinc-700 pb-2 mb-2">
              {/* 친구들 */}
              <div
                className={`relative mx-2 mb-1 text-base font-medium flex items-center gap-2 rounded px-2 py-1 cursor-pointer transition ${
                  mode === 'friends'
                    ? 'bg-zinc-300 dark:bg-zinc-700 text-black dark:text-white'
                    : 'text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                onClick={() => {
                  setMode('friends');
                  setSelectedFriend(null);
                  setIsSidebarOpen(false);
                }}
              >
                <Users className="w-5 h-5" />
                <span className="relative">
                  친구들
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-3 px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </span>
              </div>

              {/* 상점 */}
              <div
                className={`mx-2 text-base font-medium flex items-center gap-2 rounded px-2 py-1 cursor-pointer transition ${
                  mode === 'shop'
                    ? 'bg-zinc-300 dark:bg-zinc-700 text-black dark:text-white'
                    : 'text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                onClick={() => {
                  setMode('shop');
                  setSelectedFriend(null);
                  setIsSidebarOpen(false);
                }}
              >
                <Store className="w-5 h-5" />
                상점
              </div>
            </div>

            {/* 친구 리스트 */}
            <div className="flex flex-col space-y-2 px-2">
              {friendList.map((friend) => (
                <button
                  key={`${friend.nickname}#${friend.tag}`}
                  onClick={() => {
                    setSelectedFriend(friend);
                    setMode('dm');
                    setIsSidebarOpen(false);
                  }}
                  className={`hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-2 rounded-md text-left ${
                    selectedFriend?.nickname === friend.nickname && selectedFriend?.tag === friend.tag
                      ? 'bg-zinc-300 dark:bg-zinc-700 font-semibold'
                      : ''
                  }`}
                >
                  {friend.nickname}#{friend.tag}
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      <div className="hidden md:flex fixed bottom-0 left-0 w-[304px] h-[60px] bg-zinc-200 dark:bg-zinc-900 border-t border-r border-zinc-300 dark:border-zinc-700 px-3 items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <UserAvatar profileImage={profileImage} userStatus={userStatus} color={color ?? undefined} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-black dark:text-white truncate">{nickname}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">#{tag}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <button className="hover:text-black dark:hover:text-white transition"><Mic size={16} /></button>
          <button className="hover:text-black dark:hover:text-white transition"><Headphones size={16} /></button>
          <button
            onClick={async () => {
              try {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
                  method: 'POST',
                  credentials: 'include',
                });
                dispatch(logout());
                router.refresh();
              } catch (e) {
                console.error('Logout failed:', e);
              }
            }}
            className="hover:text-black dark:hover:text-white transition"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <main className="flex min-h-screen bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white">
        <aside className="hidden md:flex w-16 flex-col items-center pt-4 pb-[60px] bg-zinc-200 dark:bg-zinc-900 border-r border-zinc-300 dark:border-zinc-700">
          <button className="w-10 h-10 bg-zinc-300 dark:bg-zinc-700 rounded-full hover:bg-zinc-400 dark:hover:bg-zinc-600">+</button>
        </aside>

        <aside className="hidden md:flex w-60 flex-col pt-4 pb-[60px] bg-zinc-100 dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700">
          <div className="border-b border-zinc-300 dark:border-zinc-700 pb-2 mb-2">
            <div
              className={`relative mx-2 mb-1 text-base font-medium flex items-center gap-2 rounded px-2 py-1 cursor-pointer transition ${
                mode === 'friends'
                  ? 'bg-zinc-300 dark:bg-zinc-700 text-black dark:text-white'
                  : 'text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              onClick={() => {
                setMode('friends');
                setSelectedFriend(null);
              }}
            >
              <Users className="w-5 h-5" />
              <span className="relative">
                친구들
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-3 px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </span>
            </div>
            <div
              className={`mx-2 text-base font-medium flex items-center gap-2 rounded px-2 py-1 cursor-pointer transition ${
                mode === 'shop' ? 'bg-zinc-300 dark:bg-zinc-700 text-black dark:text-white' : 'text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              onClick={() => {
                setMode('shop');
                setSelectedFriend(null);
              }}
            >
              <Store className="w-5 h-5" /> 상점
            </div>
          </div>

          <div className="flex flex-col space-y-2 px-2">
            {friendList.map((friend) => (
              <button
                key={`${friend.nickname}#${friend.tag}`}
                onClick={() => {
                  setSelectedFriend(friend);
                  setMode('dm');
                }}
                className={`hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-2 rounded-md text-left ${
                  selectedFriend?.nickname === friend.nickname && selectedFriend?.tag === friend.tag
                    ? 'bg-zinc-300 dark:bg-zinc-700 font-semibold'
                    : ''
                }`}
              >
                {friend.nickname}#{friend.tag}
              </button>
            ))}
          </div>
        </aside>
        <div className="md:hidden fixed bottom-0 left-0 w-full h-[60px] bg-zinc-200 dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-700 px-3 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <UserAvatar profileImage={profileImage} userStatus={userStatus} color={color ?? undefined} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-black dark:text-white truncate">{nickname}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">#{tag}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <button className="hover:text-black dark:hover:text-white transition"><Mic size={16} /></button>
          <button className="hover:text-black dark:hover:text-white transition"><Headphones size={16} /></button>
          <button
            onClick={async () => {
              try {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
                  method: 'POST',
                  credentials: 'include',
                });
                dispatch(logout());
                router.refresh();
              } catch (e) {
                console.error('Logout failed:', e);
              }
            }}
            className="hover:text-black dark:hover:text-white transition"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
        <section className="flex-1 min-h-screen pt-20 md:pt-6 p-6 overflow-y-auto">
          <RightPanel setFriendStatuses={setFriendStatuses} friendStatuses={friendStatuses} mode={mode} setMode={setMode} selectedFriend={selectedFriend} pendingCount={pendingCount} setPendingCount={setPendingCount}/>
        </section>
      </main>
    </>
  );
}