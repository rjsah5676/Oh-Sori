import { setMicActive } from "@/store/micActivitySlice";
import { getSocket } from "@/lib/socket";
import { store } from "@/store/store"; // 리덕스 store 직접 import

interface StartMicActivityParams {
  email: string;
  roomId: string;
  stream: MediaStream;
}

export function startMicActivity({
  email,
  roomId,
  stream,
}: StartMicActivityParams) {
  const socket = getSocket();
  const dispatch = store.dispatch;

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  source.connect(analyser);

  const lastStateRef = { current: false };
  const VOLUME_THRESHOLD = 20;

  const tick = () => {
    analyser.getByteFrequencyData(dataArray);
    const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const isActive = volume > VOLUME_THRESHOLD;

    if (isActive !== lastStateRef.current) {
      lastStateRef.current = isActive;
      dispatch(setMicActive({ email, active: isActive }));
      socket.emit(isActive ? "voice:active" : "voice:inactive", {
        email,
        roomId,
      });
    }

    requestAnimationFrame(tick);
  };

  tick();

  return () => {
    audioContext.close();
    dispatch(setMicActive({ email, active: false }));
  };
}
