"use client"

import * as React from "react"
import { GameMode, ColorPalette, COLOR_PALETTES } from "@/lib/gameConfig"
import { Button } from "@/components/ui/button"
import { Timer, Flower2 } from "lucide-react"

interface GameStartScreenProps {
  onStart: (mode: GameMode, palette: ColorPalette) => void
  defaultMode?: GameMode
  defaultPalette?: ColorPalette
}

export function GameStartScreen({
  onStart,
  defaultMode = "relax",
  defaultPalette = "rainbow"
}: GameStartScreenProps) {
  const [selectedMode, setSelectedMode] = React.useState<GameMode>(defaultMode)
  const [selectedPalette, setSelectedPalette] = React.useState<ColorPalette>(defaultPalette)

  const handleStart = () => {
    onStart(selectedMode, selectedPalette)
  }

  const paletteOptions: Array<{ name: ColorPalette; label: string }> = [
    { name: "green", label: "Green" },
    { name: "blue", label: "Blue" },
    { name: "purple", label: "Purple" },
    { name: "orange", label: "Orange" },
    { name: "pink", label: "Pink" },
    { name: "rainbow", label: "Rainbow" },
  ]

  return (
    <div
      className="w-full bg-muted/30 border-2 border-input rounded-lg flex items-center justify-center p-6"
      style={{
        aspectRatio: "2/3",
      }}
    >
      <div className="w-full max-w-sm space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Start New Game</h2>
          <p className="text-sm text-muted-foreground">
            Choose your game mode and color palette
          </p>
        </div>

        {/* Game Mode Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Game Mode</label>
          <div className="grid gap-3">
            {/* Relax Mode */}
            <button
              onClick={() => setSelectedMode('relax')}
              className={`group relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                selectedMode === 'relax'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-border bg-card hover:border-primary hover:bg-accent'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  selectedMode === 'relax'
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-green-500/10 text-green-500 group-hover:bg-green-500/20'
                }`}>
                  <Flower2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Relax Mode</h3>
                  <p className="text-xs text-muted-foreground">
                    Drop circles at your own pace
                  </p>
                </div>
              </div>
            </button>

            {/* Speed Mode */}
            <button
              onClick={() => setSelectedMode('speed')}
              className={`group relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                selectedMode === 'speed'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-border bg-card hover:border-primary hover:bg-accent'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  selectedMode === 'speed'
                    ? 'bg-orange-500/20 text-orange-500'
                    : 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20'
                }`}>
                  <Timer className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Speed Mode</h3>
                  <p className="text-xs text-muted-foreground">
                    Auto-drop with increasing speed
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Color Palette Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Color Palette</label>
          <div className="grid grid-cols-3 gap-2">
            {paletteOptions.map((option) => (
              <button
                key={option.name}
                onClick={() => setSelectedPalette(option.name)}
                className={`relative overflow-hidden rounded-lg border-2 p-3 text-center transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  selectedPalette === option.name
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <div className="flex justify-center gap-1 mb-2">
                  {COLOR_PALETTES[option.name].slice(0, 5).map((color, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium">{option.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <Button
          onClick={handleStart}
          className="w-full"
          size="lg"
        >
          Start Game
        </Button>
      </div>
    </div>
  )
}
