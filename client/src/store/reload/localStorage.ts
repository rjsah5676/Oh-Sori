import { UIState } from "../uiSlice";

export const loadUIState = (): UIState | undefined => {
  try {
    const serialized = localStorage.getItem("uiState");
    if (!serialized) return undefined;
    return JSON.parse(serialized) as UIState;
  } catch (e) {
    console.warn("🔸 UI 상태 불러오기 실패", e);
    return undefined;
  }
};

export const saveUIState = (state: UIState) => {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem("uiState", serialized);
  } catch (e) {
    console.warn("🔸 UI 상태 저장 실패", e);
  }
};
