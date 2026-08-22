"use client";

import { useRouter } from "next/navigation";

export default function VideoChatPage() {
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

      <div className="flex-grow max-w-6xl w-full mx-auto p-6">
        <h2 className="text-3xl font-bold text-center mb-8">
          📹 Video Chat
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Stranger Video */}
          <div className="bg-black rounded-2xl aspect-video flex items-center justify-center text-white">
            <p className="text-xl">Stranger Video</p>
          </div>

          {/* Your Video */}
          <div className="bg-gray-900 rounded-2xl aspect-video flex items-center justify-center text-white">
            <p className="text-xl">Your Camera</p>
          </div>

        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <button className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold">
            Start Video Chat
          </button>

          <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">
            Next
          </button>

          <button className="bg-gray-700 text-white px-6 py-3 rounded-xl font-bold">
            Mute
          </button>

          <button className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold">
            Report
          </button>
        </div>
      </div>
    </main>
  );
}