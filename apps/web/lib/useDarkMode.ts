"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "randomchat_theme";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored =
      localStorage.getItem(STORAGE_KEY);

    const prefersDark =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

    const dark = stored
      ? stored === "dark"
      : prefersDark;

    setIsDark(dark);

    document.documentElement.classList.toggle(
      "dark",
      dark
    );

    setReady(true);
  }, []);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;

      document.documentElement.classList.toggle(
        "dark",
        next
      );

      localStorage.setItem(
        STORAGE_KEY,
        next ? "dark" : "light"
      );

      return next;
    });
  };

  return { isDark, toggle, ready };
}
