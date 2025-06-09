import { clearStoredOffer } from "./webrtcOfferStore";
import { store } from "@/store/store";
import { incrementStreamVersion } from "@/store/micActivitySlice";

let localStream: MediaStream | null = null;
let peer: RTCPeerConnection | null = null;

export const getLocalStream = async (): Promise<MediaStream> => {
  const needsNewStream =
    !localStream ||
    localStream.getAudioTracks().length === 0 ||
    localStream.getAudioTracks().some((track) => track.readyState !== "live");

  if (!needsNewStream) return localStream!;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    store.dispatch(incrementStreamVersion());
    return localStream;
  } catch (err) {
    console.error("❌ 마이크 접근 실패:", err);
    throw err;
  }
};
export const isLocalStreamValid = (): boolean => {
  return (
    localStream !== null &&
    localStream.getAudioTracks().length > 0 &&
    localStream.getAudioTracks().every((track) => track.readyState === "live")
  );
};

export const getLocalStreamUnsafe = (): MediaStream | null => {
  return localStream;
};
export const clearLocalStream = async () => {
  console.log("로컬 스트림 삭제");
  clearStoredOffer();
  localStream?.getTracks().forEach((track) => track.stop());
  localStream = null;
};

export const createPeerConnection = ({
  onRemoteStream,
  onIceCandidate,
  onIceConnectionStateChange,
}: {
  onRemoteStream: (stream: MediaStream) => void;
  onIceCandidate?: (event: RTCPeerConnectionIceEvent) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
}): RTCPeerConnection => {
  const newPeer = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:ohsori.my:3478?transport=udp",
        username: "ohsori",
        credential: "test1234",
      },
    ],
  });

  console.log("🌐 RTCPeerConnection 생성됨");

  // ✅ ICE 연결 상태 추적
  newPeer.oniceconnectionstatechange = () => {
    const state = newPeer.iceConnectionState;
    console.log("ICE 연결 상태:", state);
    onIceConnectionStateChange?.(state);

    newPeer.getStats().then((stats) => {
      const candidates: any = {};
      stats.forEach((report) => {
        if (
          report.type === "local-candidate" ||
          report.type === "remote-candidate"
        ) {
          candidates[report.id] = report;
        }
      });
      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          console.log("✅ 연결 성공 후보쌍");
          console.log(
            "↪️ 로컬:",
            candidates[report.localCandidateId]?.candidateType,
            candidates[report.localCandidateId]?.address
          );
          console.log(
            "↩️ 리모트:",
            candidates[report.remoteCandidateId]?.candidateType,
            candidates[report.remoteCandidateId]?.address
          );
        }
      });
    });
  };

  // ✅ ICE 후보 수집
  newPeer.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("📡 ICE 후보 생성됨:", event.candidate.candidate);
      onIceCandidate?.(event);
    } else {
      console.log("❗ ICE 후보 수집 완료 (null)");
    }
  };

  // ✅ 원격 트랙 수신
  const remoteStream = new MediaStream();
  newPeer.ontrack = (event) => {
    console.log("🎧 원격 스트림 수신됨:", event.streams);
    event.streams[0].getTracks().forEach((track) => {
      console.log("🔊 수신된 트랙:", track.kind);
      remoteStream.addTrack(track);
    });
    onRemoteStream(remoteStream);
  };

  return newPeer;
};

export const getPeer = (): RTCPeerConnection | null => peer;
export const setPeer = (p: RTCPeerConnection | null) => {
  peer = p;
};
