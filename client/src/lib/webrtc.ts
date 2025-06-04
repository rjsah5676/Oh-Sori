let localStream: MediaStream | null = null;

export const getLocalStream = async (): Promise<MediaStream> => {
  if (localStream) return localStream;

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return localStream;
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

  const remoteStream = new MediaStream();
  peer.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
    onRemoteStream(remoteStream);
  };

  return peer;
};

export const getPeer = () => peer;
