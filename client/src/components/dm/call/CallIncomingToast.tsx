'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { clearIncomingCall,acceptCall } from '@/store/callSlice';
import { getSocket } from '@/lib/socket';
import UserAvatar from '@/components/UserAvatar';

export default function CallIncomingToast() {
  const call = useSelector((state: RootState) => state.call);
  const dispatch = useDispatch();
  const socket = getSocket();

  const incoming = call.incomingCallFrom;
  if (!incoming) return null;

  const handleAccept = () => {
    socket.emit('call:accept', { to: incoming.from, roomId: incoming.roomId });
    dispatch(acceptCall({ isCaller: false, roomId: incoming.roomId }));
    dispatch(clearIncomingCall());
    socket.emit('joinRoom', incoming.roomId); 
    localStorage.setItem('activeCallRoomId', incoming.roomId);
  };

  const handleDecline = () => {
    dispatch(clearIncomingCall());
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-zinc-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-4 animate-slide-in">
    <UserAvatar
        profileImage={incoming.profileImage}
        color={incoming.color}
        userStatus="online"
        size={40}
    />
    <div className="text-sm">
        <strong>{incoming.nickname}#{incoming.tag}</strong> 님의 통화 요청
    </div>
    <button
        onClick={handleAccept}
        className="text-sm bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
    >
        수락
    </button>
    <button
        onClick={handleDecline}
        className="text-sm bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
    >
        거절
    </button>
    </div>
  );
}