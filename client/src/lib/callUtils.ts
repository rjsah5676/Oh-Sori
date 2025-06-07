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

    const iceCandidates: RTCIceCandidate[] = [];
    let offerSent = false;

    const peer = createPeerConnection({
      onRemoteStream: (remoteStream) => {
        const audio = document.getElementById(
          "remoteAudio"
        ) as HTMLAudioElement;
        if (audio) audio.srcObject = remoteStream;
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

    // ✅ ICE 후보 수집
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        iceCandidates.push(event.candidate);
      } else if (!offerSent) {
        offerSent = true;
        console.log("📡 ICE 후보 수집 완료 (null) → offer 전송");
        socket.emit("webrtc:offer", {
          to: target,
          offer: peer.localDescription,
          candidates: iceCandidates,
        });
      }
    };

    // ✅ ICE 수집 완료 상태 감지 (보완용)
    peer.onicegatheringstatechange = () => {
      if (peer.iceGatheringState === "complete" && !offerSent) {
        offerSent = true;
        console.log("📡 ICE 상태 complete → offer 전송");
        socket.emit("webrtc:offer", {
          to: target,
          offer: peer.localDescription,
          candidates: iceCandidates,
        });
      }
    };

    // ✅ 타임아웃 fallback (최후 방어)
    setTimeout(() => {
      if (!offerSent) {
        offerSent = true;
        console.log("⏰ ICE 수집 지연 → offer 강제 전송");
        socket.emit("webrtc:offer", {
          to: target,
          offer: peer.localDescription,
          candidates: iceCandidates,
        });
      }
    }, 3000);

    // ✅ offer 생성 → localDescription 설정
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

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
