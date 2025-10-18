// Physics engine for Suika game using Matter.js
// Handles circle physics: gravity, collisions, and boundaries

import Matter from 'matter-js';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Circle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  level: number; // 0-10 (11 levels total)
  merged: boolean; // Flag to mark for removal after merge
  isStatic: boolean; // Static circles don't move (for preview)
  bodyId?: number; // Matter.js body ID for syncing
}

export class PhysicsEngine {
  private engine: Matter.Engine;
  private world: Matter.World;
  private bodyMap: Map<string, Matter.Body> = new Map(); // Map circle IDs to Matter bodies

  constructor(
    private width: number,
    private height: number
  ) {
    // Create Matter.js engine
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1 }, // Gravity pointing down
    });
    this.world = this.engine.world;

    // Create container walls
    const wallThickness = 50;
    const walls = [
      // Bottom
      Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true }),
      // Left
      Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true }),
      // Right
      Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true }),
    ];
    Matter.World.add(this.world, walls);
  }

  // Update all circles with physics
  update(circles: Circle[]): void {
    // Sync circles to Matter.js bodies
    this.syncToPhysics(circles);

    // Step the physics simulation
    Matter.Engine.update(this.engine, 1000 / 60); // 60 FPS

    // Sync back from Matter.js to circles
    this.syncFromPhysics(circles);
  }

  // Sync circle data to Matter.js bodies
  private syncToPhysics(circles: Circle[]): void {
    for (const circle of circles) {
      let body = this.bodyMap.get(circle.id);

      if (!body) {
        // Create new Matter.js body for this circle
        body = Matter.Bodies.circle(
          circle.position.x,
          circle.position.y,
          circle.radius,
          {
            restitution: 0.1, // Low bounciness
            friction: 0.1,
            frictionAir: 0.01, // Air resistance
            density: 0.001,
            isStatic: circle.isStatic,
          }
        );
        Matter.World.add(this.world, body);
        this.bodyMap.set(circle.id, body);
      }

      // Update body properties if circle changed
      if (circle.isStatic !== body.isStatic) {
        Matter.Body.setStatic(body, circle.isStatic);
      }

      // If circle was moved externally, update body position
      if (circle.isStatic) {
        Matter.Body.setPosition(body, { x: circle.position.x, y: circle.position.y });
      }
    }

    // Remove bodies for circles that no longer exist
    const circleIds = new Set(circles.map((c) => c.id));
    for (const [id, body] of this.bodyMap.entries()) {
      if (!circleIds.has(id)) {
        Matter.World.remove(this.world, body);
        this.bodyMap.delete(id);
      }
    }
  }

  // Sync data from Matter.js bodies back to circles
  private syncFromPhysics(circles: Circle[]): void {
    for (const circle of circles) {
      const body = this.bodyMap.get(circle.id);
      if (body && !circle.isStatic) {
        circle.position.x = body.position.x;
        circle.position.y = body.position.y;
        circle.velocity.x = body.velocity.x;
        circle.velocity.y = body.velocity.y;
      }
    }
  }

  // Check if two circles are touching (for merge detection)
  areTouching(c1: Circle, c2: Circle): boolean {
    const dx = c2.position.x - c1.position.x;
    const dy = c2.position.y - c1.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= (c1.radius + c2.radius) * 1.02; // 2% tolerance
  }

  // Update dimensions if container resizes
  updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    // Note: Walls would need to be recreated for this to take effect
  }
}
