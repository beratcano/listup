# List Up - Roadmap

## Vision

A chaotic multiplayer ranking game where players collaboratively (and chaotically) sort a list of items. No turns, no rules, no criteria - just pure collaborative chaos until everyone agrees.

## Core Concept

- Players are given a set of words/items (countries, ice cream flavors, phone models, anything)
- Everyone can drag and reorder items simultaneously - no queue, no turns
- No instructions on HOW to rank - by quality? by preference? alphabetically? who knows!
- The chaos IS the game
- Game ends when: everyone clicks "I'm satisfied" (consensus) OR timer runs out (timed mode)

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Real-time sync**: PartyKit
- **Drag & Drop**: dnd-kit
- **IDs**: nanoid

---

## Phase 1: MVP - The Chaos Core

### 1.1 Room System
- [x] Create room with unique code
- [x] Join room via code
- [x] Display connected players
- [x] Host selects finish mode when creating room:
  - **Consensus**: Game ends when ALL players are satisfied
  - **Timed**: Game ends when timer runs out (30s / 1min / 2min / custom)
- [x] Host can start the game

### 1.2 Word Selection
Host chooses one of two modes:

- [x] **Prebuilt Packs**: Curated word groups we provide
  - 20+ packs across 5 categories
  - [x] Option to use full pack or random subset (5/7/10/15 items)

- [x] **Custom List**: Write your own
  - Text input (newline or comma separated)
  - Perfect for niche lists (60 favorite rappers, your friend group's inside jokes, etc.)
  - No limit on items (chaos scales with count)

- [x] Items displayed as draggable cards

### 1.3 Real-time Chaos
- [x] Drag-and-drop reordering
- [x] Real-time sync across all players
- [x] Visual feedback when someone moves an item (cursor/highlight)
- [x] No locking - anyone can grab anything anytime

### 1.4 Finish System
- [x] **Consensus mode:**
  - "I'm satisfied" button for each player
  - Show who is satisfied (checkmarks next to names)
  - When ALL satisfied → lock the list, show final result
  - Reset satisfaction when list changes (you moved it, you're not satisfied anymore!)
- [x] **Timed mode:**
  - Visible countdown timer for all players
  - When timer hits zero → lock the list, show final result
  - [x] Optional: Players can vote to add more time (+30s, once per player)

---

## Phase 2: Polish & Feel

### 2.1 Visual Chaos
- [x] Show other players' cursors in real-time
- [x] Color-coded player actions (8 player colors)
- [x] Smooth animations for item movement (DragOverlay + CSS transitions)
- [x] Conflict animations when two people grab same item (pulse + name badge)

### 2.2 Game Flow
- [x] "New round" with same players (keep room, new items)
- [x] History of past rankings in the session
- [x] Share final list (copy to clipboard)

### 2.3 Sound & Feedback
- [ ] Subtle sounds for movements
- [ ] Notification when someone satisfies
- [ ] Celebration when all agree
- Note: Sound effects require audio files, deferred for now

---

## Phase 3: Social & Fun

### 3.1 Word Packs (Expansion)
- [x] More curated themed packs (20+ packs across 5 categories)
- [x] Pack categories (Food, Entertainment, Lifestyle, Sports, Misc)
- [x] Random subset option (use 5/7/10/15 items from a pack)
- [x] Random mix mode (combine items from multiple packs)
- [x] Community-submitted packs (users share their custom lists publicly)
- [x] Browse and use community packs with play counts and upvotes

### 3.2 Game Modes (Variations)
- [x] Classic: Pure chaos (consensus finish)
- [x] Blitz: Very short timer (30s max chaos) - Quick preset button
- [x] Debate: Discussion phase before ranking begins (configurable timer)
- [x] Blind: Can't see others' moves until final reveal (Borda count aggregation)

### 3.3 Social Features
- [x] Player avatars/emojis (16 emoji avatars)
- [x] Quick reactions (👍👎😂🔥💀 with floating animation)
- [ ] Chat or voice integration
- [x] Spectator mode (view-only participants, excluded from game logic)

---

## Phase 4: Scale & Monetize (Optional)

### 4.1 Accounts
- [ ] Optional sign-up
- [ ] Save favorite word packs
- [ ] Stats and history

### 4.2 Premium Features
- [ ] Custom themes
- [ ] Larger rooms
- [ ] Premium word packs

---

## Design Principles

1. **Chaos is a feature** - Don't try to prevent conflicts, embrace them
2. **Zero friction** - Join a game in seconds, no signup required
3. **Mobile-first** - Touch drag should feel natural
4. **Instant feedback** - Every action should feel responsive
5. **No wrong answers** - The criteria is whatever players decide

---

## Open Questions

- Maximum number of players per room?
- How many items is ideal? (5-10 feels manageable, 20+ is pure chaos)
- Should items have images or just text?
- Timed mode: Should players be able to vote for more time mid-game?

---

## Getting Started

```bash
npm install              # Install dependencies
npm run dev              # Start Next.js dev server
npx partykit dev         # Start PartyKit server (port 1999)
```

Open http://localhost:3000 to play.
