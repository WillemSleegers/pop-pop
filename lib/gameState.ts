// Game state management
// Handles game logic, fruit creation, merging, and scoring

import { Circle } from './physics';
import {
  FRUIT_LEVELS,
  getScaledRadii,
  MERGE_POINTS,
  CONTAINER_WIDTH,
  CONTAINER_HEIGHT,
  DANGER_LINE_Y,
  DANGER_LINE_TIMEOUT,
  DROP_ZONE_HEIGHT,
  POWERUP_POINTS_THRESHOLD,
  MAX_POWERUPS,
  MERGE_TOLERANCE,
  PARTICLE_COUNT,
  PARTICLE_MIN_SPEED,
  PARTICLE_MAX_SPEED,
  PARTICLE_LIFETIME,
  PARTICLE_SIZE_RATIO,
  GameMode,
} from './gameConfig';

export type GameStatus = 'ready' | 'playing' | 'gameOver';

export interface Particle {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  radius: number;
  color: string;
  life: number; // 0 to 1, decreases over time
  maxLife: number; // milliseconds
  createdAt: number; // timestamp
}

export interface GameState {
  circles: Circle[];
  particles: Particle[];
  score: number;
  status: GameStatus;
  nextFruitLevel: number; // Level for current preview circle
  upcomingFruitLevel: number; // Level for the circle after next (shown in UI)
  previewCircle: Circle | null;
  highestLevel: number;
  powerUps: number; // Available destroy power-ups
  lastPowerUpScore: number; // Last score milestone where power-up was awarded
  gameMode: GameMode; // Current game mode
}

export class GameStateManager {
  private state: GameState;
  private nextId = 0;
  private dangerTimer: number | null = null;
  private mergeQueue: Array<{ c1: Circle; c2: Circle }> = [];
  private canDrop = true; // Track if we can drop a new circle
  private onMergeCallback?: () => void;
  private onExplosionCallback?: () => void;
  private width: number = CONTAINER_WIDTH;
  private height: number = CONTAINER_HEIGHT;
  private lastMouseX: number = CONTAINER_WIDTH / 2; // Track last mouse position
  private fruitRadii: number[]; // Scaled radii based on canvas width

  constructor(onMerge?: () => void, width?: number, height?: number, onExplosion?: () => void) {
    this.state = this.createInitialState();
    this.onMergeCallback = onMerge;
    this.onExplosionCallback = onExplosion;
    if (width) {
      this.width = width;
      this.lastMouseX = width / 2;
    }
    if (height) this.height = height;

    // Calculate scaled radii based on canvas width
    this.fruitRadii = getScaledRadii(this.width);
  }

  private createInitialState(): GameState {
    return {
      circles: [],
      particles: [],
      score: 0,
      status: 'ready',
      nextFruitLevel: this.randomStartingLevel(),
      upcomingFruitLevel: this.randomStartingLevel(),
      previewCircle: null,
      highestLevel: 0,
      powerUps: 0,
      lastPowerUpScore: 0,
      gameMode: 'relax', // Default to relax mode
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

  // Get scaled radii for rendering
  getRadii(): number[] {
    return this.fruitRadii;
  }

  // Start a new game
  startGame(): void {
    this.state = this.createInitialState();
    this.nextId = 0;
    this.dangerTimer = null;
    this.mergeQueue = [];
    this.canDrop = true;
  }

  // Create preview circle at position
  createPreview(x: number): void {
    const level = this.state.nextFruitLevel;
    const radius = this.fruitRadii[level];

    // Clamp x position to container bounds
    const clampedX = Math.max(radius, Math.min(this.width - radius, x));

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
      if (this.canDrop) {
        this.createPreview(x);
      }
      return;
    }

    const radius = this.state.previewCircle.radius;
    const clampedX = Math.max(radius, Math.min(this.width - radius, x));
    this.state.previewCircle.position.x = clampedX;
  }

  // Drop the current preview circle
  dropCircle(): Circle | null {
    if (!this.state.previewCircle || this.state.status !== 'playing' || !this.canDrop) {
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
    this.canDrop = false;

    return newCircle;
  }

  // Update drop availability based on last dropped circle position
  updateDropAvailability(): void {
    if (!this.canDrop && this.state.circles.length > 0) {
      // Get the most recently added circle (last in array)
      const lastCircle = this.state.circles[this.state.circles.length - 1];

      // Check if it has passed below the danger line
      if (lastCircle.position.y - lastCircle.radius > DANGER_LINE_Y) {
        this.canDrop = true;
        // Create preview circle at last known mouse position when dropping becomes available
        if (!this.state.previewCircle) {
          this.createPreview(this.lastMouseX);
        }
      }
    }
  }

  // Check for and handle merges
  checkMerges(): void {
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
      radius: this.fruitRadii[newLevel],
      level: newLevel,
      merged: false,
      isStatic: false,
    };

    this.state.circles.push(newCircle);

    // Update score
    this.state.score += MERGE_POINTS[c1.level];

    // Check if we should award a power-up
    const currentMilestone = Math.floor(this.state.score / POWERUP_POINTS_THRESHOLD);
    const lastMilestone = Math.floor(this.state.lastPowerUpScore / POWERUP_POINTS_THRESHOLD);

    if (currentMilestone > lastMilestone && this.state.powerUps < MAX_POWERUPS) {
      this.state.powerUps = Math.min(this.state.powerUps + 1, MAX_POWERUPS);
      this.state.lastPowerUpScore = this.state.score;
    }

    // Update highest level achieved
    if (newLevel > this.state.highestLevel) {
      this.state.highestLevel = newLevel;
    }
  }

  // Create explosion particles
  private createExplosion(circle: Circle, color: string): void {
    const now = Date.now();

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
        createdAt: now,
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

  // Update particles (called every frame)
  updateParticles(): void {
    const now = Date.now();

    for (const particle of this.state.particles) {
      const age = now - particle.createdAt;
      particle.life = Math.max(0, 1 - age / particle.maxLife);

      // Update position based on velocity (assuming ~60fps, so 1/60 second)
      const dt = 1 / 60;
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
        this.dangerTimer = Date.now();
      } else if (Date.now() - this.dangerTimer > DANGER_LINE_TIMEOUT) {
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

  // Check if circles are in danger zone
  isInDanger(): boolean {
    return this.dangerTimer !== null;
  }

  // Set game status
  setStatus(status: GameStatus): void {
    this.state.status = status;
  }

  // Update circles array (called after physics update)
  updateCircles(circles: Circle[]): void {
    this.state.circles = circles;
  }

  // Set game mode (must be called before starting game)
  setGameMode(mode: GameMode): void {
    this.state.gameMode = mode;
  }

  // Check if we can drop a circle (used for speed mode)
  canDropCircle(): boolean {
    return this.canDrop;
  }
}
