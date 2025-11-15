// Canvas rendering system
// Handles all drawing operations for the game

import { Circle } from './physics';
import { Particle } from './game-state';
import { DANGER_LINE_Y, DROP_ZONE_HEIGHT } from './game-config';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private colors: string[];

  constructor(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    colors: string[]
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.colors = colors;

    // Support high DPI displays (retina)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
  }

  // Update color palette
  setColors(colors: string[]): void {
    this.colors = colors;
  }

  // Clear the canvas
  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // Render the entire game state
  render(
    circles: Circle[],
    previewCircle: Circle | null,
    particles: Particle[] = []
  ): void {
    this.clear();

    // Draw drop zone underlay first (background layer)
    this.drawDropZoneUnderlay();

    // Draw all circles on top of underlay
    for (const circle of circles) {
      this.drawCircle(circle);
    }

    // Draw particles
    for (const particle of particles) {
      this.drawParticle(particle);
    }

    // Draw preview circle
    if (previewCircle) {
      this.drawCircle(previewCircle, 1.0); // Full opacity for accurate colors
    }
  }

  // Draw the danger line
  private drawDangerLine(isInDanger: boolean): void {
    this.ctx.strokeStyle = isInDanger ? '#ef4444' : '#f87171';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, DANGER_LINE_Y);
    this.ctx.lineTo(this.width, DANGER_LINE_Y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Add warning text if in danger
    if (isInDanger) {
      this.ctx.fillStyle = '#ef4444';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('DANGER!', this.width / 2, DANGER_LINE_Y - 10);
    }
  }

  // Draw the drop zone underlay (background above danger line)
  private drawDropZoneUnderlay(): void {
    // Just draw a border line - no background fill
    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, DROP_ZONE_HEIGHT);
    this.ctx.lineTo(this.width, DROP_ZONE_HEIGHT);
    this.ctx.stroke();
  }

  // Draw a single circle
  private drawCircle(circle: Circle, alpha: number = 1): void {
    const { position, radius, level } = circle;
    const color = this.colors[level];

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    // Draw main circle (flat design, no border)
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  // Draw a single particle
  private drawParticle(particle: Particle): void {
    const { position, radius, color, life } = particle;

    this.ctx.save();
    this.ctx.globalAlpha = life; // Fade out as life decreases

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, radius * life, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  // Utility: Darken a hex color
  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) * (100 - percent)) / 100);
    const g = Math.max(0, (((num >> 8) & 0x00ff) * (100 - percent)) / 100);
    const b = Math.max(0, ((num & 0x0000ff) * (100 - percent)) / 100);
    return `#${((1 << 24) + (Math.floor(r) << 16) + (Math.floor(g) << 8) + Math.floor(b))
      .toString(16)
      .slice(1)}`;
  }

  // Update canvas dimensions
  updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const canvas = this.ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
  }
}
