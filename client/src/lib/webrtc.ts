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
  peer = new RTCPeerConnection();
  peer.oniceconnectionstatechange = () => {
    console.log("ICE 상태:", peer?.iceConnectionState);
  };
  const remoteStream = new MediaStream();
  peer.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
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
