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

    const peer = createPeerConnection({
      onRemoteStream: (remoteStream) => {
        const audio = document.getElementById(
          "remoteAudio"
        ) as HTMLAudioElement;
        if (audio) audio.srcObject = remoteStream;
      },
      onIceCandidate: (event) => {
        if (event.candidate) {
          console.log("📡 발신자 ICE 후보 생성됨:", event.candidate.candidate);
          socket.emit("webrtc:ice-candidate", {
            to: target,
            candidate: event.candidate,
          });
        }
      },
      onIceConnectionStateChange: (state) => {
        if (state === "connected" || state === "completed") {
          console.log("🎉 WebRTC 연결 성공");
        } else if (state === "failed") {
          console.warn("❌ WebRTC 연결 실패");
        }
      },
    });

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
