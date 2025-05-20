"use client";
import { useLayoutEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark =
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);

    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  const toggleDarkMode = () => {
    if (isDark === null) return;
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  if (isDark === null) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={toggleDarkMode}
        className="bg-zinc-800 text-sm text-zinc-200 px-4 py-2 rounded-lg shadow hover:bg-zinc-700 transition"
      >
        {isDark ? "☀️ Light" : "🌙 Dark"}
      </button>
    </div>
  );
}
