const pendingCandidates: RTCIceCandidateInit[] = [];

export const queuePendingCandidate = (candidate: RTCIceCandidateInit) => {
  pendingCandidates.push(candidate);
};

export const flushPendingCandidates = async (peer: RTCPeerConnection) => {
  for (const c of pendingCandidates) {
    try {
      await peer.addIceCandidate(new RTCIceCandidate(c));
    } catch (err) {
      console.warn("❌ ICE 추가 실패", err);
    }
  }
  pendingCandidates.length = 0; // flush
};
