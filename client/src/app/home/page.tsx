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
import { setStatus } from '@/store/userStatusSlice';

interface FriendWithRoom {
  nickname: string;
  tag: string;
  email: string;
  profileImage?: string;
  color: string;
  userStatus?: 'online' | 'offline' | 'away' | 'dnd';
  roomId: string;
  unreadCount?: number;
  lastMessage?: { content: string; createdAt: string };
}

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
  const [selectedFriend, setSelectedFriend] = useState<FriendWithRoom | null>(null);
  const registerSentRef = useRef(false);

  const socket = getSocket();

  const [pendingCount,setPendingCount] = useState(0);

  const [dmList, setDmList] = useState<FriendWithRoom[]>([]);

  const userStatus = useSelector((state: RootState) => {
    if (!email) return 'offline';
    return state.userStatus.statuses[email] || 'offline';
  });
  
  const friendStatuses = useSelector((state: RootState) => state.userStatus.statuses);

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

  const fetchDMList = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dms/list`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        const formatted: FriendWithRoom[] = data.rooms.map((room: any) => ({
          nickname: room.opponent.nickname,
          tag: room.opponent.tag,
          email: room.opponent.email,
          profileImage: room.opponent.profileImage,
          color: room.opponent.color,
          roomId: room.roomId,
          userStatus: friendStatuses[room.opponent.email] || 'offline',
          unreadCount: room.unreadCount ?? 0,
          lastMessage: room.lastMessage,
        }));
        setDmList(formatted);
      } else {
        console.error('DM 리스트 로드 실패:', data.message);
      }
    } catch (err) {
      console.error('DM 리스트 가져오기 에러:', err);
    }
  };

  useEffect(() => {
    if (!registerSentRef.current && email) {
      fetchPendingCount();
      fetchDMList();
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
      dispatch(setStatus(data));
    };

    const handleReceiveMessage = (msg: any) => {
        socket.emit('markAsRead', {
          roomId: msg.roomId,
          email,
        });

        socket.emit('refreshDmList');
    };

    const refreshDmList = async () => {
      fetchDMList();
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('refreshDmList', refreshDmList);
    socket.on('connect', handleConnect);
    socket.on('friendRequestReceived', (data) => {
      console.log('📩 친구 요청 도착:', data);
      fetchPendingCount();
    });
    socket.on('status-update', handleStatusUpdate);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('connect', handleConnect);
      socket.off('friendRequestReceived');
      socket.off('status-update', handleStatusUpdate);
      socket.off('refreshDmList', refreshDmList);
    };
  }, [email]);


  useEffect(() => {
    if (selectedFriend && email) {
      socket.emit('markAsRead', {
        roomId: selectedFriend.roomId,
        email,
      });
    }
  }, [selectedFriend, email]);

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

    return () => { 
      window.removeEventListener('resize', handleResize);
    }
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
            {dmList.map((friend) => (
            <button
              key={friend.email}
              onClick={() => {
                setSelectedFriend(friend);
                setMode('dm');

                // unreadCount 바로 0으로 처리
                setDmList((prevList) =>
                  prevList.map((f) =>
                    f.email === friend.email ? { ...f, unreadCount: 0 } : f
                  )
                );
              }}
              className={`relative hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-2 rounded-md text-left ${
                selectedFriend?.email === friend.email ? 'bg-zinc-300 dark:bg-zinc-700 font-semibold' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <UserAvatar
                  profileImage={friend.profileImage}
                  userStatus={friend.userStatus}
                  color={friend.color}
                  size={36}
                  badgeOffsetX={-3}
                  badgeOffsetY={-3}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-black dark:text-white">
                    {friend.nickname}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {friend.lastMessage?.content || `#${friend.tag}`}
                  </span>
                </div>
                {(friend.unreadCount ?? 0) > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full">
                    {friend.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
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
                        const socket = getSocket();
                        if (email) {
                          socket.emit('logout', email);
                        }

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

      <main className="flex h-screen">
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

          <div className="flex flex-col space-y-2 px-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
           {dmList.map((friend) => (
            <button
              key={friend.email}
              onClick={() => {
                setSelectedFriend(friend);
                setMode('dm');

                // unreadCount 바로 0으로 처리
                setDmList((prevList) =>
                  prevList.map((f) =>
                    f.email === friend.email ? { ...f, unreadCount: 0 } : f
                  )
                );
              }}
              className={`relative hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-2 rounded-md text-left ${
                selectedFriend?.email === friend.email ? 'bg-zinc-300 dark:bg-zinc-700 font-semibold' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <UserAvatar
                  profileImage={friend.profileImage}
                  userStatus={friend.userStatus}
                  color={friend.color}
                  size={36}
                  badgeOffsetX={-3}
                  badgeOffsetY={-3}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-black dark:text-white">
                    {friend.nickname}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {friend.lastMessage?.content || `#${friend.tag}`}
                  </span>
                </div>
                {(friend.unreadCount ?? 0) > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full">
                    {friend.unreadCount}
                  </span>
                )}
              </div>
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
        <section className={`flex-1 min-h-screen p-6 overflow-y-auto ${mode === 'dm' ? 'pt-0' : 'pt-20 md:pt-6'}`}>
          <RightPanel setSelectedFriend={setSelectedFriend} mode={mode} setMode={setMode} selectedFriend={selectedFriend} pendingCount={pendingCount} setPendingCount={setPendingCount}/>
        </section>
      </main>
    </>
  );
}