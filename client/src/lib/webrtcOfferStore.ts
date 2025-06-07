interface OfferData {
  from: string;
  offer: RTCSessionDescriptionInit;
  candidates?: RTCIceCandidateInit[]; // ✅ 추가
}

export const storeOffer = (data: OfferData) => {
  sessionStorage.setItem("webrtc-offer", JSON.stringify(data));
};

export const getStoredOffer = (): OfferData | null => {
  const raw = sessionStorage.getItem("webrtc-offer");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearStoredOffer = () => {
  sessionStorage.removeItem("webrtc-offer");
};
