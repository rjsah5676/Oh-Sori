import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CallState {
  isCaller: boolean;
  isPeerConnected: boolean;
  startedAt: number;
  roomId: string | null;
  incomingCallFrom?: {
    from: string;
    roomId: string;
    nickname: string;
    tag: string;
    profileImage?: string;
    color?: string;
  } | null;
  callerEnded: boolean;
  calleeEnded: boolean;
}

const initialState: CallState = {
  isCaller: false,
  isPeerConnected: false,
  startedAt: 0,
  roomId: null,
  incomingCallFrom: null,
  callerEnded: true,
  calleeEnded: true,
};

export const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    startCall: (state, action: PayloadAction<{ isCaller: boolean; roomId: string }>) => {
      state.isCaller = action.payload.isCaller;
      state.roomId = action.payload.roomId;
      state.startedAt = Date.now();
      state.callerEnded = false;
      state.calleeEnded = true;
    },
    acceptCall: (state, action: PayloadAction<{ isCaller: boolean; roomId: string }>) => {
      state.isCaller = action.payload.isCaller;
      state.roomId = action.payload.roomId;
      state.startedAt = Date.now();
      state.callerEnded = false;
      state.calleeEnded = false;
    },
    startReCall: (
        state,
        action: PayloadAction<{
            isCaller: boolean;
            roomId: string;
            startedAt: number;
            callerEnded: boolean;
            calleeEnded: boolean;
        }>
        ) => {
        state.isCaller = action.payload.isCaller;
        state.roomId = action.payload.roomId;
        state.startedAt = action.payload.startedAt;
        state.callerEnded = action.payload.callerEnded;
        state.calleeEnded = action.payload.calleeEnded;
        },
    endCall: (state) => {
        if (state.isCaller) {
            state.callerEnded = true;
        } else {
            state.calleeEnded = true;
        }
        },
        peerEndedCall: (state) => {
        if (state.isCaller) {
            state.calleeEnded = true;
        } else {
            state.callerEnded = true;
        }
        },
    finalizeCall: (state) => {
        state.isCaller = false;
        state.isPeerConnected = false;
        state.startedAt = 0;
        state.roomId = null;
        state.callerEnded  = false;
        state.calleeEnded  = false;
        state.incomingCallFrom = null;
    },
    peerConnected: (state) => {
      state.isPeerConnected = true;
      state.calleeEnded = false;
    },
    peerDisconnected: (state) => {
      state.isPeerConnected = false;
    },
    setIncomingCall: (
        state,
        action: PayloadAction<{
            from: string;
            roomId: string;
            nickname: string;
            tag: string;
            profileImage?: string;
            color?: string;
        }>
        ) => {
        state.incomingCallFrom = action.payload;
    },
    clearIncomingCall: (state) => {
      state.incomingCallFrom = null;
    },
  },
});

export const { startReCall,startCall,acceptCall, endCall, peerConnected, peerDisconnected, setIncomingCall, clearIncomingCall,peerEndedCall,finalizeCall } = callSlice.actions;
export default callSlice.reducer;
