import { getSocket } from "./socket";
import { store } from "@/store/store";
import { stopSharing } from "@/store/screenShareSlice";

let screenStream: MediaStream | null = null;

export const getScreenStream = (): MediaStream | null => screenStream;

/**
 * 화면 공유 시작
 * @param withAudio - 화면 공유에 시스템 오디오 포함 여부 (기본: false)
 */
export const startScreenShareStream = async (
  withAudio = false
): Promise<MediaStream> => {
  if (
    screenStream &&
    screenStream.getVideoTracks().some((t) => t.readyState === "live")
  ) {
    console.log("🎥 이미 활성화된 화면 공유 stream 반환");
    return screenStream;
  }

  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: withAudio,
    });

    const screenTrack = screenStream.getVideoTracks()[0];
    if (screenTrack) {
      // ✅ 기존 리스너 제거 후 새로 등록 (중복 방지)
      screenTrack.removeEventListener("ended", onScreenShareEnded);
      screenTrack.addEventListener("ended", onScreenShareEnded);
    }

    console.log("✅ 화면 공유 stream 시작됨");
    return screenStream;
  } catch (err) {
    console.error("❌ 화면 공유 실패:", err);
    throw err;
  }
};

/**
 * 화면 공유 중단
 */
export const stopScreenShareStream = () => {
  if (!screenStream) return;

  console.log("🧹 화면 공유 스트림 정리");

  screenStream.getTracks().forEach((track) => {
    if (track.readyState === "live") {
      track.stop();
    }
  });

  screenStream = null;
};

/**
 * 사용자 수동 중단 시 자동 호출
 */
const onScreenShareEnded = () => {
  console.log("🛑 화면 공유 종료됨 (사용자 수동 중단)");

  const socket = getSocket();
  const state = store.getState();
  const selectedFriend = state.ui.selectedFriend;

  stopScreenShareStream();

  if (selectedFriend?.email) {
    socket.emit("screen:stopped", {
      to: selectedFriend.email,
      roomId: selectedFriend.roomId,
    });
  }

  store.dispatch(stopSharing());
};
