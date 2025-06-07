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
import { initOfferConnection, initAnswerConnection } from "@/lib/callUtils";
import { waitForOffer } from "@/lib/webrtcOfferStore";

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
    socket.on("call:resume-success", async (data) => {
      console.log("resume-success");

      const { roomId, target, resumedBy } = data;

      if (!roomId || !target || !resumedBy || !myEmail) return;

      const isSelf = resumedBy === myEmail;

      if (isSelf) {
        console.log("실제잇");
        dispatch(startReCall(data));
        playSound("/images/effect/join.ogg");

        await initOfferConnection({
          socket,
          target,
          onRemoteStream: (stream) => {
            const audio = document.getElementById(
              "remoteAudio"
            ) as HTMLAudioElement;
            if (audio) {
              audio.srcObject = stream;
              audio.autoplay = true;
            }
          },
        });
      } else {
        console.log("반대잇");
        const saved = await waitForOffer();
        if (saved) {
          await initAnswerConnection({ socket, saved });
        } else {
          console.warn("❌ 3초 내 offer 수신 실패. 연결 보류.");
        }
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
      console.log("reconn-success");
      const { roomId, rejoiner } = data;
      if (!roomId) return;
      stopRingback();
      dispatch(startReCall(data));

      playSound("/images/effect/join.ogg");
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
