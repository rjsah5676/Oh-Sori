'use client';

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { clearIncomingCall, acceptCall, clearCall } from '@/store/callSlice';
import { getSocket } from '@/lib/socket';
import { setSelectedFriend, setMode } from '@/store/uiSlice';
import UserAvatar from '@/components/UserAvatar';
import { Phone, PhoneOff } from 'lucide-react';

export default function CallIncomingToast() {
  const call = useSelector((state: RootState) => state.call);
  const dispatch = useDispatch();
  const socket = getSocket();

  const incoming = call.incomingCallFrom;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!incoming) return;

    const audio = new Audio('/images/effect/callee.wav');
    audio.loop = true;
    audioRef.current = audio;

    audio.play().catch((e) => console.warn('Audio play error:', e));

    const timeout = setTimeout(() => {
        if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        }
    }, 60_000);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [incoming]);

  const playSound = (src: string) => {
    const audio = new Audio(src);
    audio.play().catch((e) => console.warn('Audio play error:', e));
  };

  if (!incoming) return null;
    const handleAccept = () => {
    playSound('/images/effect/join.ogg');
    socket.emit('call:accept', { to: incoming.from, roomId: incoming.roomId });
    dispatch(acceptCall({ isCaller: false, roomId: incoming.roomId }));
    dispatch(clearIncomingCall());

    dispatch(setSelectedFriend({
      nickname: incoming.nickname ?? '',
      tag: incoming.tag ?? '',
      email: incoming.from,
      profileImage: incoming.profileImage ?? '',
      color: incoming.color ?? '',
      roomId: incoming.roomId,
    }));
    dispatch(setMode('dm'));
    socket.emit('joinRoom', incoming.roomId);
  };

  const handleDecline = () => {
    socket.emit('call:clear', { roomId: incoming.roomId, to: incoming.from });
    dispatch(clearIncomingCall());
    dispatch(clearCall());
  };

return (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
    <div className="bg-zinc-800 text-white w-[300px] rounded-2xl shadow-xl py-6 px-4 flex flex-col items-center pointer-events-auto">
      <UserAvatar
        profileImage={incoming.profileImage}
        color={incoming.color}
        userStatus="online"
        size={72}
      />
      <div className="mt-4 text-lg font-semibold">{incoming.nickname}</div>
      <div className="text-sm text-zinc-400 mt-1">전화 수신 중...</div>
      <div className="flex gap-4 mt-6">
        <button
          onClick={handleAccept}
          className="w-12 h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center"
        >
          <Phone className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={handleDecline}
          className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center"
        >
          <PhoneOff className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  </div>
);
}
