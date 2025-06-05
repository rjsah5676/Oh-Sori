import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ✅ 타입 정의
export type StatusType = 'online' | 'offline' | 'away' | 'dnd' | null;

interface UserStatusState {
  statuses: Record<string, StatusType>; // email → status
}

const initialState: UserStatusState = {
  statuses: {},
};

const userStatusSlice = createSlice({
  name: 'userStatus',
  initialState,
  reducers: {
    // ✅ 한 명 상태 업데이트
    setStatus: (state, action: PayloadAction<{ email: string; status: StatusType }>) => {
      const { email, status } = action.payload;
      state.statuses[email] = status;
    },

    // ✅ 여러 명 상태 한 번에 업데이트
    setStatusesBulk: (state, action: PayloadAction<Record<string, StatusType>>) => {
      state.statuses = {
        ...state.statuses,
        ...action.payload,
      };
    },

    // ✅ 전체 초기화 (선택사항)
    resetStatuses: (state) => {
      state.statuses = {};
    },
  },
});

export const { setStatus, setStatusesBulk, resetStatuses } = userStatusSlice.actions;
export default userStatusSlice.reducer;
