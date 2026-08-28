"use client";

import { useDarkMode } from "@/lib/useDarkMode";

export default function ThemeToggle() {
  const { isDark, toggle, ready } =
    useDarkMode();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      {!ready ? "🌓" : isDark ? "☀️" : "🌙"}
    </button>
  );
}