import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface MicActivityState {
  activities: {
    [email: string]: boolean;
  };
  streamVersion: number;
}

const initialState: MicActivityState = {
  activities: {},
  streamVersion: 0,
};

const micActivitySlice = createSlice({
  name: "micActivity",
  initialState,
  reducers: {
    setMicActive(
      state,
      action: PayloadAction<{ email: string; active: boolean }>
    ) {
      state.activities[action.payload.email] = action.payload.active;
    },
    clearMicActivity(state) {
      state.activities = {};
    },
    incrementStreamVersion(state) {
      state.streamVersion += 1;
    },
    resetStreamVersion(state) {
      state.streamVersion = 0;
    },
  },
});

export const {
  setMicActive,
  clearMicActivity,
  incrementStreamVersion,
  resetStreamVersion,
} = micActivitySlice.actions;

export default micActivitySlice.reducer;
