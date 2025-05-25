"use client"

import { Button } from "@/components/ui/button"
import confetti from "canvas-confetti"
import { useEffect } from "react"

interface VictoryScreenProps {
  score: number
}

export default function VictoryScreen({ score }: VictoryScreenProps) {
  useEffect(() => {
    // Lanzar confeti cuando se muestre la pantalla de victoria
    const launchConfetti = () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    }

    launchConfetti()
    const interval = setInterval(launchConfetti, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
      <h2 className="text-4xl font-bold text-yellow-400 mb-4 font-pixel">¡VICTORIA!</h2>
      <p className="text-white mb-2 font-pixel">Puntuación final: {score}</p>
      <div className="my-4 relative">
        <img
          src="/images/bicycle.png"
          alt="Bicicleta"
          className="w-40 h-40 object-contain"
          onError={(e) => {
            // Si la imagen falla, mostrar un fallback
            const target = e.target as HTMLImageElement
            target.style.display = "none"
            const parent = target.parentElement
            if (parent) {
              const fallback = document.createElement("div")
              fallback.className = "w-40 h-40 bg-yellow-400 rounded-lg flex items-center justify-center"
              fallback.innerHTML = "🚲"
              parent.appendChild(fallback)
            }
          }}
        />
      </div>
      <p className="text-white mb-6 text-center max-w-md font-pixel text-sm">
        ¡Felicidades, Te ganaste la bicicleta!
        <br />
        <br />
        Ya estoy esperando para dar una vuelta juntos.
        <br />
        Te amo mucho godi, que la disfrutes :D
      </p>
      <Button onClick={() => window.print()} className="bg-green-600 hover:bg-green-700 font-pixel">
        Imprimir certificado
      </Button>
    </div>
  )
}
