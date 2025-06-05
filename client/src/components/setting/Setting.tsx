"use client";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { closeSetting } from "@/store/settingSlice";
import { settingPromiseRef } from "@/lib/settingPromiseRef";

export default function SettingProvider() {
  const { isOpen } = useSelector(
    (state: RootState) => state.setting
  );
  const dispatch = useDispatch();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        settingPromiseRef.resolve(false);
        dispatch(closeSetting());
      }
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    settingPromiseRef.resolve(true);
    dispatch(closeSetting());
  };

  const handleCancel = () => {
    settingPromiseRef.resolve(false);
    dispatch(closeSetting());
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white dark:bg-[#1e1e1e] text-black dark:text-white rounded-3xl p-6 w-[90%] max-w-sm shadow-2xl border border-zinc-100 dark:border-zinc-700 transition-all">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-3">알림</h3>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-sm text-white transition"
            onClick={handleConfirm}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
