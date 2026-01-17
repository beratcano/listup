# List Up - Roadmap

## Vision

A chaotic multiplayer ranking game where players collaboratively (and chaotically) sort a list of items. No turns, no rules, no criteria - just pure collaborative chaos until everyone agrees.

## Core Concept

- Players are given a set of words/items (countries, ice cream flavors, phone models, anything)
- Everyone can drag and reorder items simultaneously - no queue, no turns
- No instructions on HOW to rank - by quality? by preference? alphabetically? who knows!
- The chaos IS the game
- Game ends when: everyone clicks "I'm satisfied" (consensus) OR timer runs out (timed mode)

## Tech Stack (TBD)

- **Frontend**: React/Next.js or SvelteKit
- **Real-time sync**: Socket.io, Supabase Realtime, or PartyKit
- **Backend**: Node.js or serverless functions
- **Database**: Supabase/PostgreSQL or Firebase

---

## Phase 1: MVP - The Chaos Core

### 1.1 Room System
- [ ] Create room with unique code
- [ ] Join room via code
- [ ] Display connected players
- [ ] Host selects finish mode when creating room:
  - **Consensus**: Game ends when ALL players are satisfied
  - **Timed**: Game ends when timer runs out (30s / 1min / 2min / custom)
- [ ] Host can start the game

### 1.2 Word Selection
Host chooses one of two modes:

- [ ] **Prebuilt Packs**: Curated word groups we provide
  - US States (50 items)
  - Countries
  - Ice cream flavors
  - Car brands
  - Movie genres
  - etc.
  - Option to use full pack or random subset (e.g., "10 random states")

- [ ] **Custom List**: Write your own
  - Text input (newline or comma separated)
  - Perfect for niche lists (60 favorite rappers, your friend group's inside jokes, etc.)
  - No limit on items (chaos scales with count)

- [ ] Items displayed as draggable cards

### 1.3 Real-time Chaos
- [ ] Drag-and-drop reordering
- [ ] Real-time sync across all players
- [ ] Visual feedback when someone moves an item (cursor/highlight)
- [ ] No locking - anyone can grab anything anytime

### 1.4 Finish System
- [ ] **Consensus mode:**
  - "I'm satisfied" button for each player
  - Show who is satisfied (checkmarks next to names)
  - When ALL satisfied → lock the list, show final result
  - Reset satisfaction when list changes (you moved it, you're not satisfied anymore!)
- [ ] **Timed mode:**
  - Visible countdown timer for all players
  - When timer hits zero → lock the list, show final result
  - Optional: Players can vote to add more time

---

## Phase 2: Polish & Feel

### 2.1 Visual Chaos
- [ ] Show other players' cursors in real-time
- [ ] Color-coded player actions
- [ ] Smooth animations for item movement
- [ ] Conflict animations when two people grab same item

### 2.2 Game Flow
- [ ] "New round" with same players (keep room, new items)
- [ ] History of past rankings in the session
- [ ] Share final list (image/link)

### 2.3 Sound & Feedback
- [ ] Subtle sounds for movements
- [ ] Notification when someone satisfies
- [ ] Celebration when all agree

---

## Phase 3: Social & Fun

### 3.1 Word Packs (Expansion)
- [ ] More curated themed packs (expand from Phase 1)
- [ ] Community-submitted packs (users share their custom lists publicly)
- [ ] Pack ratings and popularity
- [ ] Random mix mode (combine items from multiple packs)

### 3.2 Game Modes (Variations)
- [ ] Classic: Pure chaos (consensus finish)
- [ ] Blitz: Very short timer (30s max chaos)
- [ ] Debate: Discussion phase before ranking begins
- [ ] Blind: Can't see others' moves until final reveal

### 3.3 Social Features
- [ ] Player avatars/emojis
- [ ] Quick reactions (agree/disagree emotes)
- [ ] Chat or voice integration
- [ ] Spectator mode

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
# TODO: Add setup instructions after tech stack decision
```
