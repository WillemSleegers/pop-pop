// Canvas rendering system
// Handles all drawing operations for the game

import { Circle } from './physics';
import { Particle } from './game-state';
import { DROP_ZONE_HEIGHT } from './game-config';

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

// Render the entire game state
const render = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: string[],
  circles: Circle[],
  previewCircle: Circle | null,
  particles: Particle[] = []
): void => {
  clear(ctx, width, height);

  // Draw drop zone underlay first (background layer)
  drawDropZoneUnderlay(ctx, width);

  // Draw all circles on top of underlay
  circles.forEach(circle => drawCircle(ctx, circle, colors));

  // Draw particles
  particles.forEach(particle => drawParticle(ctx, particle));

  // Draw preview circle
  if (previewCircle) {
    drawCircle(ctx, previewCircle, colors, 1.0); // Full opacity for accurate colors
  }
};

// Initialize canvas with proper DPI scaling
const initializeCanvas = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Support high DPI displays (retina)
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  return ctx;
};

// Update canvas dimensions
const updateCanvasDimensions = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  const canvas = ctx.canvas;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);
};

// Create a renderer (factory function)
export interface Renderer {
  render: (
    circles: Circle[],
    previewCircle: Circle | null,
    particles?: Particle[]
  ) => void;
  setColors: (colors: string[]) => void;
  updateDimensions: (width: number, height: number) => void;
  clear: () => void;
}

export const createRenderer = (
  canvas: HTMLCanvasElement,
  initialWidth: number,
  initialHeight: number,
  initialColors: string[]
): Renderer => {
  const ctx = initializeCanvas(canvas, initialWidth, initialHeight);
  let colors = initialColors;
  let width = initialWidth;
  let height = initialHeight;

  return {
    render: (circles, previewCircle, particles = []) =>
      render(ctx, width, height, colors, circles, previewCircle, particles),

    setColors: (newColors) => {
      colors = newColors;
    },

    updateDimensions: (newWidth, newHeight) => {
      width = newWidth;
      height = newHeight;
      updateCanvasDimensions(ctx, newWidth, newHeight);
    },

    clear: () => clear(ctx, width, height),
  };
};
