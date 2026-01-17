# List Up

> Chaotic multiplayer ranking. No turns. No rules. Just vibes.

## What is this?

A party game where everyone sorts a list at the same time. Think Google Docs but for ranking things, and everyone's fighting over the order.

**Example scenarios:**
- Rank these ice cream flavors (but by what criteria? WHO KNOWS)
- Sort these countries (by size? preference? vibes?)
- Order these phone models (price? looks? battery?)

The chaos is the point. When everyone finally agrees, you get your list.

## How to Play

1. Create a room, share the code with friends
2. Pick a preset pack, browse community packs, or add your own words
3. Choose your game mode and settings
4. Start the game
5. DRAG THINGS AROUND (everyone at once, or privately in Blind mode)
6. Game ends based on your finish mode

## Game Modes

### Finish Modes
- **Consensus**: Game ends when everyone clicks "I'm Satisfied"
- **Timed**: Game ends when the timer runs out (30s / 1min / 2min / 3min)
- **Blitz**: Quick 30-second chaos mode

### Game Variants
- **Classic**: Everyone ranks together in real-time. Pure chaos.
- **Debate**: Discussion phase first, then rank together. Great for strategic groups.
- **Blind**: Everyone ranks privately. Results aggregated via Borda count voting.

### Spectator Mode
Join as a spectator to watch the chaos unfold without participating.

## Features

- **20+ Preset Packs**: Curated lists across Food, Entertainment, Lifestyle, Sports, and more
- **Community Packs**: Browse and use packs shared by other players, or share your own
- **Mix Mode**: Combine multiple packs into one shuffled list
- **Real-time Cursors**: See where everyone is dragging
- **Reactions**: Send emoji reactions during the game
- **Avatars**: Pick from 16 emoji avatars
- **Session History**: View past rankings from your session

## Tech Stack

- **Next.js 16** - React 19 framework
- **PartyKit** - Real-time multiplayer sync
- **Supabase** - Community packs database
- **dnd-kit** - Drag and drop
- **Tailwind CSS 4** - Styling

## Development

```bash
# Install dependencies
npm install

# Run Next.js dev server
npm run dev

# Run PartyKit server (in another terminal)
npx partykit dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full development plan.
