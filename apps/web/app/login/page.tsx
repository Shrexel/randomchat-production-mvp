"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

function LoginCard() {
  const searchParams = useSearchParams();
  const [loading, setLoading] =
    useState(false);

  const callbackUrl =
    searchParams.get("callbackUrl") || "/";

  const handleGoogleSignIn = () => {
    setLoading(true);
    signIn("google", { callbackUrl });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8 md:p-10 w-full max-w-sm text-center">
      <div className="text-4xl mb-3">
        💬
      </div>

      <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Welcome to RandomChat
      </h1>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Sign in to unlock Premium matching — choose your gender and who you&apos;re looking for.
      </p>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path
            fill="#FFC107"
            d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
          />
          <path
            fill="#FF3D00"
            d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
          />
        </svg>

        {loading
          ? "Redirecting..."
          : "Continue with Google"}
      </button>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
        By continuing, you agree to our{" "}
        <a
          href="/terms"
          className="underline hover:text-blue-600 dark:hover:text-blue-400"
        >
          Terms
        </a>{" "}
        and{" "}
        <a
          href="/privacy"
          className="underline hover:text-blue-600 dark:hover:text-blue-400"
        >
          Privacy Policy
        </a>
        . You must be 18 or older.
      </p>
    </div>
  );
}

function LoginCardFallback() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8 md:p-10 w-full max-w-sm text-center">
      <div className="text-4xl mb-3">
      </div>

      <p className="text-sm text-gray-400 dark:text-gray-500">
        Loading...
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-gray-50 dark:bg-gray-950 flex flex-col text-gray-800 dark:text-gray-100 transition-colors">
      <header className="flex-none py-4 px-4 md:px-6 flex items-center justify-between">
        <a
          href="/"
          className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400"
        >
          RandomChat
        </a>

        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<LoginCardFallback />}>
          <LoginCard />
        </Suspense>
      </div>
    </main>
  );
}
