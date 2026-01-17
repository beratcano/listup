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

// Message types from client to server
export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "update-settings"; settings: Partial<RoomSettings> }
  | { type: "set-items"; items: Item[] }
  | { type: "start-game" }
  | { type: "reorder"; items: Item[] }
  | { type: "toggle-satisfied" }
  | { type: "request-more-time" }
  | { type: "new-round" };

// Message types from server to client
export type ServerMessage =
  | { type: "sync"; state: GameState }
  | { type: "player-joined"; player: Player }
  | { type: "player-left"; playerId: string }
  | { type: "error"; message: string };
