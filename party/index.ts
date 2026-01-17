import type * as Party from "partykit/server";

// Types
export interface Player {
  id: string;
  name: string;
  satisfied: boolean;
  isHost: boolean;
  avatar?: string;
  votedMoreTime?: boolean;
  isSpectator?: boolean;
  blindItems?: Item[];
}

export interface Item {
  id: string;
  text: string;
}

export interface RoomSettings {
  finishMode: "consensus" | "timed";
  timerDuration: number; // in seconds
  gameMode: "classic" | "debate" | "blind";
  debateDuration: number; // in seconds
}

export interface GameState {
  status: "lobby" | "debating" | "playing" | "finished";
  items: Item[];
  players: Record<string, Player>;
  settings: RoomSettings;
  timerEndsAt: number | null; // timestamp
  debateEndsAt: number | null; // timestamp for debate phase
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

type ReactionType = "👍" | "👎" | "😂" | "🔥" | "💀";

interface Reaction {
  playerId: string;
  playerName: string;
  type: ReactionType;
  timestamp: number;
}

// Message types
type ClientMessage =
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
  | { type: "skip-debate" }
  | { type: "submit-blind-ranking"; items: Item[] };

type ServerMessage =
  | { type: "sync"; state: GameState }
  | { type: "player-joined"; player: Player }
  | { type: "player-left"; playerId: string }
  | { type: "cursor-update"; cursor: PlayerCursor }
  | { type: "reaction"; reaction: Reaction }
  | { type: "time-extended"; newEndsAt: number; votedBy: string }
  | { type: "debate-ending"; secondsLeft: number }
  | { type: "blind-reveal"; finalList: Item[] }
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
        gameMode: "classic",
        debateDuration: 60,
      },
      timerEndsAt: null,
      debateEndsAt: null,
      finalList: null,
    };
  }

  onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext) {
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
        this.handleJoin(sender, data.name, data.avatar, data.asSpectator);
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
      case "request-more-time":
        this.handleRequestMoreTime(sender);
        break;
      case "set-avatar":
        this.handleSetAvatar(sender, data.avatar);
        break;
      case "send-reaction":
        this.handleSendReaction(sender, data.reaction);
        break;
      case "skip-debate":
        this.handleSkipDebate(sender);
        break;
      case "submit-blind-ranking":
        this.handleSubmitBlindRanking(sender, data.items);
        break;
    }
  }

  handleJoin(conn: Party.Connection, name: string, avatar?: string, asSpectator?: boolean) {
    const isFirstPlayer = Object.keys(this.state.players).length === 0;

    const player: Player = {
      id: conn.id,
      name,
      satisfied: false,
      isHost: isFirstPlayer && !asSpectator, // spectators can't be host
      avatar: avatar || "😀",
      votedMoreTime: false,
      isSpectator: asSpectator || false,
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

    this.state.finalList = null;

    // Reset satisfaction and more time votes
    for (const p of Object.values(this.state.players)) {
      p.satisfied = false;
      p.votedMoreTime = false;
      // Initialize blind items for blind mode
      if (this.state.settings.gameMode === "blind") {
        p.blindItems = [...this.state.items];
      }
    }

    // Handle debate mode - start with debate phase
    if (this.state.settings.gameMode === "debate") {
      this.state.status = "debating";
      this.state.debateEndsAt = Date.now() + this.state.settings.debateDuration * 1000;
      this.scheduleDebateEnd();
    } else {
      this.state.status = "playing";
      // Set timer if timed mode
      if (this.state.settings.finishMode === "timed") {
        this.state.timerEndsAt = Date.now() + this.state.settings.timerDuration * 1000;
        this.scheduleTimerEnd();
      }
    }

    this.broadcastState();
  }

  handleReorder(conn: Party.Connection, items: Item[]) {
    if (this.state.status !== "playing") return;

    const player = this.state.players[conn.id];
    if (!player || player.isSpectator) return; // spectators can't reorder

    // In blind mode, each player has their own order
    if (this.state.settings.gameMode === "blind") {
      player.blindItems = items;
      // Only send update to the player who made the change
      conn.send(JSON.stringify({ type: "sync", state: this.state }));
      return;
    }

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
    if (player && !player.isSpectator) {
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
    this.state.debateEndsAt = null;
    this.state.finalList = null;

    for (const p of Object.values(this.state.players)) {
      p.satisfied = false;
      p.blindItems = undefined;
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

  handleRequestMoreTime(conn: Party.Connection) {
    if (this.state.status !== "playing") return;
    if (this.state.settings.finishMode !== "timed") return;
    if (!this.state.timerEndsAt) return;

    const player = this.state.players[conn.id];
    if (!player) return;

    // Can only vote once per game
    if (player.votedMoreTime) {
      conn.send(JSON.stringify({ type: "error", message: "You already voted for more time" }));
      return;
    }

    player.votedMoreTime = true;

    // Add 30 seconds
    this.state.timerEndsAt = this.state.timerEndsAt + 30000;

    // Broadcast the extension
    this.broadcast({ type: "time-extended", newEndsAt: this.state.timerEndsAt, votedBy: player.name });
    this.broadcastState();

    // Reschedule timer
    this.scheduleTimerEnd();
  }

  handleSetAvatar(conn: Party.Connection, avatar: string) {
    const player = this.state.players[conn.id];
    if (!player) return;

    player.avatar = avatar;
    this.broadcastState();
  }

  handleSendReaction(conn: Party.Connection, reactionType: ReactionType) {
    const player = this.state.players[conn.id];
    if (!player) return;

    const reaction: Reaction = {
      playerId: conn.id,
      playerName: player.name,
      type: reactionType,
      timestamp: Date.now(),
    };

    this.broadcast({ type: "reaction", reaction });
  }

  handleSkipDebate(conn: Party.Connection) {
    const player = this.state.players[conn.id];
    if (!player?.isHost) {
      conn.send(JSON.stringify({ type: "error", message: "Only host can skip debate" }));
      return;
    }

    if (this.state.status !== "debating") return;

    this.transitionToPlaying();
  }

  handleSubmitBlindRanking(conn: Party.Connection, items: Item[]) {
    if (this.state.status !== "playing") return;
    if (this.state.settings.gameMode !== "blind") return;

    const player = this.state.players[conn.id];
    if (!player || player.isSpectator) return;

    player.blindItems = items;
    player.satisfied = true;
    this.broadcastState();
    this.checkGameEnd();
  }

  scheduleDebateEnd() {
    if (!this.state.debateEndsAt) return;

    const timeLeft = this.state.debateEndsAt - Date.now();
    if (timeLeft <= 0) {
      this.transitionToPlaying();
    } else {
      // Warn 10 seconds before end
      if (timeLeft > 10000) {
        setTimeout(() => {
          if (this.state.status === "debating") {
            this.broadcast({ type: "debate-ending", secondsLeft: 10 });
          }
        }, timeLeft - 10000);
      }

      setTimeout(() => {
        if (this.state.status === "debating") {
          this.transitionToPlaying();
        }
      }, timeLeft);
    }
  }

  transitionToPlaying() {
    this.state.status = "playing";
    this.state.debateEndsAt = null;

    // Set timer if timed mode
    if (this.state.settings.finishMode === "timed") {
      this.state.timerEndsAt = Date.now() + this.state.settings.timerDuration * 1000;
      this.scheduleTimerEnd();
    }

    this.broadcastState();
  }

  checkGameEnd() {
    if (this.state.status !== "playing") return;

    // Get active players (non-spectators)
    const activePlayers = Object.values(this.state.players).filter((p) => !p.isSpectator);

    if (this.state.settings.finishMode === "consensus") {
      const allSatisfied = activePlayers.length > 0 && activePlayers.every((p) => p.satisfied);

      if (allSatisfied) {
        this.endGame();
      }
    }

    // For blind mode, check if all players have submitted
    if (this.state.settings.gameMode === "blind") {
      const allSubmitted = activePlayers.length > 0 && activePlayers.every((p) => p.satisfied);
      if (allSubmitted) {
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
    this.state.timerEndsAt = null;

    // For blind mode, compute average ranking
    if (this.state.settings.gameMode === "blind") {
      this.state.finalList = this.computeBlindFinalList();
      // Broadcast the reveal
      this.broadcast({ type: "blind-reveal", finalList: this.state.finalList });
    } else {
      this.state.finalList = [...this.state.items];
    }

    this.broadcastState();
  }

  // Compute final list for blind mode using Borda count
  computeBlindFinalList(): Item[] {
    const activePlayers = Object.values(this.state.players).filter((p) => !p.isSpectator);
    const itemScores: Record<string, number> = {};

    // Initialize scores
    for (const item of this.state.items) {
      itemScores[item.id] = 0;
    }

    // Calculate Borda count (higher rank = more points)
    const itemCount = this.state.items.length;
    for (const player of activePlayers) {
      const ranking = player.blindItems || this.state.items;
      ranking.forEach((item, index) => {
        // Position 0 gets highest points, last position gets 0
        itemScores[item.id] += (itemCount - 1 - index);
      });
    }

    // Sort by score descending
    const sortedItems = [...this.state.items].sort((a, b) => {
      return itemScores[b.id] - itemScores[a.id];
    });

    return sortedItems;
  }

  broadcast(message: ServerMessage) {
    this.room.broadcast(JSON.stringify(message));
  }

  broadcastState() {
    this.broadcast({ type: "sync", state: this.state });
  }
}
