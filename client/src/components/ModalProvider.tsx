"use client";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { closeModal } from "@/store/modalSlice";
import { modalPromiseRef } from "@/lib/modalPromiseRef";

export default function ModalProvider() {
  const { isOpen, type, message } = useSelector(
    (state: RootState) => state.modal
  );
  const dispatch = useDispatch();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        modalPromiseRef.resolve(false);
        dispatch(closeModal());
      }
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    modalPromiseRef.resolve(true);
    dispatch(closeModal());
  };

  const handleCancel = () => {
    modalPromiseRef.resolve(false);
    dispatch(closeModal());
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white dark:bg-[#1e1e1e] text-black dark:text-white rounded-3xl p-6 w-[90%] max-w-sm shadow-2xl border border-zinc-100 dark:border-zinc-700 transition-all">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-3">알림</h3>
          <p className="text-sm leading-relaxed">{message}</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-sm text-white transition"
            onClick={handleConfirm}
          >
            확인
          </button>
          {type === "confirm" && (
            <button
              className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-sm text-black transition"
              onClick={handleCancel}
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
