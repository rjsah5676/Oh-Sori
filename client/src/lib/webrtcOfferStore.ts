interface OfferData {
  from: string;
  offer: RTCSessionDescriptionInit;
}

const KEY = "webrtc-offer";

export const storeOffer = (data: OfferData) => {
  sessionStorage.setItem(KEY, JSON.stringify(data));
};

export const getStoredOffer = (): OfferData | null => {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearStoredOffer = () => {
  sessionStorage.removeItem(KEY);
};
