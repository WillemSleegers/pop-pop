// Input handling for mouse and touch events
// Manages user interactions with the game canvas

export type InputCallback = (x: number) => void;
export type DropCallback = () => void;

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private onMoveCallback: InputCallback | null = null;
  private onDropCallback: DropCallback | null = null;
  private isPointerDown = false;
  private canDrop = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  // Set callback for pointer movement
  onMove(callback: InputCallback): void {
    this.onMoveCallback = callback;
  }

  // Set callback for drop action
  onDrop(callback: DropCallback): void {
    this.onDropCallback = callback;
  }

  // Setup all event listeners
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });
  }

  // Get X coordinate relative to canvas (in logical pixels, not physical)
  private getCanvasX(clientX: number): number {
    const rect = this.canvas.getBoundingClientRect();
    // Use the CSS width, not the physical canvas width (which is scaled for retina)
    const logicalWidth = parseFloat(this.canvas.style.width) || rect.width;
    const scaleX = logicalWidth / rect.width;
    return (clientX - rect.left) * scaleX;
  }

  // Mouse event handlers
  private handleMouseMove = (e: MouseEvent): void => {
    if (this.onMoveCallback) {
      const x = this.getCanvasX(e.clientX);
      this.onMoveCallback(x);
    }
  };

  private handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    this.isPointerDown = true;
  };

  private handleMouseUp = (e: MouseEvent): void => {
    e.preventDefault();
    if (this.isPointerDown && this.canDrop && this.onDropCallback) {
      this.onDropCallback();
      this.canDrop = false;
      // Prevent rapid drops
      setTimeout(() => {
        this.canDrop = true;
      }, 200);
    }
    this.isPointerDown = false;
  };

  private handleMouseLeave = (): void => {
    this.isPointerDown = false;
  };

  // Touch event handlers
  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0) {
      this.isPointerDown = true;
      const x = this.getCanvasX(e.touches[0].clientX);
      if (this.onMoveCallback) {
        this.onMoveCallback(x);
      }
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length > 0 && this.onMoveCallback) {
      const x = this.getCanvasX(e.touches[0].clientX);
      this.onMoveCallback(x);
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.isPointerDown && this.canDrop && this.onDropCallback) {
      this.onDropCallback();
      this.canDrop = false;
      // Prevent rapid drops
      setTimeout(() => {
        this.canDrop = true;
      }, 200);
    }
    this.isPointerDown = false;
  };

  private handleTouchCancel = (): void => {
    this.isPointerDown = false;
  };

  // Cleanup event listeners
  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.handleTouchCancel);
  }
}
