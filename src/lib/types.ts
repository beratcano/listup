// Shared types between client and server

export interface Player {
  id: string;
  name: string;
  satisfied: boolean;
  isHost: boolean;
  avatar?: string; // emoji avatar
  votedMoreTime?: boolean; // for timed mode
  isSpectator?: boolean; // view-only mode
  blindItems?: Item[]; // personal item order in blind mode
}

export interface Item {
  id: string;
  text: string;
}

export interface RoomSettings {
  finishMode: "consensus" | "timed";
  timerDuration: number; // in seconds
  gameMode: "classic" | "debate" | "blind"; // game variation
  debateDuration: number; // in seconds, for debate mode
}

export interface GameState {
  status: "lobby" | "debating" | "playing" | "finished";
  items: Item[];
  players: Record<string, Player>;
  settings: RoomSettings;
  timerEndsAt: number | null;
  debateEndsAt: number | null; // for debate mode
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

// Reaction types
export type ReactionType = "👍" | "👎" | "😂" | "🔥" | "💀";

export interface Reaction {
  playerId: string;
  playerName: string;
  type: ReactionType;
  timestamp: number;
}

// Message types from client to server
export type ClientMessage =
  | { type: "join"; name: string; avatar?: string; asSpectator?: boolean }
  | { type: "update-settings"; settings: Partial<RoomSettings> }
  | { type: "set-items"; items: Item[] }
  | { type: "start-game" }
  | { type: "reorder"; items: Item[] }
  | { type: "toggle-satisfied" }
  | { type: "request-more-time" }
  | { type: "new-round" }
  | { type: "cursor-move"; position: CursorPosition; draggingItem: string | null }
  | { type: "set-avatar"; avatar: string }
  | { type: "send-reaction"; reaction: ReactionType }
  | { type: "skip-debate" } // host can skip debate phase
  | { type: "submit-blind-ranking"; items: Item[] }; // submit personal ranking in blind mode

// Message types from server to client
export type ServerMessage =
  | { type: "sync"; state: GameState }
  | { type: "player-joined"; player: Player }
  | { type: "player-left"; playerId: string }
  | { type: "cursor-update"; cursor: PlayerCursor }
  | { type: "reaction"; reaction: Reaction }
  | { type: "time-extended"; newEndsAt: number; votedBy: string }
  | { type: "debate-ending"; secondsLeft: number }
  | { type: "blind-reveal"; finalList: Item[] }
  | { type: "error"; message: string };

// Available avatars
export const AVATARS = [
  "😀", "😎", "🤠", "🥳", "😈", "👻", "🤖", "👽",
  "🦊", "🐱", "🐶", "🦁", "🐸", "🐵", "🦄", "🐲",
];

// Available reactions
export const REACTIONS: ReactionType[] = ["👍", "👎", "😂", "🔥", "💀"];

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
