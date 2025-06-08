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
import { clearStoredOffer } from "./webrtcOfferStore";

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

    const prev = getPeer();
    if (prev) {
      prev.close();
      setPeer(null);
    }
    await clearLocalStream();
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

    // ✅ 마이크 연결
    const localStream = await getLocalStream();
    localStream.getTracks().forEach((track) => {
      peer.addTrack(track, localStream);
    });

    setPeer(peer);

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

export const initOfferConnection = async ({
  socket,
  target,
  onRemoteStream,
  onConnected,
}: {
  socket: any;
  target: string;
  onRemoteStream: (stream: MediaStream) => void;
  onConnected?: () => void;
}) => {
  const prev = getPeer();
  if (prev) {
    prev.close();
    setPeer(null);
  }
  await clearLocalStream();
  const iceCandidates: RTCIceCandidate[] = [];
  let offerSent = false;

  const peer = createPeerConnection({
    onRemoteStream,
    onIceConnectionStateChange: (state) => {
      if (state === "connected" || state === "completed") {
        console.log("🎉 연결 성공");
        onConnected?.();
      }
    },
  });

  const localStream = await getLocalStream();
  localStream.getTracks().forEach((track) => {
    peer.addTrack(track, localStream);
  });
  setPeer(peer);
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      iceCandidates.push(event.candidate);
    } else if (!offerSent) {
      offerSent = true;
      socket.emit("webrtc:offer", {
        to: target,
        offer: peer.localDescription,
        candidates: iceCandidates,
      });
    }
  };

  peer.onicegatheringstatechange = () => {
    console.log("🌐 ICE gathering state:", peer.iceGatheringState);
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

  setTimeout(() => {
    if (!offerSent) {
      offerSent = true;
      socket.emit("webrtc:offer", {
        to: target,
        offer: peer.localDescription,
        candidates: iceCandidates,
      });
    }
  }, 3000);

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
};

// lib/webrtc/initAnswerConnection.ts
export const initAnswerConnection = async ({
  socket,
  saved,
}: {
  socket: any;
  saved: {
    from: string;
    offer: RTCSessionDescriptionInit;
    candidates?: RTCIceCandidateInit[];
  };
}) => {
  const prev = getPeer();
  if (prev) {
    prev.close();
    setPeer(null);
  }
  await clearLocalStream();
  const peer = createPeerConnection({
    onRemoteStream: (remoteStream) => {
      const audio = document.getElementById("remoteAudio") as HTMLAudioElement;
      if (audio) {
        audio.srcObject = remoteStream;
        audio.autoplay = true;
      }
    },
    onIceCandidate: (event) => {
      if (event.candidate) {
        console.log("📡 수신자 ICE 후보 생성됨:", event.candidate.candidate);
        socket.emit("webrtc:ice-candidate", {
          to: saved.from,
          candidate: event.candidate,
        });
      } else {
        console.log("✅ 수신자 ICE 후보 수집 완료");
      }
    },
    onIceConnectionStateChange: (state) => {
      console.log("📶 수신자 ICE 상태:", state);
      if (state === "connected" || state === "completed") {
        console.log("🎉 수신자 ICE 연결 성공");
      }
    },
  });

  const localStream = await getLocalStream();
  localStream.getTracks().forEach((track) => {
    peer.addTrack(track, localStream);
  });
  setPeer(peer);
  await peer.setRemoteDescription(new RTCSessionDescription(saved.offer));

  if (saved.candidates?.length) {
    for (const cand of saved.candidates) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn("❌ ICE 후보 추가 실패:", err);
      }
    }
  }

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit("webrtc:answer", {
    to: saved.from,
    answer,
  });

  clearStoredOffer();
};
