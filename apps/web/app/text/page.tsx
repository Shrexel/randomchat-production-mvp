"use client";

import { useRouter } from "next/navigation";

export default function TextChatPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between border-b border-gray-200">
        <h1 className="text-3xl font-extrabold text-blue-600">
          RandomChat
        </h1>

        <button
          onClick={() => router.push("/")}
          className="text-blue-600 font-bold hover:underline"
        >
          ← Back to Home
        </button>
      </header>

      <div className="flex-grow max-w-4xl w-full mx-auto p-6 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold mb-6">
          💬 Text Chat
        </h2>

        <div className="bg-white w-full rounded-2xl shadow-sm border p-6">
          <div className="h-80 border rounded-xl p-4 mb-4 overflow-y-auto">
            <p className="text-gray-500 text-center">
              Click Start Chat to find a stranger...
            </p>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 border rounded-xl px-4 py-3 outline-none"
            />

            <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">
              Send
            </button>
          </div>

          <div className="flex gap-3 mt-5">
            <button className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold">
              Start Chat
            </button>

            <button className="bg-gray-800 text-white px-5 py-3 rounded-xl font-bold">
              Next
            </button>

            <button className="bg-red-500 text-white px-5 py-3 rounded-xl font-bold">
              Report
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}