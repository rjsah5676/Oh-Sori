import { startCall, endCall } from "@/store/callSlice";
import { AppDispatch } from "@/store/store";
import { playRingback, stopRingback } from "@/lib/ringbackManager";
import {
  clearLocalStream,
  createPeerConnection,
  getLocalStream,
  getPeer,
  setPeer,
} from "@/lib/webrtc";

export const startVoiceCall = async ({
  socket,
  dispatch,
  caller,
  target,
  roomId,
  nickname,
  tag,
  profileImage,
  color,
}: {
  socket: any;
  dispatch: AppDispatch;
  caller: string;
  target: string;
  roomId: string;
  nickname: string;
  tag: string;
  profileImage?: string;
  color: string;
}) => {
  stopRingback();

  try {
    playRingback();

    // ✅ RTC 연결 시작
    const peer = createPeerConnection((remoteStream) => {
      const audioElem = document.getElementById(
        "remoteAudio"
      ) as HTMLAudioElement;
      if (audioElem) audioElem.srcObject = remoteStream;
    });

    // ✅ ICE 후보 콜백 등록 (반드시 가장 먼저)
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:ice-candidate", {
          to: target,
          candidate: event.candidate,
        });
      }
    };

    setPeer(peer);

    // ✅ 마이크 연결
    const localStream = await getLocalStream();
    const existingSenders = peer.getSenders();
    localStream.getTracks().forEach((track) => {
      const alreadyAdded = existingSenders.some(
        (sender) => sender.track === track
      );
      if (!alreadyAdded) {
        peer.addTrack(track, localStream);
      }
    });

    // ✅ offer 생성 → localDescription 설정 → 전송
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit("webrtc:offer", {
      to: target,
      offer,
    });

    // ✅ 상태 등록
    dispatch(startCall({ isCaller: true, roomId }));

    // ✅ 통화 요청 알림
    socket.emit("call:request", {
      to: target,
      roomId,
      from: caller,
      nickname,
      tag,
      profileImage,
      color,
    });
  } catch (err) {
    console.warn("[startVoiceCall] ❌ 오류 발생", err);
  }
};

export const endVoiceCall = ({
  socket,
  dispatch,
  roomId,
  targetEmail,
}: {
  socket: any;
  dispatch: AppDispatch;
  roomId: string;
  targetEmail: string;
}) => {
  if (!roomId || !targetEmail) return;

  socket.emit("call:end", {
    roomId,
    to: targetEmail,
  });

  const peer = getPeer();
  if (peer) {
    peer.close();
    setPeer(null);
  }

  clearLocalStream();
  dispatch(endCall());
  stopRingback();
};
