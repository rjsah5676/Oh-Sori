import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface MicActivityState {
  [email: string]: boolean;
}

const initialState: MicActivityState = {};

const micActivitySlice = createSlice({
  name: "micActivity",
  initialState,
  reducers: {
    setMicActive(
      state,
      action: PayloadAction<{ email: string; active: boolean }>
    ) {
      state[action.payload.email] = action.payload.active;
    },
    clearMicActivity(state) {
      return {};
    },
  },
});

export const { setMicActive, clearMicActivity } = micActivitySlice.actions;
export default micActivitySlice.reducer;
