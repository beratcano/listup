# List Up - Project Context

## Overview
**List Up** is a real-time multiplayer ranking game where players collaboratively (and chaotically) sort lists simultaneously. Built with Next.js and PartyKit for real-time synchronization.

**Tagline**: "Chaotic multiplayer ranking. No turns. No rules. Just vibes."

## Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Real-time**: PartyKit (serverless multiplayer platform)
- **Database**: Supabase (community packs storage)
- **Drag & Drop**: dnd-kit
- **IDs**: nanoid

## Project Structure
```
src/
├── app/
│   ├── page.tsx              # Landing page (create/join room)
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Tailwind imports
│   └── room/[id]/page.tsx    # Game room (main gameplay)
├── components/
│   ├── SortableItem.tsx      # Draggable list item + DragOverlayItem
│   ├── PlayerList.tsx        # Connected players display
│   ├── Timer.tsx             # Countdown timer
│   └── Cursor.tsx            # Remote player cursor
└── lib/
    ├── types.ts              # Shared TypeScript types
    ├── presets.ts            # Word packs & utilities
    └── supabase.ts           # Supabase client & community pack functions

party/
└── index.ts                  # PartyKit server (game state)
```

## Key Commands
```bash
npm run dev          # Start Next.js dev server
npx partykit dev     # Start PartyKit server (port 1999)
npm run build        # Production build
npm run lint         # Run ESLint
```

## Game Flow
1. **Landing** → Enter name, create or join room via 6-char code (optional: join as spectator)
2. **Lobby** → Host selects items (preset, community, or custom), configures settings
3. **Debating** (Debate mode only) → Discussion phase before ranking
4. **Playing** → Real-time drag-and-drop, see other players' cursors (or private ranking in Blind mode)
5. **Finished** → View final ranked list, option for new round

## Game Modes

### Finish Modes
- **Consensus (Chill)**: Game ends when ALL players click "I'm Satisfied"
- **Timed**: Game ends when countdown reaches zero (30s/60s/120s/180s)
- **Blitz**: Quick preset - 30 second timed mode for maximum chaos
- Players can vote for +30s more time (once per player) in timed mode

### Game Mode Variants
- **Classic**: Pure chaos - everyone ranks together in real-time
- **Debate**: Discussion phase (30s/60s/120s/180s) before ranking begins. Host can skip.
- **Blind**: Each player ranks privately. Final list computed via Borda count voting. Results revealed at end.

### Spectator Mode
- Join as spectator from landing page (checkbox option)
- View-only: cannot drag items or vote satisfaction
- Excluded from consensus calculations
- Shown with "Spectator" badge in player list

## Message Protocol (WebSocket)

### Client → Server
- `join` - Join room with player name, avatar, and optional `asSpectator` flag
- `update-settings` - Change game settings (host only)
- `set-items` - Set ranking items (host only)
- `start-game` - Begin game (host only)
- `reorder` - Update item order (classic/debate modes)
- `toggle-satisfied` - Toggle satisfaction (consensus mode)
- `request-more-time` - Request +30s timer extension
- `new-round` - Start new round (host only)
- `cursor-move` - Broadcast cursor position
- `set-avatar` - Change player avatar
- `send-reaction` - Send emoji reaction
- `skip-debate` - Skip debate phase early (host only, debate mode)
- `submit-blind-ranking` - Submit personal ranking (blind mode)

### Server → Client
- `sync` - Full game state sync
- `player-joined` / `player-left` - Player events
- `cursor-update` - Remote cursor positions
- `reaction` - Broadcast emoji reaction
- `time-extended` - Timer extended notification
- `debate-ending` - Warning when debate phase ending soon
- `blind-reveal` - Trigger reveal of blind mode results
- `error` - Error messages

## Types (src/lib/types.ts)
- `Player`: id, name, satisfied, isHost, avatar, votedMoreTime, isSpectator, blindItems
- `Item`: id, text
- `GameState`: status (lobby/debating/playing/finished), items, players, settings, timerEndsAt, debateEndsAt, finalList
- `RoomSettings`: finishMode, timerDuration, gameMode (classic/debate/blind), debateDuration
- `PlayerCursor`: playerId, x, y, draggingItem
- `Reaction`: playerId, playerName, type, timestamp
- `ReactionType`: 👍 | 👎 | 😂 | 🔥 | 💀
- `AVATARS`: 16 emoji avatars
- `REACTIONS`: 5 reaction emojis

## Environment Variables
```
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Visual Features
- **DragOverlay**: Smooth drag preview that floats above items
- **Animations**: CSS transitions with cubic-bezier easing, bouncy drop effect
- **Conflict detection**: Items being dragged by others show pulse + name badge
- **Cursors**: Real-time cursor tracking with player colors (disabled in blind mode)

## Word Packs

### Preset Packs
- **20+ preset packs** across 5 categories: Food, Entertainment, Lifestyle, Sports, Misc
- **Category filter** in lobby to browse packs
- **Subset option**: Use 5/7/10/15 random items from a pack
- **Mix mode**: Combine multiple packs into one shuffled list
- Key functions in `presets.ts`:
  - `packToItems()` - Full pack
  - `packToItemsSubset()` - Random subset
  - `mixPacks()` - Combine multiple packs
  - `categoryNames` - Display names for categories

### Community Packs (Supabase)
- **Browse**: View community-submitted packs sorted by upvotes/plays
- **Filter**: By category (same categories as preset packs)
- **Use**: Apply a community pack with optional subset
- **Share**: Submit your current items as a new community pack
- **Tracking**: Play counts and upvotes stored in database
- Key functions in `supabase.ts`:
  - `getCommunityPacks()` - Fetch with sorting/filtering
  - `createCommunityPack()` - Submit new pack
  - `incrementPlays()` - Track usage
  - `upvotePack()` - Upvote a pack

## Social Features
- **Avatars**: 16 emoji avatars, stored in localStorage
- **Reactions**: 5 emoji reactions (👍👎😂🔥💀) with floating animation
- **Session History**: Past rankings stored client-side, shown in finished view
- **Share**: Copy final list to clipboard in shareable text format
- **Spectator Mode**: Watch games without participating

## Notes
- Cursor updates throttled to 20/sec (50ms)
- Room codes: 6-char alphanumeric (no confusing chars 0/O, 1/I)
- 8 player colors for cursor identification
- Host is first player to join a room
- Satisfaction resets when list order changes (consensus mode)
- Avatar stored in localStorage as "listup-avatar"
- Spectator flag stored in localStorage as "listup-spectator" (cleared after use)
- Blind mode uses Borda count voting: higher rank = more points, ties broken by item order
- Debate phase has 10-second warning before transitioning to playing
