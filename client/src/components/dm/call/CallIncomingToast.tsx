"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { clearIncomingCall, acceptCall, clearCall } from "@/store/callSlice";
import { getSocket } from "@/lib/socket";
import { setSelectedFriend, setMode } from "@/store/uiSlice";
import UserAvatar from "@/components/UserAvatar";
import { Phone, PhoneOff } from "lucide-react";
import { getStoredOffer, clearStoredOffer } from "@/lib/webrtcOfferStore";
import { createPeerConnection, getLocalStream, setPeer } from "@/lib/webrtc";

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

      // 1. 서버에 수락 이벤트 알림
      socket.emit("call:accept", {
        to: incoming.from,
        roomId: incoming.roomId,
      });

      // 2. 상태 업데이트
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

      // 3. 저장된 offer 확인
      const saved = getStoredOffer();
      console.log("🗃️ 저장된 offer 확인:", saved);
      if (!saved) {
        console.warn("❌ 저장된 offer 없음");
        return;
      }

      // 4. PeerConnection 생성
      const peer = createPeerConnection((remoteStream) => {
        const audio = document.getElementById(
          "remoteAudio"
        ) as HTMLAudioElement;
        if (audio) {
          audio.srcObject = remoteStream;
          audio.autoplay = true;
        }
      });
      setPeer(peer);
      console.log("🌐 RTCPeerConnection 생성됨");

      // 5. 로컬 마이크 스트림 연결
      const localStream = await getLocalStream();
      console.log("🎙️ 로컬 스트림 가져옴:", localStream);
      localStream.getTracks().forEach((track) => {
        console.log("🎤 로컬 트랙 등록됨:", track.kind);
        peer.addTrack(track, localStream);
      });

      // 6. remote SDP 설정
      await peer.setRemoteDescription(new RTCSessionDescription(saved.offer));

      // 7. answer 생성 및 설정
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      // 8. ICE 후보 수집 및 전송
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("📡 ICE 후보 생성됨:", event.candidate.candidate);
          socket.emit("webrtc:ice-candidate", {
            to: saved.from,
            candidate: event.candidate,
          });
        } else {
          console.log("✅ ICE 후보 수집 완료");
        }
      };

      // 9. answer 전송
      socket.emit("webrtc:answer", {
        to: saved.from,
        answer,
      });

      // 10. 저장된 offer 정리
      clearStoredOffer();
    } catch (err) {
      console.error("❌ 통화 수락 처리 중 에러 발생:", err);
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
