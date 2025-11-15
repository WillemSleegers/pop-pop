"use client"

import * as React from "react"
import { Palette } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColorPalette } from "@/lib/game-config"

interface PaletteSelectorProps {
  palette: ColorPalette
  onPaletteChange: (palette: ColorPalette) => void
}

export function PaletteSelector({ palette, onPaletteChange }: PaletteSelectorProps) {
  const palettes: { value: ColorPalette; label: string }[] = [
    { value: "green", label: "Green" },
    { value: "blue", label: "Blue" },
    { value: "purple", label: "Purple" },
    { value: "orange", label: "Orange" },
    { value: "pink", label: "Pink" },
    { value: "rainbow", label: "Rainbow" },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="border-2 border-border">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Select color palette</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {palettes.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onClick={() => onPaletteChange(p.value)}
            className={palette === p.value ? "bg-accent" : ""}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
