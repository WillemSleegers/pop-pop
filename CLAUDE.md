# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pop Pop is a physics-based merge puzzle game (similar to Suika/Watermelon Game) built with Next.js 16, React 19 and Matter.js. Players drop colored circles that merge when matching circles collide, scoring points and creating progressively larger circles. Scores are saved to a Neon Postgres leaderboard.

## Commands

- `pnpm dev` - Dev server (Turbopack)
- `pnpm build` / `pnpm start` - Production build and server
- `pnpm lint` - ESLint
- `pnpm test` - Vitest (game logic + headless physics tests)
- `pnpm exec tsc --noEmit -p .` - Type-check
- `pnpm db:setup` - Create the `scores` table (needs `DATABASE_URL` in `.env.local`)

## Architecture Overview

### Game Loop Architecture

The game uses a **requestAnimationFrame loop with a fixed-timestep accumulator** (`startGameLoop` in suika-game.tsx). Each frame adds the elapsed time (clamped to `MAX_FRAME_TIME_MS`) to an accumulator, then runs fixed `PHYSICS_STEP_MS` (60 Hz) steps until it is drained. Game speed is therefore independent of display refresh rate (60/120/144 Hz).

Four independent systems:

1. **PhysicsEngine** (lib/physics.ts) - Matter.js wrapper, one fixed step per `update()`
2. **GameStateManager** (lib/game-state.ts) - Authoritative game logic and rules, advanced by `tick(dtMs)`
3. **Renderer** (lib/renderer.ts) - Canvas rendering, scales the logical world to the displayed canvas
4. **InputHandler** (lib/input-handler.ts) - Unified mouse/touch handling, converts to world coordinates

**Per step:**

```text
physics.update(circles) → gameState.tick(PHYSICS_STEP_MS) → gameState.checkGameOver()
```

**Per frame (after steps):** sync React UI state, then `renderer.render(...)`.

`tick()` advances the game clock, removes escaped circles, updates drop availability, grows merged circles, checks merges, updates particles and runs speed mode auto-drop.

### Fixed Logical World

All game systems use a fixed **400×600 logical world** (`CONTAINER_WIDTH` × `CONTAINER_HEIGHT`). Radii, gravity, danger line and drop zone are in these units, so difficulty is identical on every screen size. Only the renderer knows the displayed size: it sizes the canvas backing store to display width × DPR and applies a uniform scale transform. CSS controls the displayed size (`width: 100%`, `aspect-ratio: 2/3`). Input and bomb taps convert screen coordinates to world coordinates via the canvas bounding rect.

### Game Clock

`GameStateManager` keeps a `clock` (ms of simulated play time) that only advances in `tick()`. The danger timer, particle lifetimes and speed mode auto-drop all use it - **never use `Date.now()` for game timing**, or pausing/background tabs will leak into gameplay.

### State Management Pattern

The codebase uses a **hybrid state management approach**:

- **React State** (suika-game.tsx): UI-only state (score, status, powerUps, destroyMode, colorPalette, dialogs)
- **GameStateManager**: Authoritative game logic independent of React (no React imports)
- **Physics Engine**: Matter.js maintains physics bodies, synced with game state each step

State flows ONE direction per frame: GameState → React (never React → GameState during gameplay).

### Critical Game Mechanics

**Drop Availability:**

- `dropCircle()` records `droppedCircleId`; no new drop or preview until that circle's top edge clears `DANGER_LINE_Y`
- If the dropped circle disappears first (merged, destroyed, escaped), dropping is re-enabled
- Preview circle tracks `lastMouseX` to restore position when drop becomes available

**Merge Detection:**

- Runs every step in `tick()`; same-level circles within `MERGE_TOLERANCE` (5%) of touching merge
- Circles are marked `merged: true` immediately, so each circle merges at most once per step
- Merged circle spawns at the midpoint with averaged velocity, **at the merging circles' radius**, and grows to full size over `MERGE_GROW_TIME` (120 ms) to avoid violent overlap pushes
- Sound callback fires immediately on merge detection

**Game Over:**

- Danger timer starts when any non-static circle's top edge is above `DANGER_LINE_Y`
- Resets if all circles clear the line; game over after `DANGER_LINE_TIMEOUT` (2 s) of game clock time

**Power-Ups:**

- 1 bomb per `POWERUP_POINTS_THRESHOLD` (1000) points crossed, max `MAX_POWERUPS` (1) stored
- Milestones crossed while already full are forfeited
- Destroy mode changes cursor and adds red border to canvas

**Speed Mode:**

- Auto-drop scheduled on the game clock using `getDropInterval(score)` (2000 ms → 800 ms)
- Any drop (manual or automatic) restarts the countdown; pausing freezes it

### Component Initialization Flow

**suika-game.tsx init effect** (runs when the start screen hides and the canvas mounts):

1. Creates PhysicsEngine, GameStateManager (with audio callbacks), Renderer and InputHandler
2. Observes the canvas with a `ResizeObserver` to re-scale the renderer on resize/rotation
3. Sets up input callbacks
4. Starts the game loop and starts the game in 'playing' status

Game mode and initial palette are read through `useEffectEvent` so they aren't effect dependencies - changing them must not rebuild a running game. Palette changes go through `renderer.setColors()`.

### Audio Architecture

Uses **Web Audio API** for low-latency merge sounds:

- AudioContext created with `latencyHint: 'interactive'`; browsers start it suspended, so `resumeAudio()` is called from user gestures (Start Game, drops)
- Audio buffer loaded once and reused; each sound creates a new BufferSource → GainNode → destination chain
- Merge volume 0.5; explosion uses the same sound at 0.7× playback rate and 0.8 gain

### Physics System Details

**Matter.js Configuration** (physics.ts, values in game-config.ts):

- Gravity `{ x: 0, y: 1 }`; circles: restitution 0.1, friction 0.1, air resistance 0.01, density 0.001
- Solver iterations raised for stable stacks: position 10, velocity 8 (Matter defaults 6/4)
- Container: bottom + left + right walls (50 px thick); side walls extend a full container height above the top so kicked circles can't escape. No top wall (intentional)
- Circles that still leave the container are removed by `GameStateManager`

**Body Syncing:**

- New Matter body created when a circle first appears, with the circle's velocity applied
- Syncs static flag changes and scales the body (`Body.scale`, which also updates mass) when the circle radius changes (merge grow-in)
- Removes bodies when circles are deleted (merges, power-ups, escapes)
- Position/velocity sync is Matter → Circle, except static circles (positioned by game state)

### Canvas Rendering

- Draws in logical world coordinates; HiDPI handled via the scale transform
- Color palettes defined in game-config.ts (green, blue, purple, orange, pink, rainbow); adjacent and same-palette levels should stay visually distinct

### Leaderboard API

- `lib/db.ts` - shared Neon client; `lib/leaderboard.ts` - shared validation (`isGameMode`, `MAX_SCORE`) and the top-scores query
- `POST /api/scores` - validates name (trimmed, uppercased, 3 chars), integer score within the INTEGER range, and mode
- `GET /api/scores/top?mode=` and `GET /api/scores/weekly?mode=` - top 10 all-time / last 7 days
- No anti-cheat or rate limiting: any plausible score can be posted directly

### Configuration Constants

All game balance tuning in **lib/game-config.ts**:

- `FRUIT_LEVELS = 11` (levels 0-10), `FRUIT_RADII` (15 to 135 world units)
- `MERGE_POINTS` (1, 2, 4 ... 1024)
- `DROP_ZONE_HEIGHT = 100`, `DANGER_LINE_Y = DROP_ZONE_HEIGHT`, `DANGER_LINE_TIMEOUT = 2000`
- Timing: `PHYSICS_STEP_MS`, `STEP_TOLERANCE_MS`, `MAX_FRAME_TIME_MS`, `MERGE_GROW_TIME`

### Theme System

Uses **next-themes** with system preference detection:

- OKLCH color space in globals.css for perceptual uniformity
- CSS custom properties for dynamic theming
- ThemeProvider wraps app in layout.tsx; ThemeToggle component in header

## Code Style and Conventions

**File Naming:**

- All component and library files use **kebab-case**: `suika-game.tsx`, `game-start-screen.tsx`, `game-state.ts`, `input-handler.ts`
- Tests live next to the code: `lib/game-state.test.ts`, `lib/physics.test.ts`
- React component exports use **PascalCase**: `export function GameStartScreen()` or `export default SuikaGame`

## Common Implementation Patterns

**Adding New Game Features:**

1. Add configuration to `game-config.ts`
2. Update `GameStateManager` for logic (pure, no React dependencies; time via the game clock)
3. Sync React state in the game loop (after the step loop)
4. Update UI rendering in suika-game.tsx return statement
5. Add tests in `lib/game-state.test.ts`

**Modifying Physics:**

- Always update `physics.ts` for simulation changes
- Ensure sync in `syncToPhysics`/`syncFromPhysics`
- Add or update headless simulations in `lib/physics.test.ts`
- Test with different circle counts (physics can degrade with 50+ bodies)

**Audio Changes:**

- Load audio files in the audio useEffect; store buffers in refs for reuse
- Create new source nodes per playback (buffers are reusable, sources are single-use)

## Known Constraints

- No top wall in physics container (intentional design choice)
- No anti-cheat, rate limiting or name filtering on score submission
- Canvas touch events use `touchAction: 'none'` normally, switches to `'auto'` in destroy mode
- Input has 200ms cooldown between drops (input-handler.ts)

## Dependencies

- **Next.js 16**, **React 19.2** (uses `useEffectEvent`)
- **Matter.js 0.20**: 2D physics engine (core gameplay dependency)
- **@neondatabase/serverless**: Leaderboard database
- **next-themes**: Theme management with system detection
- **shadcn/ui**: Button, Dialog, DropdownMenu, Tabs components (Radix UI primitives)
- **Tailwind CSS 4**: Styling with PostCSS
- **Lucide React**: Icon library
- **Vitest**: Tests
