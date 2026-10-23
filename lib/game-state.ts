// Game state management
// Handles game logic, fruit creation, merging, and scoring

import { Circle } from './physics';
import {
  FRUIT_LEVELS,
  FRUIT_RADII,
  MERGE_POINTS,
  CONTAINER_WIDTH,
  DANGER_LINE_Y,
  DANGER_LINE_TIMEOUT,
  DROP_ZONE_HEIGHT,
  POWERUP_POINTS_THRESHOLD,
  MAX_POWERUPS,
  MERGE_TOLERANCE,
  MERGE_GROW_TIME,
  CONTAINER_HEIGHT,
  PARTICLE_COUNT,
  PARTICLE_MIN_SPEED,
  PARTICLE_MAX_SPEED,
  PARTICLE_LIFETIME,
  PARTICLE_SIZE_RATIO,
  GameMode,
  getDropInterval,
} from './game-config';

export type GameStatus = 'ready' | 'playing' | 'paused' | 'gameOver';

export interface Particle {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  radius: number;
  color: string;
  life: number; // 0 to 1, decreases over time
  maxLife: number; // milliseconds
  createdAt: number; // game clock time (ms)
}

export interface GameState {
  circles: Circle[];
  particles: Particle[];
  score: number;
  status: GameStatus;
  nextFruitLevel: number; // Level for current preview circle
  upcomingFruitLevel: number; // Level for the circle after next (shown in UI)
  previewCircle: Circle | null;
  powerUps: number; // Available destroy power-ups
  gameMode: GameMode; // Current game mode
}

export class GameStateManager {
  private state: GameState;
  private nextId = 0;
  private clock = 0; // Simulated play time (ms) - only advances while playing
  private dangerTimer: number | null = null; // Game clock time when circles crossed the danger line
  private nextAutoDropAt: number | null = null; // Game clock time of next speed mode auto-drop
  private mergeQueue: Array<{ c1: Circle; c2: Circle }> = [];
  private droppedCircleId: string | null = null; // Dropped circle that must clear the danger line before the next drop
  private onMergeCallback?: () => void;
  private onExplosionCallback?: () => void;
  private lastMouseX: number = CONTAINER_WIDTH / 2; // Track last mouse position

  constructor(onMerge?: () => void, onExplosion?: () => void) {
    this.state = this.createInitialState('relax');
    this.onMergeCallback = onMerge;
    this.onExplosionCallback = onExplosion;
  }

  private createInitialState(gameMode: GameMode): GameState {
    return {
      circles: [],
      particles: [],
      score: 0,
      status: 'ready',
      nextFruitLevel: this.randomStartingLevel(),
      upcomingFruitLevel: this.randomStartingLevel(),
      previewCircle: null,
      powerUps: 0,
      gameMode,
    };
  }

  // Get random starting level (0-4, smaller fruits)
  private randomStartingLevel(): number {
    return Math.floor(Math.random() * 5);
  }

  // Get current game state
  getState(): GameState {
    return this.state;
  }

  // Start a new game
  startGame(gameMode: GameMode): void {
    this.state = this.createInitialState(gameMode);
    this.nextId = 0;
    this.clock = 0;
    this.dangerTimer = null;
    this.nextAutoDropAt = null;
    this.mergeQueue = [];
    this.droppedCircleId = null;
    this.scheduleAutoDrop();
  }

  // Advance game logic by one fixed step (call after each physics step)
  tick(dtMs: number): void {
    this.clock += dtMs;
    this.removeEscapedCircles();
    this.updateDropAvailability();
    this.updateGrowth(dtMs);
    this.checkMerges();
    this.updateParticles(dtMs);
    this.updateAutoDrop();
  }

  // Create preview circle at position
  createPreview(x: number): void {
    const level = this.state.nextFruitLevel;
    const radius = FRUIT_RADII[level];

    // Clamp x position to container bounds
    const clampedX = Math.max(radius, Math.min(CONTAINER_WIDTH - radius, x));

    this.state.previewCircle = {
      id: 'preview',
      position: { x: clampedX, y: DROP_ZONE_HEIGHT / 2 },
      velocity: { x: 0, y: 0 },
      radius,
      level,
      merged: false,
      isStatic: true,
    };
  }

  // Update preview position (only if preview exists and dropping is allowed)
  updatePreviewPosition(x: number): void {
    // Always track the last mouse position
    this.lastMouseX = x;

    if (!this.state.previewCircle) {
      // Only create preview if we're allowed to drop
      if (this.droppedCircleId === null) {
        this.createPreview(x);
      }
      return;
    }

    const radius = this.state.previewCircle.radius;
    const clampedX = Math.max(radius, Math.min(CONTAINER_WIDTH - radius, x));
    this.state.previewCircle.position.x = clampedX;
  }

  // Drop the current preview circle
  dropCircle(): Circle | null {
    if (!this.state.previewCircle || this.state.status !== 'playing' || this.droppedCircleId !== null) {
      return null;
    }

    const newCircle: Circle = {
      ...this.state.previewCircle,
      id: `fruit-${this.nextId++}`,
      isStatic: false,
      position: { ...this.state.previewCircle.position },
      velocity: { x: 0, y: 0 },
    };

    this.state.circles.push(newCircle);

    // Shift upcoming to next, and generate new upcoming
    this.state.nextFruitLevel = this.state.upcomingFruitLevel;
    this.state.upcomingFruitLevel = this.randomStartingLevel();
    this.state.previewCircle = null;

    // Prevent dropping until this circle clears the danger line
    this.droppedCircleId = newCircle.id;

    // Any drop (manual or automatic) resets the speed mode countdown
    this.scheduleAutoDrop();

    return newCircle;
  }

  // Schedule the next speed mode auto-drop based on current score
  private scheduleAutoDrop(): void {
    if (this.state.gameMode === 'speed') {
      this.nextAutoDropAt = this.clock + getDropInterval(this.state.score);
    }
  }

  // Auto-drop in speed mode when the countdown expires
  private updateAutoDrop(): void {
    if (this.nextAutoDropAt === null || this.clock < this.nextAutoDropAt) return;

    // If dropping isn't available yet, wait another full interval
    if (!this.dropCircle()) {
      this.scheduleAutoDrop();
    }
  }

  // Update drop availability based on the dropped circle's position
  private updateDropAvailability(): void {
    if (this.droppedCircleId === null) return;

    const dropped = this.state.circles.find((c) => c.id === this.droppedCircleId);

    // Re-enable dropping once the dropped circle clears the danger line,
    // or if it no longer exists (merged, destroyed or escaped)
    if (!dropped || dropped.position.y - dropped.radius > DANGER_LINE_Y) {
      this.droppedCircleId = null;
      // Create preview circle at last known mouse position when dropping becomes available
      if (!this.state.previewCircle) {
        this.createPreview(this.lastMouseX);
      }
    }
  }

  // Remove circles that somehow left the container (they would otherwise fall forever)
  private removeEscapedCircles(): void {
    this.state.circles = this.state.circles.filter(
      (c) =>
        c.position.x >= -c.radius &&
        c.position.x <= CONTAINER_WIDTH + c.radius &&
        c.position.y <= CONTAINER_HEIGHT + c.radius
    );
  }

  // Grow merged circles from the merged circles' size to their full size
  private updateGrowth(dtMs: number): void {
    for (const circle of this.state.circles) {
      const targetRadius = FRUIT_RADII[circle.level];
      if (circle.radius < targetRadius) {
        const growthPerMs = (targetRadius - FRUIT_RADII[circle.level - 1]) / MERGE_GROW_TIME;
        circle.radius = Math.min(targetRadius, circle.radius + growthPerMs * dtMs);
      }
    }
  }

  // Check for and handle merges
  private checkMerges(): void {
    this.mergeQueue = [];

    // Find all pairs that should merge
    for (let i = 0; i < this.state.circles.length; i++) {
      for (let j = i + 1; j < this.state.circles.length; j++) {
        const c1 = this.state.circles[i];
        const c2 = this.state.circles[j];

        // Check if same level, not already merged, and touching
        if (
          c1.level === c2.level &&
          c1.level < FRUIT_LEVELS - 1 &&
          !c1.merged &&
          !c2.merged &&
          !c1.isStatic &&
          !c2.isStatic
        ) {
          const dx = c2.position.x - c1.position.x;
          const dy = c2.position.y - c1.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const touchDistance = c1.radius + c2.radius;

          if (distance <= touchDistance * MERGE_TOLERANCE) {
            this.mergeQueue.push({ c1, c2 });
            c1.merged = true;
            c2.merged = true;

            // Play sound immediately when merge is detected
            if (this.onMergeCallback) {
              this.onMergeCallback();
            }
          }
        }
      }
    }

    // Process merges
    for (const { c1, c2 } of this.mergeQueue) {
      this.performMerge(c1, c2);
    }

    // Remove merged circles
    this.state.circles = this.state.circles.filter((c) => !c.merged);
  }

  // Perform a single merge
  private performMerge(c1: Circle, c2: Circle): void {
    const newLevel = c1.level + 1;

    // Create new merged circle at midpoint
    // It starts at the merged circles' size and grows in, so neighbours get pushed gently
    const newCircle: Circle = {
      id: `fruit-${this.nextId++}`,
      position: {
        x: (c1.position.x + c2.position.x) / 2,
        y: (c1.position.y + c2.position.y) / 2,
      },
      velocity: {
        x: (c1.velocity.x + c2.velocity.x) / 2,
        y: (c1.velocity.y + c2.velocity.y) / 2,
      },
      radius: FRUIT_RADII[c1.level],
      level: newLevel,
      merged: false,
      isStatic: false,
    };

    this.state.circles.push(newCircle);

    // Update score
    const previousScore = this.state.score;
    this.state.score += MERGE_POINTS[c1.level];

    // Award a power-up for each milestone crossed; milestones crossed while full are forfeited
    const milestonesCrossed =
      Math.floor(this.state.score / POWERUP_POINTS_THRESHOLD) -
      Math.floor(previousScore / POWERUP_POINTS_THRESHOLD);

    if (milestonesCrossed > 0) {
      this.state.powerUps = Math.min(this.state.powerUps + milestonesCrossed, MAX_POWERUPS);
    }
  }

  // Create explosion particles
  private createExplosion(circle: Circle, color: string): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
      const speed = PARTICLE_MIN_SPEED + Math.random() * (PARTICLE_MAX_SPEED - PARTICLE_MIN_SPEED);

      const particle: Particle = {
        id: `particle-${this.nextId++}`,
        position: { x: circle.position.x, y: circle.position.y },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        radius: circle.radius * PARTICLE_SIZE_RATIO,
        color: color,
        life: 1,
        maxLife: PARTICLE_LIFETIME,
        createdAt: this.clock,
      };

      this.state.particles.push(particle);
    }
  }

  // Use a power-up to destroy a circle
  destroyCircle(circleId: string, color: string): boolean {
    if (this.state.powerUps === 0) return false;

    const circleIndex = this.state.circles.findIndex((c) => c.id === circleId);
    if (circleIndex === -1) return false;

    const circle = this.state.circles[circleIndex];

    // Create explosion effect
    this.createExplosion(circle, color);

    // Play explosion sound
    if (this.onExplosionCallback) {
      this.onExplosionCallback();
    }

    // Remove the circle
    this.state.circles.splice(circleIndex, 1);
    this.state.powerUps -= 1;

    return true;
  }

  // Update particles (called every step)
  private updateParticles(dtMs: number): void {
    const dt = dtMs / 1000; // Particle velocity is in units per second

    for (const particle of this.state.particles) {
      const age = this.clock - particle.createdAt;
      particle.life = Math.max(0, 1 - age / particle.maxLife);

      particle.position.x += particle.velocity.x * dt;
      particle.position.y += particle.velocity.y * dt;
    }

    // Remove dead particles
    this.state.particles = this.state.particles.filter((p) => p.life > 0);
  }

  // Check for game over condition
  checkGameOver(): boolean {
    // Check if any circle is above danger line
    const circlesAboveLine = this.state.circles.filter(
      (c) => c.position.y - c.radius < DANGER_LINE_Y && !c.isStatic
    );

    if (circlesAboveLine.length > 0) {
      // Start danger timer if not already started
      if (this.dangerTimer === null) {
        this.dangerTimer = this.clock;
      } else if (this.clock - this.dangerTimer > DANGER_LINE_TIMEOUT) {
        // Game over!
        this.state.status = 'gameOver';
        return true;
      }
    } else {
      // Reset danger timer
      this.dangerTimer = null;
    }

    return false;
  }

  // Set game status
  setStatus(status: GameStatus): void {
    this.state.status = status;
  }
}
