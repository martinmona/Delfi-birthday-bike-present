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
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-2 sm:p-4">
      <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-red-500 mb-2 sm:mb-4 font-pixel">¡GAME OVER!</h2>
      <p className="text-white mb-2 font-pixel text-sm sm:text-base">Puntuación final: {score}</p>
      <p className="text-white mb-4 sm:mb-6 text-center max-w-[90%] sm:max-w-md font-pixel text-[10px] xs:text-xs sm:text-sm">
        ¡No te rindas! Sigue intentándolo para ganar la bicicleta.
      </p>
      <Button
        onClick={onRestart}
        className="bg-red-600 hover:bg-red-700 font-pixel text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2"
      >
        Intentar de nuevo
      </Button>
    </div>
  )
}
