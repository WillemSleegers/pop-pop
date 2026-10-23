import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from './game-state';
import { Circle } from './physics';
import {
  CONTAINER_HEIGHT,
  CONTAINER_WIDTH,
  DANGER_LINE_TIMEOUT,
  DANGER_LINE_Y,
  FRUIT_LEVELS,
  FRUIT_RADII,
  MERGE_GROW_TIME,
  MERGE_POINTS,
  PARTICLE_COUNT,
  PARTICLE_LIFETIME,
  PHYSICS_STEP_MS,
  POWERUP_POINTS_THRESHOLD,
  GameMode,
  getDropInterval,
} from './game-config';

// Below the danger line, resting on the floor
const FLOOR_Y = CONTAINER_HEIGHT - 100;

let nextTestId = 0;
const makeCircle = (level: number, x: number, y: number = FLOOR_Y): Circle => ({
  id: `test-${nextTestId++}`,
  position: { x, y },
  velocity: { x: 0, y: 0 },
  radius: FRUIT_RADII[level],
  level,
  merged: false,
  isStatic: false,
});

// Two circles of the same level, exactly touching
const touchingPair = (level: number): Circle[] => {
  const r = FRUIT_RADII[level];
  return [makeCircle(level, 200 - r), makeCircle(level, 200 + r)];
};

const startGame = (mode: GameMode = 'relax') => {
  const onMerge = vi.fn();
  const onExplosion = vi.fn();
  const game = new GameStateManager(onMerge, onExplosion);
  game.startGame(mode);
  game.setStatus('playing');
  return { game, state: game.getState(), onMerge, onExplosion };
};

// Advance game logic (no physics) by a duration in ms
const advance = (game: GameStateManager, ms: number) => {
  for (let t = 0; t < ms; t += PHYSICS_STEP_MS) {
    game.tick(PHYSICS_STEP_MS);
  }
};

afterEach(() => {
  vi.useRealTimers();
});

describe('merging', () => {
  it('merges two touching same-level circles into the next level at their midpoint', () => {
    const { game, state, onMerge } = startGame();
    state.circles.push(...touchingPair(2));

    game.tick(PHYSICS_STEP_MS);

    expect(state.circles).toHaveLength(1);
    expect(state.circles[0].level).toBe(3);
    expect(state.circles[0].position).toEqual({ x: 200, y: FLOOR_Y });
    expect(state.score).toBe(MERGE_POINTS[2]);
    expect(onMerge).toHaveBeenCalledTimes(1);
  });

  it('averages the velocity of the merged circles', () => {
    const { game, state } = startGame();
    const [a, b] = touchingPair(1);
    a.velocity = { x: 2, y: 0 };
    b.velocity = { x: 0, y: 4 };
    state.circles.push(a, b);

    game.tick(PHYSICS_STEP_MS);

    expect(state.circles[0].velocity).toEqual({ x: 1, y: 2 });
  });

  it('does not merge circles of different levels', () => {
    const { game, state } = startGame();
    state.circles.push(makeCircle(1, 180), makeCircle(2, 180 + FRUIT_RADII[1] + FRUIT_RADII[2]));

    game.tick(PHYSICS_STEP_MS);

    expect(state.circles).toHaveLength(2);
    expect(state.score).toBe(0);
  });

  it('does not merge circles that are clearly apart', () => {
    const { game, state } = startGame();
    state.circles.push(makeCircle(2, 100), makeCircle(2, 300));

    game.tick(PHYSICS_STEP_MS);

    expect(state.circles).toHaveLength(2);
  });

  it('does not merge circles at the maximum level', () => {
    const { game, state } = startGame();
    state.circles.push(...touchingPair(FRUIT_LEVELS - 1));

    game.tick(PHYSICS_STEP_MS);

    expect(state.circles).toHaveLength(2);
  });

  it('merges each circle at most once per step', () => {
    const { game, state, onMerge } = startGame();
    const r = FRUIT_RADII[0];
    state.circles.push(makeCircle(0, 100), makeCircle(0, 100 + 2 * r), makeCircle(0, 100 + 4 * r));

    game.tick(PHYSICS_STEP_MS);

    expect(onMerge).toHaveBeenCalledTimes(1);
    expect(state.circles.map((c) => c.level).sort()).toEqual([0, 1]);
  });

  it('grows the merged circle from the merged size to full size over MERGE_GROW_TIME', () => {
    const { game, state } = startGame();
    state.circles.push(...touchingPair(3));

    game.tick(PHYSICS_STEP_MS);
    const merged = state.circles[0];
    expect(merged.radius).toBe(FRUIT_RADII[3]);

    advance(game, MERGE_GROW_TIME / 2);
    expect(merged.radius).toBeGreaterThan(FRUIT_RADII[3]);
    expect(merged.radius).toBeLessThan(FRUIT_RADII[4]);

    advance(game, MERGE_GROW_TIME);
    expect(merged.radius).toBe(FRUIT_RADII[4]);
  });
});

describe('power-ups', () => {
  it('awards a bomb when the score crosses a milestone', () => {
    const { game, state } = startGame();
    state.score = POWERUP_POINTS_THRESHOLD - 1;
    state.circles.push(...touchingPair(3));

    game.tick(PHYSICS_STEP_MS);

    expect(state.powerUps).toBe(1);
  });

  it('forfeits a milestone crossed while already holding a bomb', () => {
    const { game, state } = startGame();
    state.score = POWERUP_POINTS_THRESHOLD - 1;
    state.powerUps = 1;
    state.circles.push(...touchingPair(3));
    game.tick(PHYSICS_STEP_MS);

    // Use the bomb, then merge again without crossing a new milestone
    expect(game.destroyCircle(state.circles[0].id, '#000')).toBe(true);
    state.circles.push(...touchingPair(3));
    game.tick(PHYSICS_STEP_MS);

    expect(state.powerUps).toBe(0);
  });

  it('destroys a circle, consumes the bomb and spawns particles', () => {
    const { game, state, onExplosion } = startGame();
    const circle = makeCircle(2, 200);
    state.circles.push(circle);
    state.powerUps = 1;

    expect(game.destroyCircle(circle.id, '#f00')).toBe(true);

    expect(state.circles).toHaveLength(0);
    expect(state.powerUps).toBe(0);
    expect(state.particles).toHaveLength(PARTICLE_COUNT);
    expect(onExplosion).toHaveBeenCalledTimes(1);
  });

  it('refuses to destroy without a bomb', () => {
    const { game, state } = startGame();
    const circle = makeCircle(2, 200);
    state.circles.push(circle);

    expect(game.destroyCircle(circle.id, '#f00')).toBe(false);
    expect(state.circles).toHaveLength(1);
  });

  it('expires particles after their lifetime of game time', () => {
    const { game, state } = startGame();
    const circle = makeCircle(2, 200);
    state.circles.push(circle);
    state.powerUps = 1;
    game.destroyCircle(circle.id, '#f00');

    advance(game, PARTICLE_LIFETIME / 2);
    expect(state.particles).toHaveLength(PARTICLE_COUNT);
    expect(state.particles[0].life).toBeCloseTo(0.5, 1);

    advance(game, PARTICLE_LIFETIME);
    expect(state.particles).toHaveLength(0);
  });
});

describe('dropping', () => {
  it('clamps the preview inside the container walls', () => {
    const { game, state } = startGame();
    game.createPreview(-100);
    expect(state.previewCircle!.position.x).toBe(state.previewCircle!.radius);

    game.updatePreviewPosition(CONTAINER_WIDTH + 100);
    expect(state.previewCircle!.position.x).toBe(CONTAINER_WIDTH - state.previewCircle!.radius);
  });

  it('drops the preview and shifts the upcoming level into next', () => {
    const { game, state } = startGame();
    const upcoming = state.upcomingFruitLevel;
    game.createPreview(150);

    const dropped = game.dropCircle();

    expect(dropped).not.toBeNull();
    expect(dropped!.isStatic).toBe(false);
    expect(state.circles).toContain(dropped);
    expect(state.previewCircle).toBeNull();
    expect(state.nextFruitLevel).toBe(upcoming);
  });

  it('blocks dropping until the dropped circle clears the danger line', () => {
    const { game, state } = startGame();
    game.createPreview(150);
    const dropped = game.dropCircle()!;
    game.updatePreviewPosition(250);

    game.tick(PHYSICS_STEP_MS);
    expect(state.previewCircle).toBeNull();
    expect(game.dropCircle()).toBeNull();

    // Simulate the circle falling below the line
    dropped.position.y = DANGER_LINE_Y + dropped.radius + 1;
    game.tick(PHYSICS_STEP_MS);

    // Preview returns at the last pointer position
    expect(state.previewCircle!.position.x).toBe(250);
    expect(game.dropCircle()).not.toBeNull();
  });

  it('ignores newer circles when checking drop availability', () => {
    const { game, state } = startGame();
    game.createPreview(150);
    game.dropCircle();

    // A circle added after the drop (e.g. a merge result) is below the line
    state.circles.push(makeCircle(3, 300));
    game.tick(PHYSICS_STEP_MS);

    expect(state.previewCircle).toBeNull();
  });

  it('re-enables dropping when the dropped circle disappears before clearing the line', () => {
    const { game, state } = startGame();
    game.createPreview(150);
    const dropped = game.dropCircle()!;

    state.circles = state.circles.filter((c) => c.id !== dropped.id);
    game.tick(PHYSICS_STEP_MS);

    expect(state.previewCircle).not.toBeNull();
  });

  it('removes circles that escaped the container', () => {
    const { game, state } = startGame();
    state.circles.push(makeCircle(1, -50), makeCircle(1, 200, CONTAINER_HEIGHT + 50), makeCircle(1, 200));

    game.tick(PHYSICS_STEP_MS);

    expect(state.circles).toHaveLength(1);
  });
});

describe('speed mode auto-drop', () => {
  it('drops automatically after the drop interval of game time', () => {
    const { game, state } = startGame('speed');
    game.createPreview(200);

    advance(game, getDropInterval(0) - 2 * PHYSICS_STEP_MS);
    expect(state.circles).toHaveLength(0);

    advance(game, 4 * PHYSICS_STEP_MS);
    expect(state.circles).toHaveLength(1);
  });

  it('restarts the countdown after a manual drop', () => {
    const { game, state } = startGame('speed');
    game.createPreview(200);
    advance(game, getDropInterval(0) / 2);

    const dropped = game.dropCircle()!;
    dropped.position.y = FLOOR_Y; // clears the line, so the next preview appears
    advance(game, getDropInterval(0) * 0.75);
    expect(state.circles).toHaveLength(1);

    advance(game, getDropInterval(0) * 0.5);
    expect(state.circles).toHaveLength(2);
  });

  it('never auto-drops in relax mode', () => {
    const { game, state } = startGame('relax');
    game.createPreview(200);

    advance(game, getDropInterval(0) * 3);

    expect(state.circles).toHaveLength(0);
  });
});

describe('game over', () => {
  it('ends the game only after circles stay above the line for the timeout', () => {
    const { game, state } = startGame();
    state.circles.push(makeCircle(0, 200, DANGER_LINE_Y / 2));

    for (let t = 0; t < DANGER_LINE_TIMEOUT - 100; t += PHYSICS_STEP_MS) {
      game.tick(PHYSICS_STEP_MS);
      expect(game.checkGameOver()).toBe(false);
    }

    advance(game, 200);
    expect(game.checkGameOver()).toBe(true);
    expect(state.status).toBe('gameOver');
  });

  it('resets the danger timer when circles clear the line', () => {
    const { game, state } = startGame();
    const circle = makeCircle(0, 200, DANGER_LINE_Y / 2);
    state.circles.push(circle);
    game.checkGameOver();
    advance(game, DANGER_LINE_TIMEOUT - 100);

    circle.position.y = FLOOR_Y;
    game.checkGameOver();
    circle.position.y = DANGER_LINE_Y / 2;
    game.checkGameOver();
    advance(game, 200);

    expect(game.checkGameOver()).toBe(false);
  });

  it('does not count wall-clock time (pauses, background tabs)', () => {
    vi.useFakeTimers();
    const { game, state } = startGame();
    state.circles.push(makeCircle(0, 200, DANGER_LINE_Y / 2));
    game.checkGameOver();

    vi.advanceTimersByTime(DANGER_LINE_TIMEOUT * 10);

    expect(game.checkGameOver()).toBe(false);
  });
});

describe('starting a game', () => {
  it('resets state and keeps the selected mode', () => {
    const { game, state } = startGame();
    state.score = 500;
    state.circles.push(makeCircle(1, 200));

    game.startGame('speed');

    const fresh = game.getState();
    expect(fresh.score).toBe(0);
    expect(fresh.circles).toHaveLength(0);
    expect(fresh.gameMode).toBe('speed');
  });
});
