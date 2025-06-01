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
} from '@/store/callSlice';
import { RootState } from '@/store/store';

export default function useCallSocket() {
  const dispatch = useDispatch();
  const myEmail = useSelector((state: RootState) => state.auth.user?.email) || '';
  
  useEffect(() => {
    const socket = getSocket();
    const roomId = localStorage.getItem('activeCallRoomId');

    if (myEmail) {
        socket.emit('register', myEmail);
    }

  //  if (myEmail && roomId) {
       // socket.emit('call:resume', { roomId });
//    }

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
            //localStorage.setItem('activeCallRoomId', data.roomId);
        }
    });

    // ✅ 공통 이벤트 등록
    socket.on('call:incoming', ({ from, roomId, nickname, tag, profileImage, color }) => {
      dispatch(setIncomingCall({ from, roomId, nickname, tag, profileImage, color })); 
      dispatch(startCall({isCaller:false, roomId: roomId}));
      localStorage.setItem('activeCallRoomId', roomId);
    });

    socket.on('call:peer-connected', () => {
      dispatch(peerConnected());
    });

    socket.on('call:peer-disconnected', () => {
      dispatch(peerDisconnected());
    });

    socket.on('call:end', () => {
      dispatch(peerEndedCall());
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
        }
    });

    return () => {
      socket.off('call:resume-success');
      socket.off('call:incoming');
      socket.off('call:peer-connected');
      socket.off('call:peer-disconnected');
      socket.off('call:end');
      socket.off('call:reconn-success');
    };
  }, [dispatch, myEmail]);
}