"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import usePartySocket from "partysocket/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { GameState, Item, ServerMessage, ClientMessage, PlayerCursor } from "@/lib/types";
import { presetPacks, packToItems, textToItems } from "@/lib/presets";
import { SortableItem } from "@/components/SortableItem";
import { PlayerList } from "@/components/PlayerList";
import { Timer } from "@/components/Timer";
import { Cursor } from "@/components/Cursor";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [customItems, setCustomItems] = useState("");
  const [selectedPack, setSelectedPack] = useState<string>("");
  const [hasJoined, setHasJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cursors, setCursors] = useState<Record<string, PlayerCursor>>({});

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: roomId,
    onMessage(event) {
      const message = JSON.parse(event.data) as ServerMessage;

      if (message.type === "sync") {
        setGameState(message.state);
      } else if (message.type === "cursor-update") {
        setCursors((prev) => ({
          ...prev,
          [message.cursor.playerId]: message.cursor,
        }));
      } else if (message.type === "player-left") {
        setCursors((prev) => {
          const next = { ...prev };
          delete next[message.playerId];
          return next;
        });
      } else if (message.type === "error") {
        console.error("Server error:", message.message);
      }
    },
    onOpen() {
      setMyId(socket.id);
    },
  });

  // Join room on mount
  useEffect(() => {
    if (socket && myId && !hasJoined) {
      const name = localStorage.getItem("listup-name") || "Anonymous";
      const msg: ClientMessage = { type: "join", name };
      socket.send(JSON.stringify(msg));
      setHasJoined(true);
    }
  }, [socket, myId, hasJoined]);

  const send = useCallback((msg: ClientMessage) => {
    socket.send(JSON.stringify(msg));
  }, [socket]);

  // Track currently dragging item
  const [draggingItem, setDraggingItem] = useState<string | null>(null);

  // Cursor tracking (throttled)
  const lastCursorSent = useRef(0);
  const draggingItemRef = useRef<string | null>(null);

  // Keep ref in sync with state for use in event handler
  useEffect(() => {
    draggingItemRef.current = draggingItem;
  }, [draggingItem]);

  useEffect(() => {
    if (!gameState || gameState.status !== "playing") return;

    const handlePointerMove = (e: PointerEvent) => {
      const now = Date.now();
      if (now - lastCursorSent.current < 50) return; // Throttle to 20 updates/sec
      lastCursorSent.current = now;

      send({
        type: "cursor-move",
        position: { x: e.clientX, y: e.clientY },
        draggingItem: draggingItemRef.current,
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [gameState?.status, send]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!gameState) return;
    const item = gameState.items.find((i) => i.id === event.active.id);
    if (item) {
      setDraggingItem(item.text);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingItem(null); // Clear dragging state

    const { active, over } = event;
    if (!over || active.id === over.id || !gameState) return;

    const oldIndex = gameState.items.findIndex((item) => item.id === active.id);
    const newIndex = gameState.items.findIndex((item) => item.id === over.id);
    const newItems = arrayMove(gameState.items, oldIndex, newIndex);

    // Optimistic update
    setGameState({ ...gameState, items: newItems });

    // Send to server
    send({ type: "reorder", items: newItems });
  };

  const handleSetItems = (items: Item[]) => {
    send({ type: "set-items", items });
  };

  const handleApplyPack = () => {
    const pack = presetPacks.find((p) => p.id === selectedPack);
    if (pack) {
      handleSetItems(packToItems(pack));
    }
  };

  const handleApplyCustom = () => {
    const items = textToItems(customItems);
    if (items.length >= 2) {
      handleSetItems(items);
    }
  };

  const handleShuffle = () => {
    if (!gameState) return;
    const shuffled = [...gameState.items].sort(() => Math.random() - 0.5);
    send({ type: "set-items", items: shuffled });
  };

  const handleStartGame = () => {
    send({ type: "start-game" });
  };

  const handleToggleSatisfied = () => {
    send({ type: "toggle-satisfied" });
  };

  const handleNewRound = () => {
    send({ type: "new-round" });
  };

  const handleUpdateSettings = (settings: Partial<GameState["settings"]>) => {
    send({ type: "update-settings", settings });
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-gray-500">Connecting to room...</div>
      </div>
    );
  }

  const me = myId ? gameState.players[myId] : null;
  const isHost = me?.isHost ?? false;
  const playerCount = Object.keys(gameState.players).length;

  // LOBBY VIEW
  if (gameState.status === "lobby") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push("/")}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Leave
            </button>
            <button
              onClick={copyRoomCode}
              className="text-center group"
            >
              <div className="text-sm text-gray-500">Room Code</div>
              <div className="text-2xl font-mono font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                {roomId}
                <span className="ml-2 text-sm font-normal text-gray-400 group-hover:text-blue-500">
                  {copied ? "Copied!" : "Copy"}
                </span>
              </div>
            </button>
            <div className="w-16" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Players */}
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <h2 className="font-semibold text-gray-800 mb-3">
                Players ({playerCount})
              </h2>
              <PlayerList players={gameState.players} currentPlayerId={myId} />
            </div>

            {/* Settings (Host only) */}
            {isHost ? (
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <h2 className="font-semibold text-gray-800 mb-3">Game Settings</h2>

                {/* Finish Mode */}
                <div className="mb-4">
                  <label className="text-sm text-gray-500 block mb-2">Finish Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateSettings({ finishMode: "consensus" })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        gameState.settings.finishMode === "consensus"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Consensus
                    </button>
                    <button
                      onClick={() => handleUpdateSettings({ finishMode: "timed" })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        gameState.settings.finishMode === "timed"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Timed
                    </button>
                  </div>
                </div>

                {/* Timer Duration (if timed) */}
                {gameState.settings.finishMode === "timed" && (
                  <div className="mb-4">
                    <label className="text-sm text-gray-500 block mb-2">Duration</label>
                    <div className="flex gap-2">
                      {[30, 60, 120, 180].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => handleUpdateSettings({ timerDuration: sec })}
                          className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
                            gameState.settings.timerDuration === sec
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <h2 className="font-semibold text-gray-800 mb-3">Game Settings</h2>
                <p className="text-gray-500 text-sm">
                  Waiting for host to configure the game...
                </p>
                <div className="mt-3 text-sm">
                  <span className="text-gray-500">Mode: </span>
                  <span className="font-medium text-gray-800">
                    {gameState.settings.finishMode === "consensus" ? "Consensus" : `Timed (${gameState.settings.timerDuration}s)`}
                  </span>
                </div>
              </div>
            )}

            {/* Word Selection (Host only) */}
            {isHost && (
              <div className="bg-white rounded-2xl shadow-lg p-4 md:col-span-2">
                <h2 className="font-semibold text-gray-800 mb-3">Words</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Preset Packs */}
                  <div>
                    <label className="text-sm text-gray-500 block mb-2">Preset Packs</label>
                    <select
                      value={selectedPack}
                      onChange={(e) => setSelectedPack(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none mb-2"
                    >
                      <option value="">Select a pack...</option>
                      {presetPacks.map((pack) => (
                        <option key={pack.id} value={pack.id}>
                          {pack.name} ({pack.items.length} items)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleApplyPack}
                      disabled={!selectedPack}
                      className="w-full py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                    >
                      Use This Pack
                    </button>
                  </div>

                  {/* Custom Input */}
                  <div>
                    <label className="text-sm text-gray-500 block mb-2">Custom List</label>
                    <textarea
                      value={customItems}
                      onChange={(e) => setCustomItems(e.target.value)}
                      placeholder="Enter items (one per line or comma-separated)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none h-20 resize-none mb-2"
                    />
                    <button
                      onClick={handleApplyCustom}
                      disabled={textToItems(customItems).length < 2}
                      className="w-full py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                    >
                      Use Custom List
                    </button>
                  </div>
                </div>

                {/* Current Items Preview */}
                {gameState.items.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-500">
                        Current Items ({gameState.items.length})
                      </label>
                      <button
                        onClick={handleShuffle}
                        className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                      >
                        Shuffle
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {gameState.items.map((item) => (
                        <span
                          key={item.id}
                          className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                        >
                          {item.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Non-host sees items */}
            {!isHost && gameState.items.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-4 md:col-span-2">
                <h2 className="font-semibold text-gray-800 mb-3">
                  Items ({gameState.items.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {gameState.items.map((item) => (
                    <span
                      key={item.id}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                    >
                      {item.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Start Button */}
          {isHost && (
            <div className="mt-6">
              <button
                onClick={handleStartGame}
                disabled={gameState.items.length < 2}
                className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                {gameState.items.length < 2
                  ? "Add at least 2 items to start"
                  : `Start Game (${playerCount} player${playerCount !== 1 ? "s" : ""})`}
              </button>
            </div>
          )}

          {!isHost && (
            <div className="mt-6 text-center text-gray-500">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    );
  }

  // PLAYING VIEW
  if (gameState.status === "playing") {
    const allSatisfied = Object.values(gameState.players).every((p) => p.satisfied);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-500">
              {gameState.settings.finishMode === "consensus" ? (
                <span>
                  {Object.values(gameState.players).filter((p) => p.satisfied).length}/
                  {Object.keys(gameState.players).length} satisfied
                </span>
              ) : (
                gameState.timerEndsAt && <Timer endsAt={gameState.timerEndsAt} />
              )}
            </div>
            <div className="text-sm font-mono text-gray-400">{roomId}</div>
          </div>

          {/* Sortable List */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={gameState.items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {gameState.items.map((item, index) => (
                    <SortableItem key={item.id} item={item} index={index} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Satisfaction (Consensus mode) */}
          {gameState.settings.finishMode === "consensus" && (
            <div className="space-y-4">
              <button
                onClick={handleToggleSatisfied}
                className={`w-full py-4 font-semibold rounded-xl transition-colors text-lg ${
                  me?.satisfied
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {me?.satisfied ? "I'm Satisfied ✓" : "I'm Satisfied"}
              </button>

              {/* Player satisfaction status */}
              <div className="bg-white rounded-xl p-3">
                <PlayerList
                  players={gameState.players}
                  currentPlayerId={myId}
                  showSatisfied
                />
              </div>

              {allSatisfied && (
                <div className="text-center text-green-600 font-medium animate-pulse">
                  Everyone is satisfied! Finalizing...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Other players' cursors */}
        {Object.values(cursors).map((cursor) => (
          <Cursor key={cursor.playerId} cursor={cursor} />
        ))}
      </div>
    );
  }

  // FINISHED VIEW
  if (gameState.status === "finished") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Final List!</h1>
            <p className="text-gray-500">The chaos has settled.</p>
          </div>

          {/* Final List */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="space-y-2">
              {(gameState.finalList || gameState.items).map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl"
                >
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="text-lg font-medium text-gray-800">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {isHost && (
              <button
                onClick={handleNewRound}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                New Round
              </button>
            )}
            <button
              onClick={() => router.push("/")}
              className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-lg"
            >
              Leave Room
            </button>
          </div>

          {/* Players */}
          <div className="mt-6 bg-white rounded-xl p-3">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Players</h3>
            <PlayerList players={gameState.players} currentPlayerId={myId} />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
