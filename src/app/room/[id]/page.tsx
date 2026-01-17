"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import usePartySocket from "partysocket/react";
import {
  DndContext,
  DragOverlay,
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

import { GameState, Item, ServerMessage, ClientMessage, PlayerCursor, PLAYER_COLORS, AVATARS, REACTIONS, Reaction, ReactionType } from "@/lib/types";
import { presetPacks, packToItems, packToItemsSubset, textToItems, mixPacks, categoryNames, PresetPack } from "@/lib/presets";
import { getCommunityPacks, createCommunityPack, CommunityPack, incrementPlays } from "@/lib/supabase";
import { SortableItem, DragOverlayItem } from "@/components/SortableItem";
import { PlayerList } from "@/components/PlayerList";
import { Timer } from "@/components/Timer";
import { Cursor } from "@/components/Cursor";
import { nanoid } from "nanoid";

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [customItems, setCustomItems] = useState("");
  const [selectedPack, setSelectedPack] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<PresetPack["category"] | "all">("all");
  const [subsetCount, setSubsetCount] = useState<number>(0); // 0 means use all
  const [mixMode, setMixMode] = useState(false);
  const [selectedMixPacks, setSelectedMixPacks] = useState<string[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cursors, setCursors] = useState<Record<string, PlayerCursor>>({});
  const [selectedAvatar, setSelectedAvatar] = useState<string>("😀");
  const [floatingReactions, setFloatingReactions] = useState<(Reaction & { id: string; leftPosition: number })[]>([]);
  const [timeExtendedToast, setTimeExtendedToast] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<{ items: Item[]; timestamp: number }[]>([]);
  const [debateEndingWarning, setDebateEndingWarning] = useState<number | null>(null);
  const [blindItems, setBlindItems] = useState<Item[]>([]); // Local items for blind mode

  // Community packs state
  const [packSource, setPackSource] = useState<"preset" | "community">("preset");
  const [communityPacks, setCommunityPacks] = useState<CommunityPack[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareName, setShareName] = useState("");
  const [shareDescription, setShareDescription] = useState("");
  const [shareCategory, setShareCategory] = useState("misc");

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
      } else if (message.type === "reaction") {
        // Add floating reaction with pre-computed random position
        const reactionWithId = {
          ...message.reaction,
          id: `${message.reaction.playerId}-${message.reaction.timestamp}`,
          leftPosition: 30 + Math.random() * 40
        };
        setFloatingReactions((prev) => [...prev, reactionWithId]);
        // Remove after 2 seconds
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== reactionWithId.id));
        }, 2000);
      } else if (message.type === "time-extended") {
        setTimeExtendedToast(`${message.votedBy} added 30 seconds!`);
        setTimeout(() => setTimeExtendedToast(null), 3000);
      } else if (message.type === "debate-ending") {
        setDebateEndingWarning(message.secondsLeft);
        setTimeout(() => setDebateEndingWarning(null), message.secondsLeft * 1000);
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
      const avatar = localStorage.getItem("listup-avatar") || "😀";
      const asSpectator = localStorage.getItem("listup-spectator") === "true";
      setSelectedAvatar(avatar);
      const msg: ClientMessage = { type: "join", name, avatar, asSpectator };
      socket.send(JSON.stringify(msg));
      setHasJoined(true);
      // Clear spectator flag after use
      localStorage.removeItem("listup-spectator");
    }
  }, [socket, myId, hasJoined]);

  // Initialize blind items when game starts in blind mode
  useEffect(() => {
    if (gameState?.status === "playing" && gameState.settings.gameMode === "blind" && blindItems.length === 0) {
      setBlindItems([...gameState.items]);
    }
    // Reset on new round
    if (gameState?.status === "lobby") {
      setBlindItems([]);
    }
  }, [gameState?.status, gameState?.settings.gameMode, gameState?.items, blindItems.length]);

  // Save to history when game finishes
  useEffect(() => {
    if (gameState?.status === "finished" && gameState.finalList) {
      setSessionHistory((prev) => {
        // Don't add duplicate (check last entry)
        const lastEntry = prev[prev.length - 1];
        if (lastEntry && JSON.stringify(lastEntry.items) === JSON.stringify(gameState.finalList)) {
          return prev;
        }
        return [...prev, { items: gameState.finalList!, timestamp: Date.now() }];
      });
    }
  }, [gameState?.status, gameState?.finalList]);

  const send = useCallback((msg: ClientMessage) => {
    socket.send(JSON.stringify(msg));
  }, [socket]);

  // Track currently dragging item (text for cursor broadcast)
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  // Track active item ID for DragOverlay
  const [activeId, setActiveId] = useState<string | null>(null);

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
    setActiveId(event.active.id as string);
    const item = gameState.items.find((i) => i.id === event.active.id);
    if (item) {
      setDraggingItem(item.text);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDraggingItem(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null); // Clear overlay
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
      if (subsetCount > 0 && subsetCount < pack.items.length) {
        handleSetItems(packToItemsSubset(pack, subsetCount));
      } else {
        handleSetItems(packToItems(pack));
      }
    }
  };

  const handleApplyMix = () => {
    const packs = presetPacks.filter((p) => selectedMixPacks.includes(p.id));
    if (packs.length > 0) {
      const count = subsetCount > 0 ? subsetCount : 10;
      handleSetItems(mixPacks(packs, count));
    }
  };

  const toggleMixPack = (packId: string) => {
    setSelectedMixPacks((prev) =>
      prev.includes(packId)
        ? prev.filter((id) => id !== packId)
        : [...prev, packId]
    );
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

  const handleRequestMoreTime = () => {
    send({ type: "request-more-time" });
  };

  const handleSetAvatar = (avatar: string) => {
    setSelectedAvatar(avatar);
    localStorage.setItem("listup-avatar", avatar);
    send({ type: "set-avatar", avatar });
  };

  const handleSendReaction = (reaction: ReactionType) => {
    send({ type: "send-reaction", reaction });
  };

  const handleSkipDebate = () => {
    send({ type: "skip-debate" });
  };

  const handleSubmitBlindRanking = () => {
    send({ type: "submit-blind-ranking", items: blindItems });
  };

  // Load community packs when switching to community tab
  const loadCommunityPacks = async () => {
    setLoadingCommunity(true);
    try {
      const packs = await getCommunityPacks({
        sortBy: "upvotes",
        category: selectedCategory === "all" ? undefined : selectedCategory,
        limit: 50,
      });
      setCommunityPacks(packs);
    } catch (error) {
      console.error("Failed to load community packs:", error);
    }
    setLoadingCommunity(false);
  };

  // Use a community pack
  const handleUseCommunityPack = async (pack: CommunityPack) => {
    const items: Item[] = pack.items.map((text) => ({
      id: nanoid(8),
      text,
    }));

    // Apply subset if selected
    let finalItems = items;
    if (subsetCount > 0 && subsetCount < items.length) {
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      finalItems = shuffled.slice(0, subsetCount);
    }

    handleSetItems(finalItems);

    // Track play count
    try {
      await incrementPlays(pack.id);
    } catch {
      // Ignore tracking errors
    }
  };

  // Share current items as a community pack
  const handleSharePack = async () => {
    if (!gameState || gameState.items.length < 3) return;
    if (!shareName.trim()) return;

    try {
      await createCommunityPack({
        name: shareName.trim(),
        description: shareDescription.trim() || null,
        category: shareCategory,
        items: gameState.items.map((i) => i.text),
        creator_name: localStorage.getItem("listup-name") || "Anonymous",
      });

      setShowShareModal(false);
      setShareName("");
      setShareDescription("");
      alert("Pack shared with the community!");

      // Reload community packs
      if (packSource === "community") {
        loadCommunityPacks();
      }
    } catch (error) {
      console.error("Failed to share pack:", error);
      alert("Failed to share pack. Please try again.");
    }
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
              <PlayerList players={gameState.players} currentPlayerId={myId} showAvatar />

              {/* Avatar Selection */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="text-sm text-gray-500 block mb-2">Your Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => handleSetAvatar(avatar)}
                      className={`w-10 h-10 text-xl rounded-lg transition-all ${
                        selectedAvatar === avatar
                          ? "bg-blue-100 ring-2 ring-blue-500 scale-110"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Settings (Host only) */}
            {isHost ? (
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <h2 className="font-semibold text-gray-800 mb-3">Game Settings</h2>

                {/* Quick Mode Presets */}
                <div className="mb-4">
                  <label className="text-sm text-gray-500 block mb-2">Quick Presets</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateSettings({ finishMode: "consensus" })}
                      className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Chill
                    </button>
                    <button
                      onClick={() => handleUpdateSettings({ finishMode: "timed", timerDuration: 30 })}
                      className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      Blitz (30s)
                    </button>
                  </div>
                </div>

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

                {/* Game Mode */}
                <div className="mb-4">
                  <label className="text-sm text-gray-500 block mb-2">Game Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateSettings({ gameMode: "classic" })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        gameState.settings.gameMode === "classic"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Classic
                    </button>
                    <button
                      onClick={() => handleUpdateSettings({ gameMode: "debate" })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        gameState.settings.gameMode === "debate"
                          ? "bg-purple-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Debate
                    </button>
                    <button
                      onClick={() => handleUpdateSettings({ gameMode: "blind" })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        gameState.settings.gameMode === "blind"
                          ? "bg-amber-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Blind
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {gameState.settings.gameMode === "classic" && "Everyone ranks together in real-time."}
                    {gameState.settings.gameMode === "debate" && "Discuss first, then rank together."}
                    {gameState.settings.gameMode === "blind" && "Everyone ranks privately, then reveal."}
                  </p>
                </div>

                {/* Debate Duration (if debate mode) */}
                {gameState.settings.gameMode === "debate" && (
                  <div className="mb-4">
                    <label className="text-sm text-gray-500 block mb-2">Debate Duration</label>
                    <div className="flex gap-2">
                      {[30, 60, 120, 180].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => handleUpdateSettings({ debateDuration: sec })}
                          className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
                            gameState.settings.debateDuration === sec
                              ? "bg-purple-500 text-white"
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
                <div className="mt-3 text-sm space-y-1">
                  <div>
                    <span className="text-gray-500">Finish: </span>
                    <span className="font-medium text-gray-800">
                      {gameState.settings.finishMode === "consensus" ? "Consensus" : `Timed (${gameState.settings.timerDuration}s)`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Mode: </span>
                    <span className="font-medium text-gray-800 capitalize">
                      {gameState.settings.gameMode}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Word Selection (Host only) */}
            {isHost && (
              <div className="bg-white rounded-2xl shadow-lg p-4 md:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-800">Words</h2>
                  {/* Share to Community Button */}
                  {gameState.items.length >= 3 && (
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Share to Community
                    </button>
                  )}
                </div>

                {/* Source Toggle (Preset vs Community) */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setPackSource("preset")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      packSource === "preset"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Preset Packs
                  </button>
                  <button
                    onClick={() => {
                      setPackSource("community");
                      loadCommunityPacks();
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      packSource === "community"
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Community
                  </button>
                </div>

                {/* Preset Packs Mode */}
                {packSource === "preset" && (
                  <>
                    {/* Mode Toggle */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setMixMode(false)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          !mixMode
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Single Pack
                      </button>
                      <button
                        onClick={() => setMixMode(true)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          mixMode
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Mix Packs
                      </button>
                    </div>

                {/* Category Filter */}
                <div className="mb-4">
                  <label className="text-sm text-gray-500 block mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === "all"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      All
                    </button>
                    {(Object.keys(categoryNames) as PresetPack["category"][]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedCategory === cat
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {categoryNames[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subset Count */}
                <div className="mb-4">
                  <label className="text-sm text-gray-500 block mb-2">
                    Items to use: {subsetCount === 0 ? "All" : subsetCount}
                  </label>
                  <div className="flex gap-2">
                    {[0, 5, 7, 10, 15].map((count) => (
                      <button
                        key={count}
                        onClick={() => setSubsetCount(count)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          subsetCount === count
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {count === 0 ? "All" : count}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Pack Selection */}
                  <div>
                    <label className="text-sm text-gray-500 block mb-2">
                      {mixMode ? "Select packs to mix" : "Preset Packs"}
                    </label>
                    {mixMode ? (
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                        {presetPacks
                          .filter((p) => selectedCategory === "all" || p.category === selectedCategory)
                          .map((pack) => (
                            <label
                              key={pack.id}
                              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                selectedMixPacks.includes(pack.id)
                                  ? "bg-blue-50 border border-blue-200"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedMixPacks.includes(pack.id)}
                                onChange={() => toggleMixPack(pack.id)}
                                className="rounded text-blue-500"
                              />
                              <span className="text-sm text-gray-700">{pack.name}</span>
                              <span className="text-xs text-gray-400">({pack.items.length})</span>
                            </label>
                          ))}
                      </div>
                    ) : (
                      <select
                        value={selectedPack}
                        onChange={(e) => setSelectedPack(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none mb-2"
                      >
                        <option value="">Select a pack...</option>
                        {presetPacks
                          .filter((p) => selectedCategory === "all" || p.category === selectedCategory)
                          .map((pack) => (
                            <option key={pack.id} value={pack.id}>
                              {pack.name} ({pack.items.length} items)
                            </option>
                          ))}
                      </select>
                    )}
                    <button
                      onClick={mixMode ? handleApplyMix : handleApplyPack}
                      disabled={mixMode ? selectedMixPacks.length === 0 : !selectedPack}
                      className="w-full py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 font-medium rounded-lg transition-colors text-sm mt-2"
                    >
                      {mixMode
                        ? `Mix ${selectedMixPacks.length} Pack${selectedMixPacks.length !== 1 ? "s" : ""}`
                        : "Use This Pack"}
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
                  </>
                )}

                {/* Community Packs Mode */}
                {packSource === "community" && (
                  <>
                    {/* Category Filter */}
                    <div className="mb-4">
                      <label className="text-sm text-gray-500 block mb-2">Category</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedCategory("all");
                            loadCommunityPacks();
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            selectedCategory === "all"
                              ? "bg-purple-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          All
                        </button>
                        {(Object.keys(categoryNames) as PresetPack["category"][]).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              setSelectedCategory(cat);
                              loadCommunityPacks();
                            }}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              selectedCategory === cat
                                ? "bg-purple-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {categoryNames[cat]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subset Count */}
                    <div className="mb-4">
                      <label className="text-sm text-gray-500 block mb-2">
                        Items to use: {subsetCount === 0 ? "All" : subsetCount}
                      </label>
                      <div className="flex gap-2">
                        {[0, 5, 7, 10, 15].map((count) => (
                          <button
                            key={count}
                            onClick={() => setSubsetCount(count)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              subsetCount === count
                                ? "bg-purple-500 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {count === 0 ? "All" : count}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Community Packs List */}
                    <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                      {loadingCommunity ? (
                        <div className="p-4 text-center text-gray-500">
                          Loading community packs...
                        </div>
                      ) : communityPacks.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No community packs yet. Be the first to share!
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {communityPacks.map((pack) => (
                            <div
                              key={pack.id}
                              className="p-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-800 truncate">
                                      {pack.name}
                                    </span>
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full capitalize">
                                      {pack.category}
                                    </span>
                                  </div>
                                  {pack.description && (
                                    <p className="text-sm text-gray-500 truncate mt-1">
                                      {pack.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                    <span>by {pack.creator_name}</span>
                                    <span>{pack.items.length} items</span>
                                    <span>{pack.plays} plays</span>
                                    <span>{pack.upvotes} upvotes</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleUseCommunityPack(pack)}
                                  className="flex-shrink-0 px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                  Use
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Refresh Button */}
                    <button
                      onClick={loadCommunityPacks}
                      disabled={loadingCommunity}
                      className="w-full mt-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                    >
                      {loadingCommunity ? "Loading..." : "Refresh Packs"}
                    </button>

                    {/* Current Items Preview */}
                    {gameState.items.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-gray-500">
                            Current Items ({gameState.items.length})
                          </label>
                          <button
                            onClick={handleShuffle}
                            className="text-sm text-purple-500 hover:text-purple-600 font-medium"
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
                  </>
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

        {/* Share to Community Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Share to Community</h2>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Pack Name *</label>
                  <input
                    type="text"
                    value={shareName}
                    onChange={(e) => setShareName(e.target.value)}
                    placeholder="Give your pack a catchy name"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:outline-none"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">Description (optional)</label>
                  <textarea
                    value={shareDescription}
                    onChange={(e) => setShareDescription(e.target.value)}
                    placeholder="What's this pack about?"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:outline-none h-20 resize-none"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(categoryNames) as PresetPack["category"][]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setShareCategory(cat)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          shareCategory === cat
                            ? "bg-purple-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {categoryNames[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="text-sm text-gray-500 block mb-2">
                    Items ({gameState.items.length})
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {gameState.items.slice(0, 10).map((item) => (
                      <span
                        key={item.id}
                        className="px-2 py-0.5 bg-white rounded text-xs text-gray-600"
                      >
                        {item.text}
                      </span>
                    ))}
                    {gameState.items.length > 10 && (
                      <span className="text-xs text-gray-400">
                        +{gameState.items.length - 10} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSharePack}
                    disabled={!shareName.trim()}
                    className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
                  >
                    Share Pack
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DEBATING VIEW
  if (gameState.status === "debating") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-purple-600 font-medium">
              Debate Phase
            </div>
            <div className="text-sm font-mono text-gray-400">{roomId}</div>
          </div>

          {/* Timer */}
          {gameState.debateEndsAt && (
            <div className="text-center mb-6">
              <Timer endsAt={gameState.debateEndsAt} />
              {debateEndingWarning && (
                <div className="mt-2 text-red-500 font-medium animate-pulse">
                  {debateEndingWarning} seconds left!
                </div>
              )}
            </div>
          )}

          {/* Debate Phase Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Discuss!</h2>
            <p className="text-gray-600 mb-4">
              Talk with your group about how to rank these items.
              When the timer ends, you&apos;ll start ranking together.
            </p>

            {/* Items Preview */}
            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-purple-700 mb-2">Items to rank:</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {gameState.items.map((item) => (
                  <span
                    key={item.id}
                    className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 shadow-sm"
                  >
                    {item.text}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="bg-white rounded-xl p-3 mb-4">
            <PlayerList players={gameState.players} currentPlayerId={myId} showAvatar />
          </div>

          {/* Skip Button (Host only) */}
          {isHost && (
            <button
              onClick={handleSkipDebate}
              className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl transition-colors"
            >
              Skip to Ranking
            </button>
          )}
        </div>

        {/* Reaction Bar */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white rounded-full shadow-lg px-4 py-2">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction}
              onClick={() => handleSendReaction(reaction)}
              className="text-2xl hover:scale-125 transition-transform active:scale-90"
            >
              {reaction}
            </button>
          ))}
        </div>

        {/* Floating Reactions */}
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="fixed pointer-events-none"
            style={{
              left: `${reaction.leftPosition}%`,
              bottom: "100px",
              animation: "float-up 2s ease-out forwards",
            }}
          >
            <span className="text-4xl">{reaction.type}</span>
            <span className="text-xs text-gray-600 block text-center">{reaction.playerName}</span>
          </div>
        ))}
      </div>
    );
  }

  // PLAYING VIEW
  if (gameState.status === "playing") {
    const isBlindMode = gameState.settings.gameMode === "blind";
    const isSpectator = me?.isSpectator ?? false;
    const activePlayers = Object.values(gameState.players).filter((p) => !p.isSpectator);
    const allSatisfied = activePlayers.every((p) => p.satisfied);

    // Items to display (blind mode uses local state)
    const displayItems = isBlindMode ? blindItems : gameState.items;

    // Compute which items are being dragged by other players (not in blind mode)
    const otherDraggers: Record<string, { name: string; color: string }> = {};
    if (!isBlindMode) {
      const playerIds = Object.keys(gameState.players);
      Object.values(cursors).forEach((cursor) => {
        if (cursor.playerId !== myId && cursor.draggingItem) {
          // Find the item being dragged by matching text
          const item = gameState.items.find((i) => i.text === cursor.draggingItem);
          if (item) {
            const player = gameState.players[cursor.playerId];
            const playerIndex = playerIds.indexOf(cursor.playerId);
            otherDraggers[item.id] = {
              name: player?.name || "Someone",
              color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
            };
          }
        }
      });
    }

    // Get active item for drag overlay
    const activeItem = activeId ? displayItems.find((i) => i.id === activeId) : null;
    const activeIndex = activeItem ? displayItems.indexOf(activeItem) : -1;

    // Custom drag handler for blind mode
    const handleBlindDragEnd = (event: DragEndEvent) => {
      setActiveId(null);
      setDraggingItem(null);

      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = blindItems.findIndex((item) => item.id === active.id);
      const newIndex = blindItems.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(blindItems, oldIndex, newIndex);

      setBlindItems(newItems);
    };

    return (
      <div className={`min-h-screen p-4 ${isBlindMode ? "bg-gradient-to-br from-amber-50 to-orange-50" : "bg-gradient-to-br from-blue-50 to-purple-50"}`}>
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-500">
              {isBlindMode ? (
                <span className="text-amber-600 font-medium">
                  Blind Mode - {activePlayers.filter((p) => p.satisfied).length}/{activePlayers.length} submitted
                </span>
              ) : gameState.settings.finishMode === "consensus" ? (
                <span>
                  {activePlayers.filter((p) => p.satisfied).length}/{activePlayers.length} satisfied
                </span>
              ) : (
                gameState.timerEndsAt && <Timer endsAt={gameState.timerEndsAt} />
              )}
            </div>
            <div className="text-sm font-mono text-gray-400">{roomId}</div>
          </div>

          {/* Spectator Notice */}
          {isSpectator && (
            <div className="bg-gray-100 text-gray-600 text-center py-2 px-4 rounded-lg mb-4 text-sm">
              You are spectating. Enjoy the show!
            </div>
          )}

          {/* Blind Mode Instructions */}
          {isBlindMode && !isSpectator && !me?.satisfied && (
            <div className="bg-amber-100 text-amber-800 text-center py-2 px-4 rounded-lg mb-4 text-sm">
              Rank the items privately. Others can&apos;t see your moves!
            </div>
          )}

          {/* Already Submitted Notice */}
          {isBlindMode && me?.satisfied && (
            <div className="bg-green-100 text-green-800 text-center py-2 px-4 rounded-lg mb-4 text-sm">
              Ranking submitted! Waiting for others...
            </div>
          )}

          {/* Sortable List */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={isBlindMode ? handleBlindDragEnd : handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={displayItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {displayItems.map((item, index) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      index={index}
                      otherDraggerName={otherDraggers[item.id]?.name}
                      otherDraggerColor={otherDraggers[item.id]?.color}
                      disabled={isSpectator || (isBlindMode && me?.satisfied)}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{
                duration: 200,
                easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
              }}>
                {activeItem ? (
                  <DragOverlayItem item={activeItem} index={activeIndex} />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Blind Mode Submit */}
          {isBlindMode && !isSpectator && !me?.satisfied && (
            <button
              onClick={handleSubmitBlindRanking}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors text-lg mb-4"
            >
              Submit My Ranking
            </button>
          )}

          {/* Satisfaction (Consensus mode, not blind) */}
          {gameState.settings.finishMode === "consensus" && !isBlindMode && !isSpectator && (
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

          {/* Player list for blind mode */}
          {isBlindMode && (
            <div className="bg-white rounded-xl p-3">
              <PlayerList
                players={gameState.players}
                currentPlayerId={myId}
                showSatisfied
              />
            </div>
          )}
        </div>

        {/* Reaction Bar */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white rounded-full shadow-lg px-4 py-2">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction}
              onClick={() => handleSendReaction(reaction)}
              className="text-2xl hover:scale-125 transition-transform active:scale-90"
            >
              {reaction}
            </button>
          ))}
          {gameState.settings.finishMode === "timed" && !me?.votedMoreTime && !isSpectator && (
            <button
              onClick={handleRequestMoreTime}
              className="ml-2 px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 transition-colors"
            >
              +30s
            </button>
          )}
        </div>

        {/* Floating Reactions */}
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="fixed pointer-events-none animate-bounce"
            style={{
              left: `${reaction.leftPosition}%`,
              bottom: "100px",
              animation: "float-up 2s ease-out forwards",
            }}
          >
            <span className="text-4xl">{reaction.type}</span>
            <span className="text-xs text-gray-600 block text-center">{reaction.playerName}</span>
          </div>
        ))}

        {/* Time Extended Toast */}
        {timeExtendedToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
            {timeExtendedToast}
          </div>
        )}

        {/* Other players' cursors (not in blind mode) */}
        {!isBlindMode && Object.values(cursors).map((cursor) => (
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

          {/* Share Button */}
          <button
            onClick={() => {
              const text = (gameState.finalList || gameState.items)
                .map((item, i) => `${i + 1}. ${item.text}`)
                .join("\n");
              const shareText = `Our List Up ranking:\n\n${text}\n\nPlay at listup.app`;
              navigator.clipboard.writeText(shareText);
              alert("Copied to clipboard!");
            }}
            className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl transition-colors mb-3"
          >
            Share List
          </button>

          {/* Players */}
          <div className="mt-6 bg-white rounded-xl p-3">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Players</h3>
            <PlayerList players={gameState.players} currentPlayerId={myId} showAvatar />
          </div>

          {/* Session History */}
          {sessionHistory.length > 1 && (
            <div className="mt-6 bg-white rounded-xl p-3">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Session History ({sessionHistory.length} rounds)
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {sessionHistory.slice(0, -1).reverse().map((round, i) => (
                  <div key={round.timestamp} className="text-sm">
                    <div className="font-medium text-gray-600 mb-1">
                      Round {sessionHistory.length - 1 - i}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {round.items.slice(0, 5).map((item, j) => (
                        <span key={item.id} className="text-gray-500">
                          {j + 1}. {item.text}
                          {j < 4 && j < round.items.length - 1 ? "," : ""}
                        </span>
                      ))}
                      {round.items.length > 5 && (
                        <span className="text-gray-400">+{round.items.length - 5} more</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
