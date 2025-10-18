'use client';

import { useEffect, useRef, useState } from 'react';
import { Bomb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { PaletteSelector } from '@/components/palette-selector';
import { PhysicsEngine } from '@/lib/physics';
import { GameStateManager, GameStatus } from '@/lib/gameState';
import { Renderer } from '@/lib/renderer';
import { InputHandler } from '@/lib/inputHandler';
import { COLOR_PALETTES, ColorPalette, FRUIT_RADII } from '@/lib/gameConfig';

export default function SuikaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>('ready');
  const [nextLevel, setNextLevel] = useState(0);
  const [powerUps, setPowerUps] = useState(0);
  const [destroyMode, setDestroyMode] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette>('rainbow');

  // Game loop refs
  const physicsRef = useRef<PhysicsEngine | null>(null);
  const gameStateRef = useRef<GameStateManager | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const inputHandlerRef = useRef<InputHandler | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mergeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    mergeAudioRef.current = new Audio('/assets/sounds/merge.mp3');
    mergeAudioRef.current.volume = 0.5;
  }, []);

  // Update renderer colors when palette changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setColors(COLOR_PALETTES[colorPalette]);
    }
  }, [colorPalette]);

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Wait a bit for the DOM to settle, then get dimensions
    const initializeGame = () => {
      const container = canvas.parentElement;
      if (!container) return;

      // Get the actual inner dimensions (excluding borders)
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Create game systems with actual dimensions
      // Note: Renderer will handle setting canvas dimensions with DPI scaling
      physicsRef.current = new PhysicsEngine(width, height);
      gameStateRef.current = new GameStateManager(
        () => {
          // Play merge sound - clone audio to allow overlapping sounds
          if (mergeAudioRef.current) {
            const sound = mergeAudioRef.current.cloneNode() as HTMLAudioElement;
            sound.volume = 0.5;
            sound.play().catch(() => {
              // Ignore errors from autoplay restrictions
            });
          }
        },
        width,
        height
      );
      rendererRef.current = new Renderer(canvas, width, height, COLOR_PALETTES[colorPalette]);
      inputHandlerRef.current = new InputHandler(canvas);

      // Setup input handlers
      inputHandlerRef.current.onMove((x) => {
        if (gameStateRef.current && gameStateRef.current.getState().status === 'playing') {
          gameStateRef.current.updatePreviewPosition(x);
        }
      });

      inputHandlerRef.current.onDrop(() => {
        if (gameStateRef.current && gameStateRef.current.getState().status === 'playing') {
          gameStateRef.current.dropCircle();
        }
      });

      // Start render loop
      startGameLoop();

      // Auto-start the game
      if (gameStateRef.current) {
        gameStateRef.current.startGame();
        gameStateRef.current.setStatus('playing');
        setStatus('playing');
        // Create initial preview at center
        gameStateRef.current.createPreview(width / 2);
      }
    };

    // Small delay to ensure layout is complete
    setTimeout(initializeGame, 100);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (inputHandlerRef.current) {
        inputHandlerRef.current.destroy();
      }
    };
  }, [colorPalette]);

  // Game loop
  const startGameLoop = () => {
    const loop = () => {
      const physics = physicsRef.current;
      const gameState = gameStateRef.current;
      const renderer = rendererRef.current;

      if (!physics || !gameState || !renderer) return;

      const state = gameState.getState();

      // Only update physics if playing
      if (state.status === 'playing') {
        // Update physics
        physics.update(state.circles);

        // Update drop availability
        gameState.updateDropAvailability();

        // Check for merges
        gameState.checkMerges();

        // Check for game over
        if (gameState.checkGameOver()) {
          setStatus('gameOver');
        }

        // Update UI state
        setScore(state.score);
        setNextLevel(state.upcomingFruitLevel);
        setPowerUps(state.powerUps);
      }

      // Render
      renderer.render(state.circles, state.previewCircle);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
  };

  // Start game
  const handleStart = () => {
    if (gameStateRef.current) {
      gameStateRef.current.startGame();
      gameStateRef.current.setStatus('playing');
      setStatus('playing');
      setScore(0);
    }
  };

  // Restart game
  const handleRestart = () => {
    handleStart();
  };

  // Handle canvas click/touch for destroy mode
  const handleDestroyAtPoint = (clientX: number, clientY: number) => {
    if (!destroyMode || !gameStateRef.current || !physicsRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Use the parent container dimensions (the actual rendered size)
    const container = canvas.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const logicalWidth = containerRect.width;
    const logicalHeight = containerRect.height;

    const x = ((clientX - rect.left) / rect.width) * logicalWidth;
    const y = ((clientY - rect.top) / rect.height) * logicalHeight;

    const state = gameStateRef.current.getState();

    // Find clicked circle
    for (const circle of state.circles) {
      const dx = x - circle.position.x;
      const dy = y - circle.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= circle.radius) {
        // Destroy this circle
        if (gameStateRef.current.destroyCircle(circle.id)) {
          setDestroyMode(false);
          setPowerUps(0);
        }
        break;
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleDestroyAtPoint(e.clientX, e.clientY);
  };

  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      handleDestroyAtPoint(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4">
      {/* Game Container */}
      <div className="flex flex-col w-full max-w-md">
        {/* Header */}
        <div className="mb-4 space-y-3">
          {/* Title and Controls */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Pop Pop</h1>
            <div className="flex items-center gap-2">
              <PaletteSelector palette={colorPalette} onPaletteChange={setColorPalette} />
              <ThemeToggle />
              {status === 'playing' && (
                <Button onClick={handleRestart} variant="outline" size="icon" className="border-2 border-border">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                    <path d="M8 16H3v5"/>
                  </svg>
                </Button>
              )}
            </div>
          </div>

          {/* Score and Next Preview */}
          <div className="flex items-center gap-3">
            {/* Score Card */}
            <div className="flex-1 rounded-lg border-2 border-input bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Score</p>
              <p className="text-3xl font-bold tabular-nums">{score}</p>
            </div>

            {/* Power-up Button */}
            <Button
              onClick={() => powerUps > 0 && setDestroyMode(!destroyMode)}
              variant={destroyMode ? "default" : "outline"}
              disabled={powerUps === 0}
              className={`rounded-lg border-2 p-3 ${destroyMode ? 'bg-red-600 hover:bg-red-700' : 'border-border'}`}
              style={{ minWidth: '80px', minHeight: '80px' }}
            >
              <Bomb className="w-10 h-10" />
            </Button>

            {/* Next Circle Card */}
            <div className="rounded-lg border-2 border-input bg-muted/50 p-3 flex items-center justify-center" style={{ minWidth: '80px', minHeight: '80px' }}>
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: COLOR_PALETTES[colorPalette][nextLevel],
                  width: `${FRUIT_RADII[nextLevel] * 1.2}px`,
                  height: `${FRUIT_RADII[nextLevel] * 1.2}px`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="rounded-lg overflow-hidden w-full relative">
          <div className={`border-2 rounded-lg overflow-hidden transition-colors ${destroyMode ? 'border-red-500' : 'border-input'}`}>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onTouchStart={handleCanvasTouch}
              className={`bg-background block ${destroyMode ? 'cursor-crosshair' : ''}`}
              style={{
                touchAction: destroyMode ? 'auto' : 'none',
                width: '100%',
                aspectRatio: '2/3',
              }}
            />
          </div>

          {/* Game Over Overlay */}
          {status === 'gameOver' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
              <div className="space-y-4 w-3/4 max-w-sm">
                <div className="bg-muted border-2 border-border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold mb-2">Game Over!</p>
                  <p className="text-muted-foreground">Final Score: {score}</p>
                </div>
                <Button onClick={handleRestart} className="w-full" size="lg">
                  Play Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
