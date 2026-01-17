"use client";

import { Player } from "@/lib/types";

interface PlayerListProps {
  players: Record<string, Player>;
  currentPlayerId: string | null;
  showSatisfied?: boolean;
}

export function PlayerList({ players, currentPlayerId, showSatisfied = false }: PlayerListProps) {
  const playerList = Object.values(players);

  if (playerList.length === 0) {
    return (
      <div className="text-gray-400 text-sm">No players yet...</div>
    );
  }

  return (
    <div className="space-y-2">
      {playerList.map((player) => (
        <div
          key={player.id}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg
            ${player.id === currentPlayerId ? "bg-blue-50 border border-blue-200" : "bg-gray-50"}
          `}
        >
          <div className="flex-1 flex items-center gap-2">
            <span className="font-medium text-gray-800">
              {player.name}
              {player.id === currentPlayerId && (
                <span className="text-gray-400 text-sm ml-1">(you)</span>
              )}
            </span>
            {player.isHost && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                Host
              </span>
            )}
          </div>
          {showSatisfied && (
            <span className={`text-lg ${player.satisfied ? "" : "opacity-30"}`}>
              {player.satisfied ? "✓" : "○"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
