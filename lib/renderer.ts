// Canvas rendering system
// Handles all drawing operations for the game

import { Circle } from './physics';
import { Particle } from './game-state';
import { CONTAINER_HEIGHT, CONTAINER_WIDTH, DROP_ZONE_HEIGHT } from './game-config';

// Draw the drop zone underlay (background above danger line)
const drawDropZoneUnderlay = (
  ctx: CanvasRenderingContext2D,
  width: number
): void => {
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, DROP_ZONE_HEIGHT);
  ctx.lineTo(width, DROP_ZONE_HEIGHT);
  ctx.stroke();
};

// Draw a single circle
const drawCircle = (
  ctx: CanvasRenderingContext2D,
  circle: Circle,
  colors: string[],
  alpha: number = 1
): void => {
  const { position, radius, level } = circle;
  const color = colors[level];

  ctx.save();
  ctx.globalAlpha = alpha;

  // Draw main circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

// Draw a single particle
const drawParticle = (
  ctx: CanvasRenderingContext2D,
  particle: Particle
): void => {
  const { position, radius, color, life } = particle;

  ctx.save();
  ctx.globalAlpha = life; // Fade out as life decreases

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius * life, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

// Clear the canvas
const clear = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  ctx.clearRect(0, 0, width, height);
};

// Render the entire game state (in logical world coordinates)
const render = (
  ctx: CanvasRenderingContext2D,
  colors: string[],
  circles: Circle[],
  previewCircle: Circle | null,
  particles: Particle[] = []
): void => {
  clear(ctx, CONTAINER_WIDTH, CONTAINER_HEIGHT);

  // Draw drop zone underlay first (background layer)
  drawDropZoneUnderlay(ctx, CONTAINER_WIDTH);

  // Draw all circles on top of underlay
  circles.forEach(circle => drawCircle(ctx, circle, colors));

  // Draw particles
  particles.forEach(particle => drawParticle(ctx, particle));

  // Draw preview circle
  if (previewCircle) {
    drawCircle(ctx, previewCircle, colors, 1.0); // Full opacity for accurate colors
  }
};

// Size the canvas backing store to its displayed size (with DPI scaling)
// and scale the logical world to fill it. CSS controls the displayed size.
const resizeCanvas = (
  ctx: CanvasRenderingContext2D,
  displayWidth: number
): void => {
  const canvas = ctx.canvas;
  const dpr = window.devicePixelRatio || 1;
  const scale = (displayWidth * dpr) / CONTAINER_WIDTH;
  canvas.width = Math.round(CONTAINER_WIDTH * scale);
  canvas.height = Math.round(CONTAINER_HEIGHT * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
};

// Create a renderer (factory function)
export interface Renderer {
  render: (
    circles: Circle[],
    previewCircle: Circle | null,
    particles?: Particle[]
  ) => void;
  setColors: (colors: string[]) => void;
  resize: (displayWidth: number) => void;
}

export const createRenderer = (
  canvas: HTMLCanvasElement,
  initialColors: string[]
): Renderer => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  resizeCanvas(ctx, canvas.clientWidth);
  let colors = initialColors;

  return {
    render: (circles, previewCircle, particles = []) =>
      render(ctx, colors, circles, previewCircle, particles),

    setColors: (newColors) => {
      colors = newColors;
    },

    resize: (displayWidth) => resizeCanvas(ctx, displayWidth),
  };
};
