'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import DMHeader from './DMHeader';
import { getSocket } from '@/lib/socket';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import UserAvatar from '@/components/UserAvatar';

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const socket = getSocket();
  const myEmail = useSelector((state: RootState) => state.auth.user?.email) || '';
  const myProfileImage = useSelector((state: RootState) => state.auth.user?.profileImage);
  const myName = useSelector((state: RootState) => state.auth.user?.nickname) || '';

  const userStatus = useSelector(
    (state: RootState) => selectedFriend?.email ? state.userStatus.statuses[selectedFriend.email] : 'offline'
  );

  const [isMobile, setIsMobile] = useState(false);

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
        socket.emit('markAsRead', {
          roomId: selectedFriend.roomId,
          email: myEmail,
        });
      }

      setMessages((prev) => [...prev, msg]);
    };


    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [selectedFriend, myEmail]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedFriend?.email || !selectedFriend?.roomId) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/dms/messages?target=${encodeURIComponent(selectedFriend.email)}`,
          { credentials: 'include' }
        );
        const data = await res.json();
        if (res.ok) {
          setMessages(data.messages);

          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dms/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ roomId: selectedFriend.roomId }),
          });
        }
      } catch (err) {
        console.error('메시지 로딩 또는 읽음 처리 실패:', err);
      }
    };

    fetchMessages();
  }, [selectedFriend]);

  useLayoutEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="h-[90vh] md:h-[96vh] flex flex-col bg-white dark:bg-zinc-900">
      <div className="shrink-0">
        <DMHeader
          nickname={selectedFriend.nickname}
          tag={selectedFriend.tag}
          profileImage={selectedFriend.profileImage}
          color={selectedFriend.color}
          userStatus={userStatus || 'offline'}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {messages.map((msg, idx) => {
          const isMine = msg.sender === myEmail;
          return (
            <div
              key={msg._id || idx}
              className={`flex gap-3 flex-wrap items-start ${isMine ? 'flex-row-reverse' : ''}`}
            >
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
                  <span className="text-xs text-zinc-500">
                    {new Date(msg.createdAt).toLocaleString('ko-KR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>{' '}
                  {isMine ? myName : selectedFriend.nickname}
                </div>
                <div
                  className={`w-fit max-w-[80%] whitespace-pre-wrap break-words px-4 py-2 rounded-lg text-sm ${
                    isMine
                      ? 'bg-indigo-500 text-white self-end'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white self-start'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
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
