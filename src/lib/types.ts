// Shared types between client and server

export interface Player {
  id: string;
  name: string;
  satisfied: boolean;
  isHost: boolean;
}

export interface Item {
  id: string;
  text: string;
}

export interface RoomSettings {
  finishMode: "consensus" | "timed";
  timerDuration: number; // in seconds
}

export interface GameState {
  status: "lobby" | "playing" | "finished";
  items: Item[];
  players: Record<string, Player>;
  settings: RoomSettings;
  timerEndsAt: number | null;
  finalList: Item[] | null;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface PlayerCursor {
  playerId: string;
  playerName: string;
  playerColor: string;
  position: CursorPosition;
  draggingItem: string | null; // item text being dragged, or null
}

// Message types from client to server
export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "update-settings"; settings: Partial<RoomSettings> }
  | { type: "set-items"; items: Item[] }
  | { type: "start-game" }
  | { type: "reorder"; items: Item[] }
  | { type: "toggle-satisfied" }
  | { type: "request-more-time" }
  | { type: "new-round" }
  | { type: "cursor-move"; position: CursorPosition; draggingItem: string | null };

// Message types from server to client
export type ServerMessage =
  | { type: "sync"; state: GameState }
  | { type: "player-joined"; player: Player }
  | { type: "player-left"; playerId: string }
  | { type: "cursor-update"; cursor: PlayerCursor }
  | { type: "error"; message: string };

// Player colors for visual distinction
export const PLAYER_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];
