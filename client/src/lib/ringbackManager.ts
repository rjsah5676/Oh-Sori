let ringbackAudio: HTMLAudioElement | null = null;
let ringbackTimeout: NodeJS.Timeout | null = null;

export const playRingback = (src = "/images/effect/caller.wav") => {
  stopRingback(); // 혹시라도 이전 연결음 있으면 제거
  ringbackAudio = new Audio(src);
  ringbackAudio.loop = true;
  ringbackAudio.play().catch(console.warn);

  ringbackTimeout = setTimeout(() => {
    stopRingback();
  }, 60000);
};

export const stopRingback = () => {
  if (ringbackAudio) {
    ringbackAudio.pause();
    ringbackAudio.currentTime = 0;
    ringbackAudio.src = "";
    ringbackAudio = null;
  } else {
    //
  }

  if (ringbackTimeout) {
    clearTimeout(ringbackTimeout);
    ringbackTimeout = null;
  }
};
