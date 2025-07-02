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
 * 화면 공유 스트림을 깔끔하게 정리한다.
 *
 * ─ `peer` :  현재 통화 중인 RTCPeerConnection (없어도 동작)
 * ─ `silent`: 이미 종료된 트랙에 대해 warning 로그를 숨길지 여부
 */
export const stopScreenShareStream = (
  peer?: RTCPeerConnection,
  { silent = false } = {}
) => {
  if (!screenStream) return;

  const log = (...args: any[]) => !silent && console.log(...args);
  log("🧹 화면 공유 스트림 정리");

  // 1) 먼저 peer-connection에서 화면공유 트랙을 비운다
  if (peer) {
    const sender = peer
      .getSenders()
      .find(
        (s) => s.track?.kind === "video" && s.track.label.includes("Screen")
      );
    if (sender) {
      sender
        .replaceTrack(null) // 같은 mid 유지 → 리모트가 바로 ‘ended’ 감지
        .catch((e) => log("replaceTrack 실패:", e));
      log("❎ sender.track 비움 완료");
    }
  }

  // 2) 로컬 스트림 트랙을 정리
  for (const track of screenStream.getTracks()) {
    if (track.readyState === "live") {
      track.stop(); // 시스템 권한 창 닫힘
    }
  }

  // 3) 전역 참조 제거
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
