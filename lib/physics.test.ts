// Headless simulations of PhysicsEngine + GameStateManager (no rendering)

import { describe, expect, it } from 'vitest';
import { Circle, PhysicsEngine } from './physics';
import { GameStateManager } from './game-state';
import { CONTAINER_HEIGHT, CONTAINER_WIDTH, FRUIT_RADII, PHYSICS_STEP_MS } from './game-config';

const makeCircle = (id: string, level: number, x: number, y: number): Circle => ({
  id,
  position: { x, y },
  velocity: { x: 0, y: 0 },
  radius: FRUIT_RADII[level],
  level,
  merged: false,
  isStatic: false,
});

const setup = () => {
  const physics = new PhysicsEngine();
  const game = new GameStateManager();
  game.startGame('relax');
  game.setStatus('playing');
  return { physics, game, state: game.getState() };
};

// Run the same fixed-step loop as the game
const simulate = (physics: PhysicsEngine, game: GameStateManager, seconds: number) => {
  const steps = Math.round((seconds * 1000) / PHYSICS_STEP_MS);
  for (let i = 0; i < steps; i++) {
    physics.update(game.getState().circles);
    game.tick(PHYSICS_STEP_MS);
  }
};

// Resting positions are approximate (Matter allows slight overlap)
const POSITION_TOLERANCE = 1;

describe('physics simulation', () => {
  it('drops a circle onto the floor where it comes to rest', () => {
    const { physics, game, state } = setup();
    game.createPreview(200);
    game.dropCircle();

    simulate(physics, game, 3);

    const [circle] = state.circles;
    expect(Math.abs(circle.position.y - (CONTAINER_HEIGHT - circle.radius))).toBeLessThan(POSITION_TOLERANCE);
    expect(Math.abs(circle.velocity.y)).toBeLessThan(0.05);
  });

  it('merges touching circles and settles the grown circle on the floor', () => {
    const { physics, game, state } = setup();
    const r = FRUIT_RADII[3];
    state.circles.push(makeCircle('a', 3, 200 - r, 400), makeCircle('b', 3, 200 + r, 400));

    simulate(physics, game, 3);

    expect(state.circles).toHaveLength(1);
    const [merged] = state.circles;
    expect(merged.level).toBe(4);
    expect(merged.radius).toBe(FRUIT_RADII[4]);
    // Resting height reflects the grown physics body, not the original size
    expect(Math.abs(merged.position.y - (CONTAINER_HEIGHT - FRUIT_RADII[4]))).toBeLessThan(POSITION_TOLERANCE);
  });

  it("applies a new circle's velocity to its physics body (e.g. merge momentum)", () => {
    const { physics, game, state } = setup();
    const circle = makeCircle('moving', 2, 200, 300);
    circle.velocity = { x: 5, y: -5 };
    state.circles.push(circle);

    simulate(physics, game, 0.1);

    expect(circle.position.x).toBeGreaterThan(220);
    expect(circle.position.y).toBeLessThan(290);
  });

  it('keeps circles inside the container when launched upward', () => {
    const { physics, game, state } = setup();
    // A hard merge kick toward the wall and upward, above the top of the container
    const circle = makeCircle('launched', 2, CONTAINER_WIDTH - 40, 60);
    circle.velocity = { x: 10, y: -15 };
    state.circles.push(circle);

    simulate(physics, game, 4);

    expect(state.circles).toHaveLength(1);
    const [settled] = state.circles;
    expect(settled.position.x).toBeGreaterThanOrEqual(settled.radius - POSITION_TOLERANCE);
    expect(settled.position.x).toBeLessThanOrEqual(CONTAINER_WIDTH - settled.radius + POSITION_TOLERANCE);
    expect(Math.abs(settled.position.y - (CONTAINER_HEIGHT - settled.radius))).toBeLessThan(POSITION_TOLERANCE);
  });

  it('keeps a settled pile stable', () => {
    const { physics, game, state } = setup();
    // All different levels so nothing merges; too wide for one row, so they pile up
    [6, 0, 5, 1, 4, 2, 3].forEach((level, i) => {
      state.circles.push(makeCircle(`pile-${i}`, level, 60 + i * 45, 150 + (i % 3) * 60));
    });

    simulate(physics, game, 4);
    const before = state.circles.map((c) => ({ ...c.position }));
    simulate(physics, game, 2);

    state.circles.forEach((c, i) => {
      expect(Math.abs(c.position.x - before[i].x)).toBeLessThan(POSITION_TOLERANCE);
      expect(Math.abs(c.position.y - before[i].y)).toBeLessThan(POSITION_TOLERANCE);
    });
  });
});
