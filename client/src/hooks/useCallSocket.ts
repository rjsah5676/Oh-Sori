import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
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
import { stopRingback } from "@/lib/ringbackManager";
import { clearLocalStream } from "@/lib/webrtc";
import useModalConfirm from "./useModalConfirm";
import { initOfferConnection, initAnswerConnection } from "@/lib/callUtils";
import { waitForOffer } from "@/lib/webrtcOfferStore";
import { getSocket } from "@/lib/socket";
import { setMicActive } from "@/store/micActivitySlice";
import { getLocalStream } from "@/lib/webrtc";
import { startMicActivity } from "@/lib/micActivityManager";

export default function useCallSocket() {
  const { alert } = useModalConfirm();
  const dispatch = useDispatch();
  const myEmail =
    useSelector((state: RootState) => state.auth.user?.email) || "";
  const roomId = useSelector((state: RootState) => state.call.roomId);
  const call = useSelector((state: RootState) => state.call);
  const isCallOngoing =
    call.callerEnded === false && call.calleeEnded === false;
  const socket = getSocket();

  const playSound = async (src: string) => {
    try {
      const audio = new Audio(src);
      await audio.play();
    } catch (err) {
      console.warn("🔇 Audio play error:", err);
    }
  };

  useEffect(() => {
    if (!myEmail) return;

    const resumeHandler = async (data: any) => {
      const { roomId, target, resumedBy } = data;
      if (!roomId || !target || !resumedBy || !myEmail) return;

      const isSelf = resumedBy === myEmail;

      const isWebRTC = !data.calleeEnded && !data.callerEnded;
      if (isSelf) {
        console.log("🎧 내가 재참여함");
        dispatch(startReCall(data));
        await playSound("/images/effect/join.ogg");
        if (isWebRTC)
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
        socket.emit("voice:sync", { roomId, to: target });
      } else {
        if (isWebRTC) {
          await clearLocalStream();
          console.log("📥 상대방이 재참여함, offer 대기...");
          const saved = await waitForOffer();
          if (!saved) {
            console.warn("❌ 3초 내 offer 수신 실패. 연결 보류.");
            return;
          }
          await initAnswerConnection({ socket, saved });
        }
      }
    };

    // ✅ 먼저 기존 핸들러 제거 (동일한 콜백이어야 함)
    socket.off("call:resume-success", resumeHandler);
    socket.on("call:resume-success", resumeHandler);

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
      console.log("reconn");
      const { roomId } = data;
      if (!roomId) return;
      dispatch(startReCall(data));
      playSound("/images/effect/join.ogg");
      stopRingback();
      if (myEmail !== data.rejoiner) {
        await clearLocalStream();
        console.log("📥 상대방이 재참여함, offer 대기...");
        const saved = await waitForOffer();
        if (!saved) {
          console.warn("❌ 3초 내 offer 수신 실패. 연결 보류.");
          return;
        }
        await initAnswerConnection({ socket, saved });
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
    socket.on("voice:active", ({ email }) => {
      console.log("active");
      dispatch(setMicActive({ email, active: true }));
    });
    socket.on("voice:inactive", ({ email }) => {
      dispatch(setMicActive({ email, active: false }));
    });
    return () => {
      socket.off("call:resume-success", resumeHandler);
      socket.off("call:incoming");
      socket.off("call:peer-connected");
      socket.off("call:peer-disconnected");
      socket.off("call:end");
      socket.off("call:reconn-success");
      socket.off("call:clear");
      socket.off("call:re-clear");
      socket.off("call:busy");
      socket.off("voice:active");
      socket.off("voice:inactive");
    };
  }, [myEmail]);
  useEffect(() => {
    if (!myEmail || !roomId || !isCallOngoing) return;

    let cleanup: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    timeoutId = setTimeout(() => {
      getLocalStream()
        .then((stream) => {
          if (!stream.active || stream.getAudioTracks().length === 0) {
            return;
          }

          cleanup = startMicActivity({
            email: myEmail,
            roomId,
            stream,
          });
        })
        .catch(console.error);
    }, 1000); // ⏱ 1초 딜레이 후 실행

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (cleanup) cleanup();
    };
  }, [myEmail, roomId, isCallOngoing]);
}
