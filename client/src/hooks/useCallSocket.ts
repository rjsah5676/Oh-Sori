import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useDispatch, useSelector } from 'react-redux';
import {
  startReCall,
  peerConnected,
  peerDisconnected,
  setIncomingCall,
  clearIncomingCall,
  peerEndedCall,
  startCall,
  clearCall,
} from '@/store/callSlice';
import { RootState } from '@/store/store';

export default function useCallSocket() {
  const dispatch = useDispatch();
  const myEmail = useSelector((state: RootState) => state.auth.user?.email) || '';

  const playSound = (src: string) => {
    const audio = new Audio(src);
    audio.play().catch((e) => console.warn('Audio play error:', e));
  };

  useEffect(() => {
    const socket = getSocket();

    if (myEmail) {
      socket.emit('register', myEmail);
    }

    socket.on('call:resume-success', (data) => {
      if (data && data.roomId) {
        dispatch(
          startReCall({
            isCaller: data.isCaller,
            roomId: data.roomId,
            startedAt: data.startedAt,
            callerEnded: data.callerEnded,
            calleeEnded: data.calleeEnded,
          })
        );
        playSound('/images/effect/join.ogg'); // 입장 사운드
      }
    });

    socket.on('call:incoming', ({ from, roomId, nickname, tag, profileImage, color }) => {
      dispatch(setIncomingCall({ from, roomId, nickname, tag, profileImage, color }));
      dispatch(startCall({ isCaller: false, roomId }));
    });

    socket.on('call:peer-connected', () => {
      dispatch(peerConnected());
      playSound('/images/effect/join.ogg'); // 입장 사운드
      window.dispatchEvent(new Event('stop-ringback'));
    });

    socket.on('call:peer-disconnected', () => {
      dispatch(peerDisconnected());
    });

    socket.on('call:end', () => {
      dispatch(peerEndedCall());
      dispatch(clearIncomingCall());
      playSound('/images/effect/exit.ogg'); // 퇴장 사운드
      window.dispatchEvent(new Event('stop-ringback'));
    });

    socket.on('call:reconn-success', (data) => {
      if (data && data.roomId) {
        dispatch(
          startReCall({
            isCaller: data.isCaller,
            roomId: data.roomId,
            startedAt: data.startedAt,
            callerEnded: data.callerEnded,
            calleeEnded: data.calleeEnded,
          })
        );
        playSound('/images/effect/join.ogg'); // 재입장 사운드
      }
    });

    socket.on('call:clear', () => {
      dispatch(clearCall());
      window.dispatchEvent(new Event('stop-ringback'));
    });

    return () => {
      socket.off('call:resume-success');
      socket.off('call:incoming');
      socket.off('call:peer-connected');
      socket.off('call:peer-disconnected');
      socket.off('call:end');
      socket.off('call:reconn-success');
      socket.off('call:clear');
    };
  }, [dispatch, myEmail]);
}
