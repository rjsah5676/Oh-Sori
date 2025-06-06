import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useDispatch, useSelector } from "react-redux";
import {
  startReCall,
  peerConnected,
  peerDisconnected,
  setIncomingCall,
  clearIncomingCall,
  peerEndedCall,
  startCall,
  clearCall,
} from "@/store/callSlice";
import { RootState } from "@/store/store";
import { stopRingback } from "@/lib/ringbackManager";
import {
  clearLocalStream,
  getLocalStream,
  createPeerConnection,
  getPeer,
} from "@/lib/webrtc";
import useModalConfirm from "./useModalConfirm";

export default function useCallSocket() {
  const { alert } = useModalConfirm();
  const dispatch = useDispatch();
  const myEmail =
    useSelector((state: RootState) => state.auth.user?.email) || "";

  const playSound = (src: string) => {
    const audio = new Audio(src);
    audio.play().catch((e) => console.warn("Audio play error:", e));
  };

  useEffect(() => {
    const socket = getSocket();

    if (myEmail) {
      socket.emit("register", myEmail);
    }

    const setupPeer = async () => {
      const peer = createPeerConnection((remoteStream) => {
        const audio = document.getElementById(
          "remoteAudio"
        ) as HTMLAudioElement;
        if (audio) audio.srcObject = remoteStream;
      });

      const stream = await getLocalStream();
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });
    };

    socket.on("call:resume-success", async (data) => {
      if (data?.roomId) {
        dispatch(startReCall(data));
        await setupPeer();
        playSound("/images/effect/join.ogg");
      }
    });

    socket.on(
      "call:incoming",
      ({ from, roomId, nickname, tag, profileImage, color }) => {
        dispatch(
          setIncomingCall({ from, roomId, nickname, tag, profileImage, color })
        );
        dispatch(startCall({ isCaller: false, roomId }));
      }
    );

    socket.on("call:peer-connected", () => {
      dispatch(peerConnected());
      playSound("/images/effect/join.ogg");
      stopRingback();
    });

    socket.on("call:peer-disconnected", () => {
      dispatch(peerDisconnected());
    });

    socket.on("call:end", () => {
      dispatch(peerEndedCall());
      dispatch(clearIncomingCall());
      playSound("/images/effect/exit.ogg");
      stopRingback();
    });

    socket.on("call:reconn-success", async (data) => {
      const { roomId, rejoiner } = data;
      if (!roomId) return;

      dispatch(startReCall(data));

      if (myEmail === rejoiner) {
        await setupPeer(); // ✅ 재참여자만 PeerConnection 다시 생성
        playSound("/images/effect/join.ogg");
      }
    });

    socket.on("call:clear", () => {
      dispatch(clearCall());
      stopRingback();
      clearLocalStream();
    });

    socket.on("call:re-clear", () => {
      dispatch(clearCall());
      stopRingback();
      playSound("/images/effect/exit.ogg");
      clearLocalStream();
    });

    socket.on("call:busy", () => {
      alert("상대방이 현재 통화 중입니다.");
      dispatch(clearCall());
      stopRingback();
      clearLocalStream();
    });

    return () => {
      socket.off("call:resume-success");
      socket.off("call:incoming");
      socket.off("call:peer-connected");
      socket.off("call:peer-disconnected");
      socket.off("call:end");
      socket.off("call:reconn-success");
      socket.off("call:clear");
      socket.off("call:re-clear");
      socket.off("call:busy");
    };
  }, [dispatch, myEmail]);
}
