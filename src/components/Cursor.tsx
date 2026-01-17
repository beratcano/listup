"use client";

import { PlayerCursor } from "@/lib/types";

interface CursorProps {
  cursor: PlayerCursor;
}

export function Cursor({ cursor }: CursorProps) {
  return (
    <div
      className="pointer-events-none fixed z-50 transition-all duration-75 ease-out"
      style={{
        left: cursor.position.x,
        top: cursor.position.y,
        transform: "translate(-2px, -2px)",
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
      >
        <path
          d="M5 3L19 12L12 13L9 20L5 3Z"
          fill={cursor.playerColor}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* Dragged card or name label */}
      {cursor.draggingItem ? (
        <div
          className="absolute left-5 top-5 px-4 py-3 rounded-xl shadow-lg border-2 min-w-[120px] max-w-[200px]"
          style={{
            backgroundColor: "white",
            borderColor: cursor.playerColor,
          }}
        >
          <div
            className="text-xs font-medium mb-1"
            style={{ color: cursor.playerColor }}
          >
            {cursor.playerName}
          </div>
          <div className="text-sm font-medium text-gray-800 truncate">
            {cursor.draggingItem}
          </div>
        </div>
      ) : (
        <div
          className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: cursor.playerColor }}
        >
          {cursor.playerName}
        </div>
      )}
    </div>
  );
}
