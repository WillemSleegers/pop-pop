# Pop Pop

A fun merge puzzle game inspired by Suika Game, built with Next.js and Matter.js physics.

## About

Pop Pop is a physics-based merging game where you drop colored circles into a container. When two circles of the same level touch, they merge into a larger circle. The goal is to score as many points as possible by creating bigger and bigger circles without letting them overflow past the danger line.

## Features

- **Physics-Based Gameplay**: Realistic circle physics powered by Matter.js
- **Progressive Merging**: 11 levels of circles to unlock by merging
- **Power-Up System**: Earn bomb power-ups every 100 points to destroy circles
- **Dark/Light Theme**: Built-in theme toggle for comfortable playing
- **Responsive Design**: Works on both desktop and mobile devices
- **Smooth Animations**: 60 FPS gameplay with optimized rendering

## Tech Stack

- **Framework**: Next.js 15.5.6 with App Router
- **Physics Engine**: Matter.js for realistic 2D physics
- **Styling**: Tailwind CSS with shadcn/ui components
- **Theme Management**: next-themes for dark/light mode
- **Language**: TypeScript

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to play the game.

## Building for Production

```bash
npm run build
npm start
```

## How to Play

1. Move your mouse (or finger on mobile) to position the preview circle
2. Click (or tap) to drop the circle into the container
3. Match circles of the same color/level to merge them
4. Earn points with each merge - higher level merges give more points
5. Earn a bomb power-up every 100 points to destroy a single circle
6. Avoid letting circles stay above the danger line for too long or it's game over!

## Project Structure

```
├── app/                  # Next.js app directory
├── components/          # React components
│   ├── SuikaGame.tsx   # Main game component
│   └── ui/             # shadcn/ui components
├── lib/                # Game logic and utilities
│   ├── physics.ts      # Matter.js physics engine wrapper
│   ├── gameState.ts    # Game state management
│   ├── renderer.ts     # Canvas rendering
│   ├── inputHandler.ts # Mouse/touch input handling
│   └── gameConfig.ts   # Game constants and configuration
└── assets/             # Game assets
    └── sounds/         # Sound effects
```

## License

MIT

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
