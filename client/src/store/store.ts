import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import userStatusReducer from './userStatusSlice';
import callReducer from './callSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    userStatus: userStatusReducer,
    call: callReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;