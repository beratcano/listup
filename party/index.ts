import type * as Party from "partykit/server";

// Types
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
  timerEndsAt: number | null; // timestamp
  finalList: Item[] | null;
}

interface CursorPosition {
  x: number;
  y: number;
}

interface PlayerCursor {
  playerId: string;
  playerName: string;
  playerColor: string;
  position: CursorPosition;
  draggingItem: string | null;
}

// Message types
type ClientMessage =
  | { type: "join"; name: string }
  | { type: "update-settings"; settings: Partial<RoomSettings> }
  | { type: "set-items"; items: Item[] }
  | { type: "start-game" }
  | { type: "reorder"; items: Item[] }
  | { type: "toggle-satisfied" }
  | { type: "request-more-time" }
  | { type: "new-round" }
  | { type: "cursor-move"; position: CursorPosition; draggingItem: string | null };

type ServerMessage =
  | { type: "sync"; state: GameState }
  | { type: "player-joined"; player: Player }
  | { type: "player-left"; playerId: string }
  | { type: "cursor-update"; cursor: PlayerCursor }
  | { type: "error"; message: string };

const PLAYER_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

export default class ListUpServer implements Party.Server {
  state: GameState;

  constructor(readonly room: Party.Room) {
    this.state = this.getInitialState();
  }

  getInitialState(): GameState {
    return {
      status: "lobby",
      items: [],
      players: {},
      settings: {
        finishMode: "consensus",
        timerDuration: 60,
      },
      timerEndsAt: null,
      finalList: null,
    };
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Send current state to new connection
    conn.send(JSON.stringify({ type: "sync", state: this.state }));
  }

  onClose(conn: Party.Connection) {
    const playerId = conn.id;
    if (this.state.players[playerId]) {
      const wasHost = this.state.players[playerId].isHost;
      delete this.state.players[playerId];

      // If host left, assign new host
      if (wasHost) {
        const remainingPlayers = Object.values(this.state.players);
        if (remainingPlayers.length > 0) {
          remainingPlayers[0].isHost = true;
        }
      }

      this.broadcast({ type: "player-left", playerId });
      this.broadcastState();
      this.checkGameEnd();
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message) as ClientMessage;

    switch (data.type) {
      case "join":
        this.handleJoin(sender, data.name);
        break;
      case "update-settings":
        this.handleUpdateSettings(sender, data.settings);
        break;
      case "set-items":
        this.handleSetItems(sender, data.items);
        break;
      case "start-game":
        this.handleStartGame(sender);
        break;
      case "reorder":
        this.handleReorder(sender, data.items);
        break;
      case "toggle-satisfied":
        this.handleToggleSatisfied(sender);
        break;
      case "new-round":
        this.handleNewRound(sender);
        break;
      case "cursor-move":
        this.handleCursorMove(sender, data.position, data.draggingItem);
        break;
    }
  }

  handleJoin(conn: Party.Connection, name: string) {
    const isFirstPlayer = Object.keys(this.state.players).length === 0;

    const player: Player = {
      id: conn.id,
      name,
      satisfied: false,
      isHost: isFirstPlayer,
    };

    this.state.players[conn.id] = player;
    this.broadcast({ type: "player-joined", player });
    this.broadcastState();
  }

  handleUpdateSettings(conn: Party.Connection, settings: Partial<RoomSettings>) {
    const player = this.state.players[conn.id];
    if (!player?.isHost) {
      conn.send(JSON.stringify({ type: "error", message: "Only host can update settings" }));
      return;
    }

    if (this.state.status !== "lobby") {
      conn.send(JSON.stringify({ type: "error", message: "Cannot update settings during game" }));
      return;
    }

    this.state.settings = { ...this.state.settings, ...settings };
    this.broadcastState();
  }

  handleSetItems(conn: Party.Connection, items: Item[]) {
    const player = this.state.players[conn.id];
    if (!player?.isHost) {
      conn.send(JSON.stringify({ type: "error", message: "Only host can set items" }));
      return;
    }

    if (this.state.status !== "lobby") {
      conn.send(JSON.stringify({ type: "error", message: "Cannot set items during game" }));
      return;
    }

    this.state.items = items;
    this.broadcastState();
  }

  handleStartGame(conn: Party.Connection) {
    const player = this.state.players[conn.id];
    if (!player?.isHost) {
      conn.send(JSON.stringify({ type: "error", message: "Only host can start game" }));
      return;
    }

    if (this.state.items.length < 2) {
      conn.send(JSON.stringify({ type: "error", message: "Need at least 2 items to start" }));
      return;
    }

    this.state.status = "playing";
    this.state.finalList = null;

    // Reset satisfaction
    for (const p of Object.values(this.state.players)) {
      p.satisfied = false;
    }

    // Set timer if timed mode
    if (this.state.settings.finishMode === "timed") {
      this.state.timerEndsAt = Date.now() + this.state.settings.timerDuration * 1000;
      this.scheduleTimerEnd();
    }

    this.broadcastState();
  }

  handleReorder(conn: Party.Connection, items: Item[]) {
    if (this.state.status !== "playing") return;

    this.state.items = items;

    // Reset all satisfaction when list changes (consensus mode behavior)
    if (this.state.settings.finishMode === "consensus") {
      for (const p of Object.values(this.state.players)) {
        p.satisfied = false;
      }
    }

    this.broadcastState();
  }

  handleToggleSatisfied(conn: Party.Connection) {
    if (this.state.status !== "playing") return;
    if (this.state.settings.finishMode !== "consensus") return;

    const player = this.state.players[conn.id];
    if (player) {
      player.satisfied = !player.satisfied;
      this.broadcastState();
      this.checkGameEnd();
    }
  }

  handleNewRound(conn: Party.Connection) {
    const player = this.state.players[conn.id];
    if (!player?.isHost) {
      conn.send(JSON.stringify({ type: "error", message: "Only host can start new round" }));
      return;
    }

    this.state.status = "lobby";
    this.state.timerEndsAt = null;
    this.state.finalList = null;

    for (const p of Object.values(this.state.players)) {
      p.satisfied = false;
    }

    this.broadcastState();
  }

  handleCursorMove(conn: Party.Connection, position: CursorPosition, draggingItem: string | null) {
    if (this.state.status !== "playing") return;

    const player = this.state.players[conn.id];
    if (!player) return;

    // Get player's color based on join order
    const playerIds = Object.keys(this.state.players);
    const playerIndex = playerIds.indexOf(conn.id);
    const playerColor = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];

    // Broadcast cursor to all OTHER players (not the sender)
    const cursor: PlayerCursor = {
      playerId: conn.id,
      playerName: player.name,
      playerColor,
      position,
      draggingItem,
    };

    for (const connection of this.room.getConnections()) {
      if (connection.id !== conn.id) {
        connection.send(JSON.stringify({ type: "cursor-update", cursor }));
      }
    }
  }

  checkGameEnd() {
    if (this.state.status !== "playing") return;

    if (this.state.settings.finishMode === "consensus") {
      const players = Object.values(this.state.players);
      const allSatisfied = players.length > 0 && players.every((p) => p.satisfied);

      if (allSatisfied) {
        this.endGame();
      }
    }
  }

  scheduleTimerEnd() {
    if (!this.state.timerEndsAt) return;

    const timeLeft = this.state.timerEndsAt - Date.now();
    if (timeLeft <= 0) {
      this.endGame();
    } else {
      setTimeout(() => {
        if (this.state.status === "playing" && this.state.settings.finishMode === "timed") {
          this.endGame();
        }
      }, timeLeft);
    }
  }

  endGame() {
    this.state.status = "finished";
    this.state.finalList = [...this.state.items];
    this.state.timerEndsAt = null;
    this.broadcastState();
  }

  broadcast(message: ServerMessage) {
    this.room.broadcast(JSON.stringify(message));
  }

  broadcastState() {
    this.broadcast({ type: "sync", state: this.state });
  }
}
