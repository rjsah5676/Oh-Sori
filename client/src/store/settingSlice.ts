import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SettingState {
  isOpen: boolean;
}

const initialState: SettingState = {
  isOpen: false
};

export const settingSlice = createSlice({
  name: "setting",
  initialState,
  reducers: {
    showSetting: (state) => {
      state.isOpen = true;
    },
    closeSetting: () => initialState,
  },
});

export const { showSetting, closeSetting } = settingSlice.actions;
export default settingSlice.reducer;
