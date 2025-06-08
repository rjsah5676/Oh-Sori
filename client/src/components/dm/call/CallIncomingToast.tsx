"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { clearIncomingCall, acceptCall, clearCall } from "@/store/callSlice";
import { getSocket } from "@/lib/socket";
import { setSelectedFriend, setMode } from "@/store/uiSlice";
import UserAvatar from "@/components/UserAvatar";
import { Phone, PhoneOff } from "lucide-react";
import { clearStoredOffer, waitForOffer } from "@/lib/webrtcOfferStore";
import {
  createPeerConnection,
  getLocalStream,
  setPeer,
  getPeer,
  clearLocalStream,
} from "@/lib/webrtc";

export default function CallIncomingToast() {
  const call = useSelector((state: RootState) => state.call);
  const dispatch = useDispatch();
  const socket = getSocket();
  const incoming = call.incomingCallFrom;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!incoming) return;

    const audio = new Audio("/images/effect/callee.wav");
    audio.loop = true;
    audioRef.current = audio;

    audio.play().catch((e) => console.warn("Audio play error:", e));

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [incoming]);

  const playSound = (src: string) => {
    const audio = new Audio(src);
    audio.play().catch((e) => console.warn("Audio play error:", e));
  };

  const handleAccept = async () => {
    if (!incoming) return;

    try {
      playSound("/images/effect/join.ogg");

      // ✅ 1. UI/상태 먼저 진입 처리 (통화방 진입 느낌 우선)
      socket.emit("call:accept", {
        to: incoming.from,
        roomId: incoming.roomId,
      });

      dispatch(acceptCall({ isCaller: false, roomId: incoming.roomId }));
      dispatch(clearIncomingCall());

      dispatch(
        setSelectedFriend({
          nickname: incoming.nickname ?? "",
          tag: incoming.tag ?? "",
          email: incoming.from,
          profileImage: incoming.profileImage ?? "",
          color: incoming.color ?? "",
          roomId: incoming.roomId,
        })
      );
      dispatch(setMode("dm"));
      socket.emit("joinRoom", incoming.roomId);

      // ✅ 2. WebRTC 연결은 백그라운드에서 처리 (offer 3초까지 기다림)
      const saved = await waitForOffer();
      console.log("🗃️ 저장된 offer 확인:", saved);
      if (!saved) {
        console.warn("❌ 3초 내 offer 수신 실패. 연결 보류.");
        return;
      }
      await clearLocalStream();
      const prev = getPeer();
      if (prev) {
        prev.close();
        setPeer(null);
      }
      const peer = createPeerConnection({
        onRemoteStream: (remoteStream) => {
          const audio = document.getElementById(
            "remoteAudio"
          ) as HTMLAudioElement;
          if (audio) {
            audio.srcObject = remoteStream;
            audio.autoplay = true;
          }
        },
        onIceCandidate: (event) => {
          if (event.candidate) {
            console.log(
              "📡 수신자 ICE 후보 생성됨:",
              event.candidate.candidate
            );
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
    } catch (err) {
      console.error("❌ 통화 수락 처리 중 예외 발생:", err);
    }
  };

  const handleDecline = () => {
    if (!incoming) return;
    socket.emit("call:clear", { roomId: incoming.roomId, to: incoming.from });
    dispatch(clearIncomingCall());
    dispatch(clearCall());
  };

  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="bg-zinc-800 text-white w-[300px] rounded-2xl shadow-xl py-6 px-4 flex flex-col items-center pointer-events-auto">
        <UserAvatar
          profileImage={incoming.profileImage}
          color={incoming.color}
          userStatus="online"
          size={72}
        />
        <div className="mt-4 text-lg font-semibold">{incoming.nickname}</div>
        <div className="text-sm text-zinc-400 mt-1">전화 수신 중...</div>
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleAccept}
            className="w-12 h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center"
          >
            <Phone className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleDecline}
            className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center"
          >
            <PhoneOff className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
