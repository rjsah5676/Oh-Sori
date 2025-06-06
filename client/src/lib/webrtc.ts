let localStream: MediaStream | null = null;

export const getLocalStream = async (): Promise<MediaStream> => {
  if (localStream) return localStream;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return localStream;
  } catch (err) {
    console.error("❌ 마이크 접근 실패:", err);
    throw err;
  }
};

export const clearLocalStream = () => {
  localStream?.getTracks().forEach((track) => track.stop());
  localStream = null;
};

let peer: RTCPeerConnection | null = null;

export const createPeerConnection = (
  onRemoteStream: (stream: MediaStream) => void
): RTCPeerConnection => {
  peer = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:ohsori.my:3478",
        username: "ohsori",
        credential: "test1234",
      },
    ],
    iceTransportPolicy: "relay",
  });
  console.log("🌐 RTCPeerConnection 생성됨");

  peer.oniceconnectionstatechange = () => {
    console.log("ICE 연결 상태:", peer?.iceConnectionState);
    peer?.getStats().then((stats) => {
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
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("📡 ICE 후보 생성됨:", event.candidate.candidate);
    } else {
      console.log("❗ ICE 후보 수집 완료 (null)");
    }
  };
  const remoteStream = new MediaStream();
  peer.ontrack = (event) => {
    console.log("🎧 원격 스트림 수신됨:", event.streams);
    event.streams[0].getTracks().forEach((track) => {
      console.log("🔊 수신된 트랙:", track.kind);
      remoteStream.addTrack(track);
    });
    onRemoteStream(remoteStream);
  };

  return peer;
};

export const getPeer = (): RTCPeerConnection | null => peer;

export const setPeer = (p: RTCPeerConnection | null) => {
  peer = p;
};
