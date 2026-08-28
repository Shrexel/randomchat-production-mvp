"use client";

import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-gray-50 dark:bg-gray-950 flex flex-col text-gray-800 dark:text-gray-100 transition-colors">
      <header className="flex-none bg-white dark:bg-gray-900 shadow-sm py-3 px-4 md:py-4 md:px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() =>
            router.push("/")
          }
          className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity"
        >
          RandomChat
        </button>

        <ThemeToggle />
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            {title}
          </h1>

          <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
            Last updated: {updated}
          </p>

          <div className="prose-legal space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
            {children}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center mt-6 text-sm">
          <a
            href="/terms"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Terms of Service
          </a>

          <a
            href="/privacy"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Privacy Policy
          </a>

          <a
            href="/community-guidelines"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Community Guidelines
          </a>
        </div>
      </div>

      <footer className="py-6 border-t border-gray-200 dark:border-gray-800 text-center text-gray-400 dark:text-gray-500 text-sm bg-white dark:bg-gray-900">
        <p>
          &copy; {new Date().getFullYear()} RandomChat. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
