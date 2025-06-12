import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { getPeer } from "@/lib/webrtc";
import { storeOffer } from "@/lib/webrtcOfferStore";

export default function useWebRTCConnection() {
  useEffect(() => {
    const socket = getSocket();
    const pendingCandidates: RTCIceCandidate[] = [];
    let remoteDescSet = false;

    socket.on("webrtc:offer", ({ from, offer, candidates }) => {
      console.log("📩 offer 수신함:", from, offer);
      storeOffer({ from, offer, candidates }); // ✅ candidates까지 저장
    });

    socket.on("webrtc:answer", async ({ answer }) => {
      const peer = getPeer();
      console.log("answer1");
      if (!peer) return;
      console.log("answer2");

      if (peer.signalingState === "have-local-offer") {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(answer));
          remoteDescSet = true;
          console.log("📡 answer 설정 완료, ICE 후보 적용 시작");

          for (const candidate of pendingCandidates) {
            try {
              await peer.addIceCandidate(candidate);
              console.log("✅ 큐에서 ICE 후보 추가됨:", candidate);
            } catch (err) {
              console.warn("❌ 큐 ICE 추가 실패:", err);
            }
          }
          pendingCandidates.length = 0;
        } catch (err) {
          console.warn("❌ Answer 설정 실패:", err);
        }
      } else {
        console.warn("⚠️ setRemoteDescription skipped:", peer.signalingState);
      }
    });

    socket.on("webrtc:ice-candidate", async ({ from, candidate }) => {
      console.log("ice1");
      const peer = getPeer();
      if (!peer) return;

      const iceCandidate = new RTCIceCandidate(candidate);

      if (!remoteDescSet) {
        console.log("🕒 ICE 후보 큐에 저장됨:", iceCandidate);
        pendingCandidates.push(iceCandidate);
      } else {
        try {
          console.log("ice2");
          await peer.addIceCandidate(iceCandidate);
          console.log("✅ ICE 후보 바로 추가됨:", iceCandidate);
        } catch (err) {
          console.warn("❌ ICE 후보 추가 실패:", err);
        }
      }
    });
    socket.on("webrtc:renegotiate-offer", async ({ from, offer }) => {
      const peer = getPeer();
      if (!peer) return;
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("webrtc:renegotiate-answer", { to: from, answer });
    });
    socket.on("webrtc:renegotiate-answer", async ({ answer }) => {
      const peer = getPeer();
      if (!peer) return;
      await peer.setRemoteDescription(answer);
      console.log("📺 화면 공유 트랙 재협상 완료");
    });
    return () => {
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice-candidate");
      socket.off("webrtc:renegotiate-answer");
      socket.off("webrtc:renegotiate-offer");
    };
  }, []);
}
