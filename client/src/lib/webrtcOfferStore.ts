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

export const waitForOffer = (
  timeout = 10000,
  interval = 100
): Promise<ReturnType<typeof getStoredOffer>> => {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const saved = getStoredOffer();
      if (saved) return resolve(saved);
      if (Date.now() - start >= timeout) return resolve(null);
      setTimeout(check, interval);
    };
    check();
  });
};
