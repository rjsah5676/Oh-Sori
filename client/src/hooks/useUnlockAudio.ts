import { useEffect } from 'react';

/**
 * 브라우저의 자동 재생 정책 우회를 위한 오디오 언락 훅
 * 최초 클릭 시 조용한 오디오를 재생해 사용자 상호작용 조건 충족
 */
export default function useUnlockAudio() {
  useEffect(() => {
    const unlockAudio = () => {
      const audio = new Audio();
      audio.muted = true; // 🔇 무음
      audio.play().catch(() => {});
      document.removeEventListener('click', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    return () => {
      document.removeEventListener('click', unlockAudio);
    };
  }, []);
}