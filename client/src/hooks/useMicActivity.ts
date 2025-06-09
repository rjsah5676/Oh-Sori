import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { setMicActive } from "@/store/micActivitySlice";
import { getSocket } from "@/lib/socket";

export function useMicActivity({
  email,
  roomId,
  stream,
  enabled,
}: {
  email: string;
  roomId: string;
  stream: MediaStream | null;
  enabled: boolean;
}) {
  const dispatch = useDispatch();
  const socket = getSocket();
  const lastStateRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !enabled) return;

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);

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

      rafIdRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      audioContext.close();
      audioContextRef.current = null;
      dispatch(setMicActive({ email, active: false }));
      lastStateRef.current = false;
    };
  }, [stream, enabled, email, roomId]);
}
