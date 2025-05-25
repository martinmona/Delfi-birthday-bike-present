"use client"

import { Button } from "@/components/ui/button"
import { on } from "events"

interface GameOverScreenProps {
  score: number
  onRestart: () => void
}

export default function GameOverScreen({ score, onRestart }: GameOverScreenProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Enter") {
          onRestart()
      }
    }
  window.addEventListener("keydown", handleKeyDown)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
      <h2 className="text-4xl font-bold text-red-500 mb-4 font-pixel">¡GAME OVER!</h2>
      <p className="text-white mb-2 font-pixel">Puntuación final: {score}</p>
      <p className="text-white mb-6 text-center max-w-md font-pixel text-sm">
        ¡No te rindas! Sigue intentándolo para ganar la bicicleta.
      </p>
      <Button onClick={onRestart} className="bg-red-600 hover:bg-red-700 font-pixel">
        Intentar de nuevo
      </Button>
    </div>
  )
}
