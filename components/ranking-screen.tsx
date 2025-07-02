"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import confetti from "canvas-confetti"

interface RankingEntry {
  id: number
  name: string
  score: number
  createdAt: string
}

interface RankingScreenProps {
  score: number
  onRestart: () => void
}

export default function RankingScreen({ score, onRestart }: RankingScreenProps) {
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [playerName, setPlayerName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [playerPosition, setPlayerPosition] = useState<number | null>(null)
  const [isTopScore, setIsTopScore] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRankings()
  }, [])

  useEffect(() => {
    // Verificar si es el puntaje más alto y lanzar confeti si es así
    if (rankings.length > 0 && score > rankings[0].score) {
      setIsTopScore(true)
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
    }
  }, [rankings, score])

  const fetchRankings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rankings')
      if (response.ok) {
        const data = await response.json()
        setRankings(data)
        
        // Calcular posición del jugador
        const position = data.findIndex((entry: RankingEntry) => score > entry.score)
        setPlayerPosition(position === -1 ? data.length + 1 : position + 1)
      }
    } catch (error) {
      console.error('Error fetching rankings:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitScore = async () => {
    if (!playerName.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/rankings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playerName.trim(),
          score: score,
        }),
      })

      if (response.ok) {
        setHasSubmitted(true)
        await fetchRankings()
      }
    } catch (error) {
      console.error('Error submitting score:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !hasSubmitted && playerName.trim()) {
      submitScore()
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-2 sm:p-4 overflow-y-auto">
      <div className="max-w-md w-full space-y-4 max-h-full overflow-y-auto">
        
        {/* Header */}
        <div className="text-center">
          <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold mb-2 font-pixel ${
            isTopScore ? 'text-yellow-400' : 'text-red-500'
          }`}>
            {isTopScore ? '¡NUEVO RÉCORD!' : '¡GAME OVER!'}
          </h2>
          <p className="text-white mb-2 font-pixel text-sm sm:text-base">
            Tu puntuación: {score}
          </p>
          
          {score === 0 && (
            <div className="mb-4">
              <p className="text-orange-400 font-pixel text-xs sm:text-sm">
                ¡Necesitas al menos 1 punto para guardar tu puntaje!
              </p>
              <p className="text-white font-pixel text-[10px] xs:text-xs">
                Intenta recoger algunos guantes para sumar puntos 🧤
              </p>
            </div>
          )}
          
          {isTopScore && score > 0 && (
            <div className="mb-4">
              <p className="text-yellow-400 font-pixel text-xs sm:text-sm">
                ¡Felicidades! ¡Tienes el puntaje más alto!
              </p>
              <p className="text-white font-pixel text-[10px] xs:text-xs">
                ¡Guarda tu puntaje para reclamar la bicicleta!
              </p>
            </div>
          )}
          
          {playerPosition && !isTopScore && score > 0 && (
            <p className="text-white font-pixel text-xs sm:text-sm mb-2">
              Tu posición: #{playerPosition}
            </p>
          )}
        </div>

        {/* Ranking Table */}
        <div className="bg-black/50 rounded-lg p-3 max-h-40 overflow-y-auto">
          <h3 className="text-white font-pixel text-sm mb-2 text-center">🏆 Ranking Global</h3>
          {loading ? (
            <p className="text-white font-pixel text-xs text-center">Cargando...</p>
          ) : (
            <div className="space-y-1">
              {rankings.slice(0, 10).map((entry, index) => (
                <div key={entry.id} className="flex justify-between items-center text-white font-pixel text-[10px] xs:text-xs">
                  <span className="flex items-center">
                    <span className={`mr-2 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : ''}`}>
                      #{index + 1}
                    </span>
                    <span className="truncate max-w-[120px]">{entry.name}</span>
                  </span>
                  <span>{entry.score}</span>
                </div>
              ))}
              {rankings.length === 0 && (
                <p className="text-white font-pixel text-xs text-center">¡Sé el primero en el ranking!</p>
              )}
            </div>
          )}
        </div>

        {/* Name Input and Submit */}
        {!hasSubmitted && score > 0 && (
          <div className="space-y-3">
            <div>
              <Input
                placeholder="Ingresa tu nombre"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="font-pixel text-xs sm:text-sm text-white bg-gray-800 border-gray-600 placeholder-gray-400 focus:border-white focus:ring-white"
                maxLength={20}
              />
            </div>
            <Button
              onClick={submitScore}
              disabled={!playerName.trim() || isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 font-pixel text-xs sm:text-sm px-3 py-2"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Puntaje'}
            </Button>
          </div>
        )}

        {hasSubmitted && (
          <div className="text-center">
            <p className="text-green-400 font-pixel text-xs sm:text-sm mb-3">
              ¡Puntaje guardado exitosamente!
            </p>
            {isTopScore && (
              <p className="text-yellow-400 font-pixel text-[10px] xs:text-xs mb-3">
                ¡Ya puedes reclamar tu bicicleta! 🚲
              </p>
            )}
          </div>
        )}

        {/* Restart Button */}
        <div className="text-center">
          <Button
            onClick={onRestart}
            className="bg-red-600 hover:bg-red-700 font-pixel text-xs sm:text-sm px-3 py-2"
          >
            Jugar de nuevo
          </Button>
        </div>

        {/* Instructions */}
        <p className="text-white text-center font-pixel text-[8px] xs:text-[10px] max-w-[90%] mx-auto">
          {score === 0 
            ? "¡Recoge guantes para sumar puntos y poder guardar tu puntaje!" 
            : "¡Sigue intentando para conseguir más puntos y subir en el ranking!"
          }
        </p>
      </div>
    </div>
  )
}
