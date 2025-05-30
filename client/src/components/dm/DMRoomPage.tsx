'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import DMHeader from './DMHeader';
import { getSocket } from '@/lib/socket';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import UserAvatar from '@/components/UserAvatar';
import dayjs from 'dayjs';

interface FriendWithRoom {
  nickname: string;
  tag: string;
  email: string;
  profileImage?: string;
  color: string;
  userStatus?: 'online' | 'offline' | 'away' | 'dnd';
  roomId: string;
}

interface DMRoomPageProps {
  selectedFriend: FriendWithRoom | null;
}

interface Message {
  _id: string;
  roomId: string;
  sender: string;
  content: string;
  attachments?: { type: string; url: string; filename: string }[];
  isReadBy: string[];
  deletedBy: string[];
  createdAt: string;
}

export default function DMRoomPage({ selectedFriend }: DMRoomPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const MIN_FETCH_INTERVAL = 500;

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const socket = getSocket();
  const myEmail = useSelector((state: RootState) => state.auth.user?.email) || '';
  const myProfileImage = useSelector((state: RootState) => state.auth.user?.profileImage);
  const myName = useSelector((state: RootState) => state.auth.user?.nickname) || '';
  const userStatus = useSelector(
    (state: RootState) => selectedFriend?.email ? state.userStatus.statuses[selectedFriend.email] : 'offline'
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const handleReceiveMessage = (msg: Message) => {
      if (!selectedFriend || !myEmail) return;
      if (msg.roomId === selectedFriend.roomId) {
        socket.emit('markAsRead', { roomId: selectedFriend.roomId, email: myEmail });
      }
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      requestAnimationFrame(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    };

    socket.on('receiveMessage', handleReceiveMessage);
    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [selectedFriend, myEmail]);

  const fetchMessages = async (initial = false) => {
    if (!selectedFriend?.email || !selectedFriend?.roomId || isLoading || !hasMore) return;
    setIsLoading(true);
    const el = containerRef.current;
    const prevScrollHeight = el?.scrollHeight || 0;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dms/messages?target=${encodeURIComponent(
          selectedFriend.email
        )}&skip=${initial ? 0 : messages.length}&limit=20`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (res.ok) {
        if (data.messages.length < 20) setHasMore(false);
        setMessages((prev) => {
          const all = [...data.messages, ...prev];
          const unique = new Map(all.map((m) => [m._id, m]));
          return Array.from(unique.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
        if (!initial) {
          requestAnimationFrame(() => {
            if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
          });
        } else {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dms/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ roomId: selectedFriend.roomId }),
          });
        }
      }
    } catch (err) {
      console.error('메시지 로딩 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true);
  }, [selectedFriend]);

  useLayoutEffect(() => {
    if (!initialScrollDone && messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'auto' });
      setInitialScrollDone(true);
    }
  }, [messages, initialScrollDone]);

  const handleScroll = () => {
    const el = containerRef.current;
    const now = Date.now();
    if (!el) return;
    if (el.scrollTop < 100) {
      if (canLoadMore && hasMore && !isLoading && now - lastFetchTime > MIN_FETCH_INTERVAL) {
        setLastFetchTime(now);
        setCanLoadMore(false);
        fetchMessages(false);
      }
    } else {
      if (!canLoadMore) setCanLoadMore(true);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, selectedFriend, messages, lastFetchTime, canLoadMore]);

  const handleSend = () => {
    if (!input.trim() || !selectedFriend?.roomId) return;
    socket.emit('sendMessage', {
      roomId: selectedFriend.roomId,
      sender: myEmail,
      content: input.trim(),
      attachments: [],
    });
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '40px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  if (!selectedFriend) return null;

  const renderMessagesWithDateDividers = () => {
    let lastDate = '';
    return messages.map((msg) => {
      const isMine = msg.sender === myEmail;
      const dateStr = dayjs(msg.createdAt).format('YYYY-MM-DD');
      const showDivider = dateStr !== lastDate;
      lastDate = dateStr;

      return (
        <div key={`msg-${msg._id}`}>
          {showDivider && (
            <div className="w-full text-center text-xs text-zinc-500 py-2">
              <hr className="border-zinc-300 dark:border-zinc-700 mb-2" />
              {dayjs(msg.createdAt).format('YYYY년 M월 D일')}
              <hr className="border-zinc-300 dark:border-zinc-700 mt-2" />
            </div>
          )}

          <div key={msg._id} className={`flex gap-3 flex-wrap items-start ${isMine ? 'flex-row-reverse' : ''}`}>
            <UserAvatar
              profileImage={isMine ? myProfileImage : selectedFriend.profileImage}
              userStatus={isMine ? 'online' : userStatus || 'offline'}
              color={isMine ? undefined : selectedFriend.color}
              size={36}
              badgeOffsetX={-3}
              badgeOffsetY={-3}
            />
            <div className={`flex flex-col max-w-md min-w-0 ${isMine ? 'items-end' : 'items-start'}`}>
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                { isMine? 
                <>
                <span className="text-xs text-zinc-500">
                  {new Date(msg.createdAt).toLocaleString('ko-KR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>{' '}{myName}
                </>
                :
                <>
                  {selectedFriend.nickname}{' '}<span className="text-xs text-zinc-500">
                  {new Date(msg.createdAt).toLocaleString('ko-KR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
                </>
                }
              </div>
              <div
                className={`max-w-[180px] md:max-w-[320px] whitespace-pre-wrap break-words px-4 py-2 rounded-lg text-sm ${
                  isMine
                    ? 'bg-indigo-500 text-white self-end'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white self-start'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="h-[90vh] md:h-[96vh] flex flex-col bg-white dark:bg-zinc-900">
      <div className="shrink-0">
        <DMHeader {...selectedFriend} userStatus={userStatus || 'offline'} />
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {renderMessagesWithDateDividers()}
        <div ref={scrollRef} />
      </div>

      <div className="shrink-0 border-t px-3 py-3 flex items-end gap-2 bg-white dark:bg-zinc-900">
        <button
          className="w-9 h-9 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-white rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600"
          disabled
        >
          +
        </button>
        <textarea
          style={{ maxHeight: '120px' }}
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="메시지를 입력하세요"
          className="flex-1 resize-none overflow-hidden px-3 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm text-black dark:text-white border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {isMobile && (
          <button
            onClick={handleSend}
            className="px-3 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-sm"
          >
            보내기
          </button>
        )}
      </div>
    </div>
  );
}
