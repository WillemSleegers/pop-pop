"use client"

import { useEffect, useRef, useState } from "react"
import { Bomb, RotateCcwIcon, Trophy, Pause, Play, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { Leaderboard } from "@/components/leaderboard"
import { GameStartScreen } from "@/components/game-start-screen"
import { PhysicsEngine } from "@/lib/physics"
import { GameStateManager, GameStatus } from "@/lib/game-state"
import { createRenderer, Renderer } from "@/lib/renderer"
import { InputHandler } from "@/lib/input-handler"
import {
  COLOR_PALETTES,
  ColorPalette,
  BASE_FRUIT_RADII,
  GameMode,
  getDropInterval,
} from "@/lib/game-config"

export default function SuikaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState<GameStatus>("ready")
  const [nextLevel, setNextLevel] = useState(0)
  const [powerUps, setPowerUps] = useState(0)
  const [destroyMode, setDestroyMode] = useState(false)
  const [colorPalette, setColorPalette] = useState<ColorPalette>("rainbow")
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [playerName, setPlayerName] = useState("")
  const [submittingScore, setSubmittingScore] = useState(false)
  const [fruitRadii, setFruitRadii] = useState<number[]>(BASE_FRUIT_RADII)
  const [showStartScreen, setShowStartScreen] = useState(true)
  const [gameMode, setGameMode] = useState<GameMode>("relax")
  const [showRestartDialog, setShowRestartDialog] = useState(false)

  // Game loop refs
  const physicsRef = useRef<PhysicsEngine | null>(null)
  const gameStateRef = useRef<GameStateManager | null>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const destroyModeRef = useRef(false)
  const inputHandlerRef = useRef<InputHandler | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const autoDropTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize Web Audio API for low-latency playback
  useEffect(() => {
    // Create AudioContext with low latency hint
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    const audioContext = new AudioContextClass({
      latencyHint: "interactive",
    })
    audioContextRef.current = audioContext

    // Fetch and decode audio file
    fetch("/assets/sounds/pop.mp3")
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        audioBufferRef.current = audioBuffer
      })
      .catch((err) => console.error("Error loading audio:", err))

    return () => {
      audioContext.close()
    }
  }, [])

  // Update renderer colors when palette changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setColors(COLOR_PALETTES[colorPalette])
    }
  }, [colorPalette])

  // Initialize game systems when canvas becomes available (after start screen)
  useEffect(() => {
    // Only initialize when start screen is hidden (canvas is rendered)
    if (showStartScreen) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Wait a bit for the DOM to settle, then get dimensions
    const initializeGame = () => {
      const container = canvas.parentElement
      if (!container) return

      // Get the actual inner dimensions (excluding borders)
      const width = container.clientWidth
      const height = container.clientHeight

      // Create game systems with actual dimensions
      // Note: Renderer will handle setting canvas dimensions with DPI scaling
      physicsRef.current = new PhysicsEngine(width, height)
      gameStateRef.current = new GameStateManager(
        () => {
          // Play merge sound with Web Audio API for low latency
          if (audioContextRef.current && audioBufferRef.current) {
            const source = audioContextRef.current.createBufferSource()
            source.buffer = audioBufferRef.current

            const gainNode = audioContextRef.current.createGain()
            gainNode.gain.value = 0.5

            source.connect(gainNode)
            gainNode.connect(audioContextRef.current.destination)
            source.start(0)
          }
        },
        width,
        height,
        () => {
          // Play explosion sound with Web Audio API (lower pitch, louder)
          if (audioContextRef.current && audioBufferRef.current) {
            const source = audioContextRef.current.createBufferSource()
            source.buffer = audioBufferRef.current
            source.playbackRate.value = 0.7 // Lower pitch for explosion

            const gainNode = audioContextRef.current.createGain()
            gainNode.gain.value = 0.8 // Louder than merge

            source.connect(gainNode)
            gainNode.connect(audioContextRef.current.destination)
            source.start(0)
          }
        }
      )
      rendererRef.current = createRenderer(
        canvas,
        width,
        height,
        COLOR_PALETTES[colorPalette]
      )
      inputHandlerRef.current = new InputHandler(canvas)

      // Setup input handlers
      inputHandlerRef.current.onMove((x) => {
        if (
          gameStateRef.current &&
          gameStateRef.current.getState().status === "playing"
        ) {
          gameStateRef.current.updatePreviewPosition(x)
        }
      })

      inputHandlerRef.current.onDrop(() => {
        if (
          gameStateRef.current &&
          gameStateRef.current.getState().status === "playing" &&
          !destroyModeRef.current
        ) {
          gameStateRef.current.dropCircle()
          // Reset auto-drop timer in speed mode when manually dropping
          if (gameMode === "speed") {
            startAutoDropTimer()
          }
        }
      })

      // Start render loop
      startGameLoop()

      // Update radii state for UI rendering
      if (gameStateRef.current) {
        setFruitRadii(gameStateRef.current.getRadii())
      }

      // Start the game after initialization
      startGameAfterInit()
    }

    // Small delay to ensure layout is complete
    setTimeout(initializeGame, 100)

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (inputHandlerRef.current) {
        inputHandlerRef.current.destroy()
      }
      if (autoDropTimerRef.current) {
        clearTimeout(autoDropTimerRef.current)
      }
    }
  }, [showStartScreen, colorPalette])

  // Sync destroyMode state with ref for use in callbacks
  useEffect(() => {
    destroyModeRef.current = destroyMode
  }, [destroyMode])

  // Game loop
  const startGameLoop = () => {
    const loop = () => {
      const physics = physicsRef.current
      const gameState = gameStateRef.current
      const renderer = rendererRef.current

      if (!physics || !gameState || !renderer) return

      const state = gameState.getState()

      // Only update physics if playing
      if (state.status === "playing") {
        // Update physics
        physics.update(state.circles)

        // Update drop availability
        gameState.updateDropAvailability()

        // Check for merges
        gameState.checkMerges()

        // Update particles
        gameState.updateParticles()

        // Check for game over
        if (gameState.checkGameOver()) {
          setStatus("gameOver")
          setShowNameInput(true)
          stopAutoDropTimer()
        }

        // Update UI state
        setScore(state.score)
        setNextLevel(state.upcomingFruitLevel)
        setPowerUps(state.powerUps)
      }

      // Render
      renderer.render(state.circles, state.previewCircle, state.particles)

      animationFrameRef.current = requestAnimationFrame(loop)
    }

    loop()
  }

  // Handle game start from start screen
  const handleGameStart = (mode: GameMode, palette: ColorPalette) => {
    setGameMode(mode)
    setColorPalette(palette)
    setShowStartScreen(false)
    // Game systems will be initialized by useEffect when showStartScreen becomes false
    // Then startGameAfterInit will be called
  }

  // Start the game after initialization completes
  const startGameAfterInit = () => {
    if (gameStateRef.current) {
      gameStateRef.current.setGameMode(gameMode)
      gameStateRef.current.startGame()
      gameStateRef.current.setStatus("playing")
      setStatus("playing")
      setScore(0)

      // Get canvas dimensions for initial preview
      const canvas = canvasRef.current
      if (canvas && canvas.parentElement) {
        const width = canvas.parentElement.clientWidth
        gameStateRef.current.createPreview(width / 2)
      }

      // Start auto-drop timer for speed mode
      if (gameMode === "speed") {
        startAutoDropTimer()
      }
    }
  }

  // Start auto-drop timer for speed mode with dynamic speed based on score
  const startAutoDropTimer = () => {
    if (autoDropTimerRef.current) {
      clearTimeout(autoDropTimerRef.current)
    }

    const scheduleNextDrop = () => {
      if (gameStateRef.current) {
        const state = gameStateRef.current.getState()

        // Only schedule next drop if still playing
        if (state.status === "playing") {
          // Calculate interval based on current score
          const interval = getDropInterval(state.score)

          autoDropTimerRef.current = setTimeout(() => {
            if (gameStateRef.current) {
              const currentState = gameStateRef.current.getState()
              // Only auto-drop if playing and drop is available
              if (
                currentState.status === "playing" &&
                gameStateRef.current.canDropCircle()
              ) {
                gameStateRef.current.dropCircle()
              }
            }
            // Schedule next drop
            scheduleNextDrop()
          }, interval)
        }
      }
    }

    scheduleNextDrop()
  }

  // Stop auto-drop timer
  const stopAutoDropTimer = () => {
    if (autoDropTimerRef.current) {
      clearTimeout(autoDropTimerRef.current)
      autoDropTimerRef.current = null
    }
  }

  // Start game
  const handleStart = () => {
    if (gameStateRef.current) {
      gameStateRef.current.startGame()
      gameStateRef.current.setStatus("playing")
      setStatus("playing")
      setScore(0)
    }
  }

  // Restart game
  const handleRestart = () => {
    setShowRestartDialog(false)
    setShowNameInput(false)
    setPlayerName("")
    stopAutoDropTimer()
    setShowStartScreen(true)
    setStatus("ready")
  }

  // Toggle pause
  const handleTogglePause = () => {
    if (!gameStateRef.current) return

    if (status === "playing") {
      gameStateRef.current.setStatus("paused")
      setStatus("paused")
      stopAutoDropTimer()
    } else if (status === "paused") {
      gameStateRef.current.setStatus("playing")
      setStatus("playing")
      // Restart auto-drop timer for speed mode
      if (gameMode === "speed") {
        startAutoDropTimer()
      }
    }
  }

  // Submit score
  const handleSubmitScore = async () => {
    if (!playerName.trim() || submittingScore) return

    setSubmittingScore(true)
    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: playerName.trim(),
          score: score,
          game_mode: gameMode,
        }),
      })

      if (response.ok) {
        setShowNameInput(false)
        setShowLeaderboard(true)
      } else {
        console.error("Failed to submit score")
      }
    } catch (error) {
      console.error("Error submitting score:", error)
    } finally {
      setSubmittingScore(false)
    }
  }

  // Skip score submission
  const handleSkipSubmit = () => {
    setShowNameInput(false)
  }

  // Handle canvas click/touch for destroy mode
  const handleDestroyAtPoint = (clientX: number, clientY: number) => {
    if (!destroyMode || !gameStateRef.current || !physicsRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    // Use the parent container dimensions (the actual rendered size)
    const container = canvas.parentElement
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const logicalWidth = containerRect.width
    const logicalHeight = containerRect.height

    const x = ((clientX - rect.left) / rect.width) * logicalWidth
    const y = ((clientY - rect.top) / rect.height) * logicalHeight

    const state = gameStateRef.current.getState()

    // Find clicked circle
    for (const circle of state.circles) {
      const dx = x - circle.position.x
      const dy = y - circle.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= circle.radius) {
        // Get the color for this circle
        const color = COLOR_PALETTES[colorPalette][circle.level]

        // Destroy this circle
        if (gameStateRef.current.destroyCircle(circle.id, color)) {
          setDestroyMode(false)
          setPowerUps(0)
        }
        break
      }
    }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleDestroyAtPoint(e.clientX, e.clientY)
  }

  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      e.preventDefault()
      handleDestroyAtPoint(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-4">
      {/* Game Container */}
      <div className="flex flex-col gap-2 w-full max-w-md my-auto">
        {/* Header */}
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-2">
            {/* Title */}
            <h1 className="text-3xl font-bold">Pop Pop</h1>

            {/* Score */}
            <div className="flex-1 rounded-lg border-2 border-input bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Score</p>
              <p className="text-3xl font-bold tabular-nums">{score}</p>
            </div>
          </div>

          <div className="w-20 flex flex-col gap-2">
            <div className="flex gap-2">
              {/* Pause/Resume */}
              <Button
                onClick={handleTogglePause}
                variant="outline"
                size="icon"
                className="border-2 border-border flex-1"
                disabled={status !== "playing" && status !== "paused"}
              >
                {status === "paused" ? <Play /> : <Pause />}
              </Button>
              {/* Restart */}
              <Button
                onClick={() => setShowRestartDialog(true)}
                variant="outline"
                size="icon"
                className="border-2 border-border flex-1"
                disabled={status !== "playing" && status !== "paused"}
              >
                <RotateCcwIcon />
              </Button>
            </div>
            {/* Bomb */}
            <div className="flex-1 rounded-lg border-2 border-input bg-muted/50 flex items-center justify-center">
              <Button
                onClick={() => powerUps > 0 && setDestroyMode(!destroyMode)}
                variant="ghost"
                disabled={powerUps === 0}
                className={`w-full h-full ${
                  destroyMode ? "bg-red-600 hover:bg-red-700 text-white" : ""
                }`}
              >
                <Bomb className="w-10 h-10" />
              </Button>
            </div>
          </div>

          <div className="w-20 flex flex-col gap-2">
            <div className="flex gap-2">
              {/* Leaderboard */}
              <Button
                onClick={() => setShowLeaderboard(true)}
                variant="outline"
                size="icon"
                className="border-2 border-border flex-1"
              >
                <Trophy className="w-5 h-5" />
              </Button>
              {/* Theme */}
              <div className="flex-1">
                <ThemeToggle />
              </div>
            </div>

            {/* Preview */}
            <div className="flex-1 rounded-lg border-2 border-input bg-muted/50 p-3 flex justify-center items-center">
              <div
                className="rounded-full"
                style={{
                  backgroundColor: COLOR_PALETTES[colorPalette][nextLevel],
                  width: `${fruitRadii[nextLevel] * 1.2}px`,
                  height: `${fruitRadii[nextLevel] * 1.2}px`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Canvas or Start Screen */}
        <div className="rounded-lg overflow-hidden w-full relative">
          {showStartScreen ? (
            <GameStartScreen
              onStart={handleGameStart}
              defaultMode={gameMode}
              defaultPalette={colorPalette}
            />
          ) : (
            <div
              className={`border-2 rounded-lg overflow-hidden transition-colors ${
                destroyMode ? "border-red-500" : "border-input"
              }`}
            >
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onTouchStart={handleCanvasTouch}
                className={`bg-background block ${
                  destroyMode ? "cursor-crosshair" : ""
                }`}
                style={{
                  touchAction: destroyMode ? "auto" : "none",
                  width: "100%",
                  aspectRatio: "2/3",
                }}
              />
            </div>
          )}

          {/* Pause Overlay */}
          {status === "paused" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
              <div className="space-y-4 w-3/4 max-w-sm">
                <div className="bg-muted border-2 border-border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">Paused</p>
                </div>
                <Button onClick={handleTogglePause} className="w-full" size="lg">
                  Resume
                </Button>
              </div>
            </div>
          )}

          {/* Game Over Overlay */}
          {status === "gameOver" && !showNameInput && !showLeaderboard && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
              <div className="space-y-4 w-3/4 max-w-sm">
                <div className="bg-muted border-2 border-border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold mb-2">Game Over!</p>
                  <p className="text-muted-foreground">Final Score: {score}</p>
                </div>
                <div className="space-y-2">
                  <Button onClick={handleRestart} className="w-full" size="lg">
                    Play Again
                  </Button>
                  <Button
                    onClick={() => setShowLeaderboard(true)}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    View Leaderboard
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Name Input Overlay */}
          {showNameInput && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
              <div className="space-y-4 w-3/4 max-w-sm">
                <div className="bg-muted border-2 border-border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold mb-2">Game Over!</p>
                  <p className="text-muted-foreground mb-4">
                    Final Score: {score}
                  </p>
                  <div className="space-y-3">
                    <div
                      className="flex justify-center items-center gap-3 text-2xl font-bold font-mono cursor-text"
                      onClick={() => nameInputRef.current?.focus()}
                    >
                      {[0, 1, 2].map((index) => (
                        <div
                          key={index}
                          className={`w-12 h-14 flex items-center justify-center border-2 rounded ${
                            index === playerName.length
                              ? "border-primary bg-primary/10 animate-pulse"
                              : "border-border bg-muted/50"
                          }`}
                        >
                          {playerName[index] || "_"}
                        </div>
                      ))}
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={playerName}
                        onChange={(e) =>
                          setPlayerName(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSubmitScore()
                        }
                        maxLength={3}
                        className="sr-only"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={handleSubmitScore}
                        className="w-full"
                        size="lg"
                        disabled={!playerName.trim() || submittingScore}
                      >
                        {submittingScore ? "Submitting..." : "Submit Score"}
                      </Button>
                      <Button
                        onClick={handleSkipSubmit}
                        variant="outline"
                        className="w-full"
                        size="lg"
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restart Confirmation Dialog */}
      <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restart Game?</DialogTitle>
            <DialogDescription>
              Are you sure you want to restart? Your current progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowRestartDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRestart}>
              Restart
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leaderboard Dialog */}
      <Leaderboard open={showLeaderboard} onOpenChange={setShowLeaderboard} />

      {/* Landscape Orientation Warning (Mobile Only) */}
      <div className="hidden landscape:flex md:landscape:hidden fixed inset-0 bg-background z-50 items-center justify-center p-8">
        <div className="text-center space-y-6 max-w-sm">
          <RotateCw className="w-16 h-16 mx-auto animate-spin-slow" />
          <div>
            <h2 className="text-2xl font-bold mb-2">Rotate Your Device</h2>
            <p className="text-muted-foreground">
              Please rotate your device to portrait mode for the best gaming experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
