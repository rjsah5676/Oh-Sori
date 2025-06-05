import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { getPeer } from "@/lib/webrtc";
import { storeOffer } from "@/lib/webrtcOfferStore";

export default function useWebRTCConnection() {
  useEffect(() => {
    const socket = getSocket();

    socket.on("webrtc:offer", ({ from, offer }) => {
      storeOffer({ from, offer });
    });

    socket.on("webrtc:answer", async ({ answer }) => {
      const peer = getPeer();
      if (!peer) return;

      if (peer.signalingState === "have-local-offer") {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.warn("❌ Answer 설정 실패:", err);
        }
      } else {
        console.warn("⚠️ setRemoteDescription skipped:", peer.signalingState);
      }
    });

    socket.on("webrtc:ice-candidate", async ({ candidate }) => {
      const peer = getPeer();
      if (!peer) return;

      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("❌ ICE 후보 추가 실패:", err);
      }
    });

    return () => {
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice-candidate");
    };
  }, []);
}
