import { useDispatch } from "react-redux";
import { showModal } from "@/store/modalSlice";
import { modalPromiseRef } from "@/lib/modalPromiseRef";

export default function useModalConfirm() {
  const dispatch = useDispatch();

  const confirm = (message: string) => {
    return new Promise<boolean>((resolve) => {
      modalPromiseRef.resolve = resolve;
      dispatch(showModal({ type: "confirm", message }));
    });
  };

  const alert = (message: string) => {
    return new Promise<void>((resolve) => {
      modalPromiseRef.resolve = () => resolve();
      dispatch(showModal({ type: "alert", message }));
    });
  };

  return { confirm, alert };
}
