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

    setPeer(peer); // ✅ 반드시 저장

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

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    // ✅ offer 전송
    socket.emit("webrtc:offer", {
      to: target,
      offer,
    });

    // ✅ ICE 후보 전송
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:ice-candidate", {
          to: target,
          candidate: event.candidate,
        });
      }
    };

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

  // ✅ RTC 연결 해제
  const peer = getPeer();
  if (peer) {
    peer.close();
    setPeer(null);
  }

  clearLocalStream();
  dispatch(endCall());
  stopRingback();
};
