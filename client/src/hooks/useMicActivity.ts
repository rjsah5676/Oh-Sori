import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket"; // 소켓 인스턴스 가져오는 함수

interface MicActivityOptions {
  email: string;
  roomId: string;
  enabled: boolean; // 감지 켜짐 여부
}

export function useMicActivity(
  stream: MediaStream | null,
  { email, roomId, enabled }: MicActivityOptions
): boolean {
  const [active, setActive] = useState(false);
  const socket = getSocket();
  const lastStateRef = useRef(false); // 마지막 상태 기억

  useEffect(() => {
    if (!stream || !enabled) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);

    let rafId: number;
    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      const isActive = volume > 20;
      setActive(isActive);

      // 🔥 상태 변경 감지 시 emit
      if (isActive !== lastStateRef.current) {
        lastStateRef.current = isActive;
        socket.emit(isActive ? "voice:active" : "voice:inactive", {
          email,
          roomId,
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(rafId);
      audioContext.close();
      setActive(false);
      lastStateRef.current = false;
    };
  }, [stream, enabled, email, roomId]);

  return active;
}
