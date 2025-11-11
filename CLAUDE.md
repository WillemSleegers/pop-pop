# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pop Pop is a physics-based merge puzzle game (similar to Suika/Watermelon Game) built with Next.js 15 and Matter.js. Players drop colored circles that merge when matching circles collide, scoring points and creating progressively larger circles.

## Development Commands

```bash
# Development server with Turbopack (default port 3000)
npm run dev

# Production build with Turbopack
npm run build

# Run production build
npm start

# Linting
npm run lint
```

## Architecture Overview

### Game Loop Architecture

The game uses a **requestAnimationFrame-based game loop** (SuikaGame.tsx:141-180) that orchestrates four independent systems:

1. **PhysicsEngine** (lib/physics.ts) - Matter.js wrapper running at 60 FPS
2. **GameStateManager** (lib/gameState.ts) - Authoritative game logic and rules
3. **Renderer** (lib/renderer.ts) - Canvas-based rendering with DPI scaling
4. **InputHandler** (lib/inputHandler.ts) - Unified mouse/touch event handling

**Critical Flow:**
```
Input → GameState (logic) → Physics (simulation) → Renderer (visuals)
                ↓
         React State (UI updates)
```

### State Management Pattern

The codebase uses a **hybrid state management approach**:

- **React State** (SuikaGame.tsx): UI-only state (score, status, powerUps, destroyMode, colorPalette)
- **GameStateManager**: Authoritative game logic independent of React
- **Physics Engine**: Matter.js maintains physics bodies, synced bidirectionally with game state

State flows ONE direction per frame: GameState → React (never React → GameState during gameplay).

### Critical Game Mechanics

**Drop Availability System** (gameState.ts:148-163):
- After dropping a circle, `canDrop` flag prevents new drops
- Only re-enables when the dropped circle clears `DANGER_LINE_Y` (y=80)
- Preview circle tracks `lastMouseX` to restore position when drop becomes available
- This prevents spam-dropping and maintains game balance

**Merge Detection** (gameState.ts:165-211):
- Runs every frame during game loop
- Uses 5% touch tolerance (`distance <= touchDistance * 1.05`)
- Immediately marks circles as `merged: true` to prevent duplicate processing
- Creates new circle at midpoint with averaged velocity
- Sound callback fires **immediately** on merge detection (before physics removal)

**Game Over Logic** (gameState.ts:269-290):
- Starts 2-second timer when any circle top edge crosses `DANGER_LINE_Y`
- Timer resets if all circles clear the line
- Only triggers game over if circles remain above line for full timeout

**Power-Up System**:
- Awards 1 bomb every 1000 points (max 1 stored)
- Destroy mode changes cursor and adds red border to canvas
- Click/touch handling calculates logical coordinates from canvas rect

### Component Initialization Flow

**SuikaGame.tsx useEffect** (lines 63-138):
1. Waits 100ms for DOM to settle
2. Gets actual container dimensions (excluding borders)
3. Creates all game systems with matching dimensions
4. Sets up input callbacks
5. Starts game loop
6. Auto-starts game in 'playing' status

**Critical:** Renderer handles canvas DPI scaling internally. Always pass logical dimensions (container size) to all systems.

### Audio Architecture

Uses **Web Audio API** for low-latency merge sounds:
- AudioContext created with `latencyHint: 'interactive'` (line 36)
- Audio buffer loaded once and reused (lines 42-48)
- Each merge creates new BufferSource → GainNode → Destination chain (lines 83-91)
- Volume: 0.5 gain

### Physics System Details

**Matter.js Configuration** (physics.ts:32-47):
- Gravity: `{ x: 0, y: 1 }` (downward)
- Circle properties: restitution 0.1 (low bounce), friction 0.1, air resistance 0.01, density 0.001
- Container has 3 walls (bottom, left, right) with 50px thickness
- No top wall (circles can theoretically leave upward, though gravity prevents this)

**Body Syncing** (physics.ts:63-103):
- Creates new Matter body when circle first appears
- Syncs static flag changes (for preview circle)
- Removes bodies when circles deleted (merges, power-ups)
- Position sync is ONE-WAY: Matter → Circle (except for static circles)

### Canvas Rendering

**Renderer** (lib/renderer.ts):
- Handles Retina/HiDPI via `devicePixelRatio` scaling
- Canvas dimensions set to logical size × DPI
- Draw operations use logical coordinates (renderer scales internally)
- Color palettes defined in gameConfig.ts (6 options: green, blue, purple, orange, pink, rainbow)
- Palette changes update renderer via `setColors()` without recreation

### Configuration Constants

All game balance tuning in **lib/gameConfig.ts**:
- `FRUIT_LEVELS = 11` (levels 0-10)
- `FRUIT_RADII` array (15px to 135px)
- `MERGE_POINTS` array (1, 2, 4, 8... 1024 exponential)
- `DANGER_LINE_Y = 80` (game over threshold)
- `DANGER_LINE_TIMEOUT = 2000` (2 seconds)
- `DROP_ZONE_HEIGHT = 80` (where preview circle hovers)

### Theme System

Uses **next-themes** with system preference detection:
- OKLCH color space in globals.css for perceptual uniformity
- CSS custom properties for dynamic theming
- ThemeProvider wraps app in layout.tsx
- ThemeToggle component in header

## Common Implementation Patterns

**Adding New Game Features:**
1. Add configuration to `gameConfig.ts`
2. Update `GameStateManager` for logic (pure, no React dependencies)
3. Sync React state in game loop (SuikaGame.tsx:167-170)
4. Update UI rendering in SuikaGame.tsx return statement

**Modifying Physics:**
- Always update `physics.ts` for simulation changes
- Ensure bidirectional sync in `syncToPhysics`/`syncFromPhysics`
- Test with different circle counts (physics can degrade with 50+ bodies)

**Audio Changes:**
- Load audio files in first useEffect (SuikaGame.tsx:33-53)
- Store buffers in refs for reuse
- Create new source nodes per playback (buffers are reusable, sources are single-use)

## Known Constraints

- No TypeScript tests configured (no jest/vitest setup)
- No top wall in physics container (intentional design choice)
- Power-up award discrepancy: README says every 100 points, code implements every 1000 points (gameState.ts:239-246)
- Canvas touch events use `touchAction: 'none'` normally, switches to `'auto'` in destroy mode
- Input has 200ms cooldown between drops (inputHandler.ts implementation)

## Dependencies

- **Matter.js 0.20.0**: 2D physics engine (core gameplay dependency)
- **next-themes 0.4.6**: Theme management with system detection
- **shadcn/ui**: Button, Card, DropdownMenu components (Radix UI primitives)
- **Tailwind CSS 4**: Styling with PostCSS
- **Lucide React**: Icon library (Bomb icon for power-ups)
