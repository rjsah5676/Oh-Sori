import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FriendWithRoom {
  nickname: string;
  tag: string;
  email: string;
  profileImage?: string;
  color: string;
  roomId: string;
}

interface UIState {
  mode: 'friends' | 'dm' | 'shop' | 'add-friend';
  selectedFriend: FriendWithRoom | null;
}

const initialState: UIState = {
  mode: 'friends',
  selectedFriend: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<UIState['mode']>) => {
      state.mode = action.payload;
    },
    setSelectedFriend: (state, action: PayloadAction<FriendWithRoom | null>) => {
      state.selectedFriend = action.payload;
    },
    openDM: (state, action: PayloadAction<FriendWithRoom>) => {
      state.selectedFriend = action.payload;
      state.mode = 'dm';
    },
    clearUI: (state) => {
      state.selectedFriend = null;
      state.mode = 'friends';
    },
  },
});

export const { setMode, setSelectedFriend, openDM, clearUI } = uiSlice.actions;
export default uiSlice.reducer;
