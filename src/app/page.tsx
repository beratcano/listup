"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomCode } from "@/lib/presets";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [joinAsSpectator, setJoinAsSpectator] = useState(false);

  const handleCreate = () => {
    if (!playerName.trim()) return;
    const roomCode = generateRoomCode();
    localStorage.setItem("listup-name", playerName.trim());
    localStorage.removeItem("listup-spectator");
    router.push(`/room/${roomCode}`);
  };

  const handleJoin = () => {
    if (!playerName.trim() || !joinCode.trim()) return;
    localStorage.setItem("listup-name", playerName.trim());
    if (joinAsSpectator) {
      localStorage.setItem("listup-spectator", "true");
    } else {
      localStorage.removeItem("listup-spectator");
    }
    router.push(`/room/${joinCode.toUpperCase().trim()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">List Up</h1>
          <p className="text-gray-500">Chaotic multiplayer ranking. No turns. No rules.</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {mode === "menu" && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-lg"
                maxLength={20}
              />
              <button
                onClick={() => playerName.trim() && setMode("create")}
                disabled={!playerName.trim()}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                Create Room
              </button>
              <button
                onClick={() => playerName.trim() && setMode("join")}
                disabled={!playerName.trim()}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 font-semibold rounded-xl transition-colors text-lg"
              >
                Join Room
              </button>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-4">
              <button
                onClick={() => setMode("menu")}
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
              >
                ← Back
              </button>
              <div className="text-center py-4">
                <p className="text-gray-500 mb-2">Creating room as</p>
                <p className="text-2xl font-bold text-gray-800">{playerName}</p>
              </div>
              <button
                onClick={handleCreate}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                Let&apos;s Go!
              </button>
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-4">
              <button
                onClick={() => setMode("menu")}
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
              >
                ← Back
              </button>
              <input
                type="text"
                placeholder="Enter room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-lg text-center font-mono tracking-widest"
                maxLength={6}
              />
              <label className="flex items-center gap-2 px-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={joinAsSpectator}
                  onChange={(e) => setJoinAsSpectator(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-500"
                />
                <span className="text-gray-600 text-sm">Join as spectator (watch only)</span>
              </label>
              <button
                onClick={handleJoin}
                disabled={joinCode.length < 4}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                {joinAsSpectator ? "Watch" : "Join"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Drag. Argue. Agree. Repeat.
        </p>
      </div>
    </div>
  );
}
