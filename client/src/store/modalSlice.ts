import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ModalState {
  isOpen: boolean;
  type: "alert" | "confirm";
  message: string;
}

const initialState: ModalState = {
  isOpen: false,
  type: "alert",
  message: "",
};

export const modalSlice = createSlice({
  name: "modal",
  initialState,
  reducers: {
    showModal: (state, action: PayloadAction<Omit<ModalState, "isOpen">>) => {
      state.isOpen = true;
      state.type = action.payload.type;
      state.message = action.payload.message;
    },
    closeModal: () => initialState,
  },
});

export const { showModal, closeModal } = modalSlice.actions;
export default modalSlice.reducer;
