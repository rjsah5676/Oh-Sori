import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import userStatusReducer from "./userStatusSlice";
import callReducer from "./callSlice";
import uiReducer from "./uiSlice";
import modalReducer from "./modalSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    userStatus: userStatusReducer,
    call: callReducer,
    ui: uiReducer,
    modal: modalReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
