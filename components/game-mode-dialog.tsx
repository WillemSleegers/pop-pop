"use client"

import * as React from "react"
import { GameMode } from "@/lib/gameConfig"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Timer, Flower2 } from "lucide-react"

interface GameModeDialogProps {
  open: boolean
  onSelectMode: (mode: GameMode) => void
}

export function GameModeDialog({ open, onSelectMode }: GameModeDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Game Mode</DialogTitle>
          <DialogDescription>
            Select how you want to play Pop Pop
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Relax Mode */}
          <button
            onClick={() => onSelectMode('relax')}
            className="group relative overflow-hidden rounded-lg border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-500 transition-colors group-hover:bg-green-500/20">
                <Flower2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Relax Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Take your time. Drop circles at your own pace and plan your strategy carefully.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-1 font-medium text-green-500">
                    Chill
                  </span>
                  <span>Perfect for beginners</span>
                </div>
              </div>
            </div>
          </button>

          {/* Speed Mode */}
          <button
            onClick={() => onSelectMode('speed')}
            className="group relative overflow-hidden rounded-lg border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 transition-colors group-hover:bg-orange-500/20">
                <Timer className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Speed Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Circles auto-drop with increasing speed as you score! Starts at 2s, gets faster every 100 points. Ultimate challenge!
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1 font-medium text-orange-500">
                    Hard
                  </span>
                  <span>Progressive difficulty</span>
                </div>
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
