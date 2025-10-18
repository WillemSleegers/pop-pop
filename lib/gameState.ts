// Game state management
// Handles game logic, fruit creation, merging, and scoring

import { Circle } from './physics';
import {
  FRUIT_LEVELS,
  FRUIT_RADII,
  MERGE_POINTS,
  CONTAINER_WIDTH,
  CONTAINER_HEIGHT,
  DANGER_LINE_Y,
  DANGER_LINE_TIMEOUT,
  DROP_ZONE_HEIGHT,
} from './gameConfig';

export type GameStatus = 'ready' | 'playing' | 'gameOver';

export interface GameState {
  circles: Circle[];
  score: number;
  status: GameStatus;
  nextFruitLevel: number; // Level for current preview circle
  upcomingFruitLevel: number; // Level for the circle after next (shown in UI)
  previewCircle: Circle | null;
  highestLevel: number;
  powerUps: number; // Available destroy power-ups
  lastPowerUpScore: number; // Last score milestone where power-up was awarded
}

export class GameStateManager {
  private state: GameState;
  private nextId = 0;
  private dangerTimer: number | null = null;
  private mergeQueue: Array<{ c1: Circle; c2: Circle }> = [];
  private canDrop = true; // Track if we can drop a new circle
  private onMergeCallback?: () => void;
  private width: number = CONTAINER_WIDTH;
  private height: number = CONTAINER_HEIGHT;
  private lastMouseX: number = CONTAINER_WIDTH / 2; // Track last mouse position

  constructor(onMerge?: () => void, width?: number, height?: number) {
    this.state = this.createInitialState();
    this.onMergeCallback = onMerge;
    if (width) {
      this.width = width;
      this.lastMouseX = width / 2;
    }
    if (height) this.height = height;
  }

  private createInitialState(): GameState {
    return {
      circles: [],
      score: 0,
      status: 'ready',
      nextFruitLevel: this.randomStartingLevel(),
      upcomingFruitLevel: this.randomStartingLevel(),
      previewCircle: null,
      highestLevel: 0,
      powerUps: 0,
      lastPowerUpScore: 0,
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
    const radius = FRUIT_RADII[level];

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

          if (distance <= touchDistance * 1.05) {
            // Allow slight gap for merging (5% tolerance)
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
      radius: FRUIT_RADII[newLevel],
      level: newLevel,
      merged: false,
      isStatic: false,
    };

    this.state.circles.push(newCircle);

    // Update score
    this.state.score += MERGE_POINTS[c1.level];

    // Check if we should award a power-up (every 1000 points, max 1)
    const currentMilestone = Math.floor(this.state.score / 1000);
    const lastMilestone = Math.floor(this.state.lastPowerUpScore / 1000);

    if (currentMilestone > lastMilestone && this.state.powerUps === 0) {
      this.state.powerUps = 1;
      this.state.lastPowerUpScore = this.state.score;
    }

    // Update highest level achieved
    if (newLevel > this.state.highestLevel) {
      this.state.highestLevel = newLevel;
    }
  }

  // Use a power-up to destroy a circle
  destroyCircle(circleId: string): boolean {
    if (this.state.powerUps === 0) return false;

    const circleIndex = this.state.circles.findIndex((c) => c.id === circleId);
    if (circleIndex === -1) return false;

    // Remove the circle
    this.state.circles.splice(circleIndex, 1);
    this.state.powerUps -= 1;

    return true;
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
}
