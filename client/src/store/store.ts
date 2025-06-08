// src/store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import userStatusReducer from "./userStatusSlice";
import callReducer from "./callSlice";
import uiReducer, { initialState as uiInitialState } from "./uiSlice";
import modalReducer from "./modalSlice";
import { loadUIState, saveUIState } from "./reload/localStorage";

const loadedUI = loadUIState();
const preloadedState = {
  ui: loadedUI ?? uiInitialState,
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    userStatus: userStatusReducer,
    call: callReducer,
    ui: uiReducer,
    modal: modalReducer,
  },
  preloadedState,
});

let prevUIState = store.getState().ui;
store.subscribe(() => {
  const currentUIState = store.getState().ui;
  if (currentUIState !== prevUIState) {
    saveUIState(currentUIState);
    prevUIState = currentUIState;
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
