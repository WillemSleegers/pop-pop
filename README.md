# Pop Pop

A fun merge puzzle game inspired by Suika Game, built with Next.js and Matter.js physics.

## About

Pop Pop is a physics-based merging game where you drop colored circles into a container. When two circles of the same level touch, they merge into a larger circle. The goal is to score as many points as possible by creating bigger and bigger circles without letting them overflow past the danger line.

## Features

- **Physics-Based Gameplay**: Realistic circle physics powered by Matter.js, running at a fixed 60 Hz on every display
- **Progressive Merging**: 11 levels of circles to unlock by merging
- **Two Game Modes**: Relax (drop at your own pace) and Speed (circles auto-drop faster as you score)
- **Power-Up System**: Earn a bomb every 1000 points to destroy a single circle
- **Leaderboards**: Weekly and all-time top scores per game mode
- **Color Palettes & Themes**: Six palettes plus dark/light theme
- **Responsive Design**: Same gameplay on desktop and mobile; the playfield scales to your screen

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19
- **Physics Engine**: Matter.js
- **Database**: Neon Postgres (leaderboard)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Theme Management**: next-themes for dark/light mode
- **Testing**: Vitest
- **Language**: TypeScript

## Getting Started

Install dependencies:

```bash
pnpm install
```

For the leaderboard, add a Neon connection string as `DATABASE_URL` in `.env.local`, then create the table:

```bash
pnpm db:setup
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to play the game.

## Testing

```bash
pnpm test
```

Runs unit tests for the game logic and headless Matter.js simulations.

## Building for Production

```bash
pnpm build
pnpm start
```

## How to Play

1. Choose a game mode and color palette, then press Start Game
2. Move your mouse (or finger on mobile) to position the preview circle
3. Click (or tap) to drop the circle into the container
4. Match circles of the same color/level to merge them
5. Earn points with each merge - higher level merges give more points
6. Earn a bomb power-up every 1000 points to destroy a single circle
7. Avoid letting circles stay above the danger line for too long or it's game over!

## Project Structure

```text
├── app/                     # Next.js app directory
│   └── api/scores/          # Leaderboard API routes
├── components/              # React components
│   ├── suika-game.tsx       # Main game component (game loop, UI)
│   └── ui/                  # shadcn/ui components
├── lib/                     # Game logic and utilities
│   ├── physics.ts           # Matter.js physics engine wrapper
│   ├── game-state.ts        # Game state management and rules
│   ├── renderer.ts          # Canvas rendering
│   ├── input-handler.ts     # Mouse/touch input handling
│   ├── game-config.ts       # Game constants and configuration
│   ├── db.ts                # Neon database client
│   └── leaderboard.ts       # Shared leaderboard queries and validation
├── scripts/                 # Database setup and icon generation
└── public/assets/sounds/    # Sound effects
```

## License

MIT

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
