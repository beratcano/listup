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

1. Create a room, pick finish mode (consensus or timed), share the code
2. Add your own words or pick a preset pack
3. Start the game
4. DRAG THINGS AROUND (everyone at once)
5. Game ends when:
   - **Consensus**: Everyone clicks "I'm satisfied" -> final list revealed
   - **Timed**: Timer runs out -> final list revealed

## Tech Stack

- **Next.js** - React framework
- **PartyKit** - Real-time multiplayer
- **dnd-kit** - Drag and drop
- **Tailwind CSS** - Styling

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

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full development plan.
