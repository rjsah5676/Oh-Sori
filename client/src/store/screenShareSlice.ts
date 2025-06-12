import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ScreenShareState {
  isSharing: boolean;
  isPeerSharing: boolean;
  viewMode: "participants" | "broadcast";
}

const initialState: ScreenShareState = {
  isSharing: false,
  isPeerSharing: false,
  viewMode: "participants",
};

const screenShareSlice = createSlice({
  name: "screenShare",
  initialState,
  reducers: {
    startSharing(state) {
      state.isSharing = true;
      state.viewMode = "participants";
    },
    stopSharing(state) {
      state.isSharing = false;
      state.viewMode = "participants";
    },
    setViewMode(state, action: PayloadAction<"participants" | "broadcast">) {
      state.viewMode = action.payload;
    },
    setPeerSharing(state, action: PayloadAction<boolean>) {
      state.isPeerSharing = action.payload;
    },
  },
});

export const { startSharing, stopSharing, setViewMode, setPeerSharing } =
  screenShareSlice.actions;
export default screenShareSlice.reducer;
