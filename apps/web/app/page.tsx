"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const startTextChat = () => {
    router.push("/text");
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between border-b border-gray-200">
        <h1 className="text-3xl font-extrabold tracking-tighter text-blue-600">
          RandomChat
        </h1>

        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>

          <span className="text-sm text-gray-500 font-bold">
            Text Chat Available
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow flex flex-col md:flex-row max-w-6xl w-full mx-auto p-4 md:p-8 gap-8 items-center justify-center">

        {/* Left Column */}
        <div className="flex-1 w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            Talk to Strangers!
          </h2>

          <p className="text-gray-600 mb-8 leading-relaxed text-lg">
            Meet new people instantly. RandomChat connects you with strangers
            from around the world. No login, no tracking, just instant
            connections.
          </p>

          <div className="bg-orange-50 border-l-4 border-orange-400 p-5 rounded-r-xl">
            <h3 className="font-bold text-orange-900 text-md mb-2">
              Community Guidelines
            </h3>

            <ul className="text-sm text-orange-800 space-y-2 list-disc ml-5 font-medium">
              <li>Be respectful and kind to others.</li>
              <li>No inappropriate behavior, nudity, or harassment.</li>
              <li>Do not share your personal information.</li>
              <li>
                <strong>You must be 18+ to use this service.</strong>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 w-full flex flex-col items-center justify-center space-y-6">
          <h3 className="text-2xl font-bold text-gray-800 text-center">
            Start chatting now
          </h3>

          <div className="flex flex-col sm:flex-row w-full gap-4 max-w-md">

            {/* Text Chat Button */}
            <button
              onClick={startTextChat}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-8 px-4 rounded-2xl shadow-lg transition-transform transform hover:-translate-y-1 hover:shadow-xl flex flex-col items-center gap-2"
            >
              <span className="text-3xl">💬</span>
              Text Chat
            </button>

            {/* Locked Video Chat Button */}
            <button
              disabled
              className="flex-1 bg-gray-300 text-gray-500 text-xl font-bold py-8 px-4 rounded-2xl shadow-lg flex flex-col items-center gap-2 cursor-not-allowed opacity-80"
            >
              <span className="text-3xl">🔒</span>
              Video Chat

              <span className="text-sm font-medium">
                Coming Soon
              </span>
            </button>

          </div>

          <p className="text-sm text-gray-500 text-center">
            Video chat is currently under development.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-gray-200 text-center text-gray-400 text-sm bg-white">
        <p>
          &copy; {new Date().getFullYear()} RandomChat. All rights reserved.
        </p>
      </footer>
    </main>
  );
}