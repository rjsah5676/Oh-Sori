import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { createPeerConnection, getLocalStream, getPeer } from "@/lib/webrtc";
import { storeOffer } from "@/lib/webrtcOfferStore";

// 전역 ICE 후보 큐
const pendingCandidates: RTCIceCandidateInit[] = [];

export function flushPendingCandidates() {
  const peer = getPeer();
  if (!peer) return;

  pendingCandidates.forEach(async (candidate) => {
    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("❌ ICE 후보 추가 실패", err);
    }
  });
  pendingCandidates.length = 0;
}

export default function useWebRTCConnection() {
  useEffect(() => {
    const socket = getSocket();

    socket.on("webrtc:offer", ({ from, offer }) => {
      storeOffer({ from, offer }); // 이건 CallIncomingToast에서 사용
    });

    socket.on("webrtc:answer", async ({ answer }) => {
      const peer = getPeer();
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        flushPendingCandidates(); // ✅ answer 받은 쪽도 바로 처리
      }
    });

    socket.on("webrtc:ice-candidate", async ({ candidate }) => {
      const peer = getPeer();
      if (peer?.remoteDescription?.type) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("❌ ICE 후보 추가 실패", err);
        }
      } else {
        pendingCandidates.push(candidate); // 아직 remoteDescription 없으면 큐에 저장
      }
    });

    return () => {
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice-candidate");
    };
  }, []);
}
