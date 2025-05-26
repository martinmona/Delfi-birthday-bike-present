"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import GameOverScreen from "./game-over-screen"
import VictoryScreen from "./victory-screen"

const ANIMATION_SPEED = 8
const GAME_WIDTH = 700
const GAME_HEIGHT = 500
const GROUND_HEIGHT = 30
const PLAYER_WIDTH = 100
const PLAYER_HEIGHT = 80
const OBSTACLE_WIDTH = 40
const OBSTACLE_HEIGHT = 40
const BUS_WIDTH = 200
const BUS_HEIGHT = 60
const COLLECTIBLE_SIZE = 30
const GRAVITY = 0.3
const JUMP_FORCE_MIN = 9 // Salto mínimo
const JUMP_FORCE_MAX = 22  // Salto máximo
const GAME_SPEED_INITIAL = 4
const SPEED_INCREMENT = 0.0005
const OBSTACLE_SPAWN_RATE_INITIAL = 0.003
const OBSTACLE_SPAWN_RATE_MAX = 0.015
const COLLECTIBLE_SPAWN_RATE_INITIAL = 0.002
const COLLECTIBLE_SPAWN_RATE_MAX = 0.008
const DIFFICULTY_INCREASE_INTERVAL = 300
const VICTORY_SCORE = 100
const COLLECTIBLE_SCORE = 10
// Nuevas constantes para control de espaciado
const MIN_OBSTACLE_DISTANCE = 200 // Distancia mínima entre obstáculos
const MIN_BUS_DISTANCE = 350 // Distancia mínima entre buses (más grande)
const SAFE_ZONE_AFTER_BUS = 300 // Zona segura después de un bus

const OBSTACLE_TYPES = ["dog", "bus"]

export default function BikeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [victory, setVictory] = useState(false)
  const [score, setScore] = useState(0)
  const { toast } = useToast()

  const gameStateRef = useRef({
    player: {
      x: 50,
      y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
      vy: 0,
      vx: 0,
      isJumping: false,
      animationFrame: 0,
    },
    obstacles: [] as { x: number; y: number; type: string }[],
    collectibles: [] as { x: number; y: number }[],
    gameSpeed: GAME_SPEED_INITIAL,
    frameCount: 0,
    score: 0,
    jumpStartTime: 0,
    isChargingJump: false,
    lastObstacleX: -MIN_OBSTACLE_DISTANCE, // Posición del último obstáculo
    lastBusX: -MIN_BUS_DISTANCE, 
  })

  const imagesRef = useRef<Record<string, HTMLImageElement>>({})
  const getCurrentPlayerImage = (gameState: any) => {
    // Lista de imágenes del jugador en orden de animación
    const playerImages = ["player1", "player2", "player3"]

    // Calcular qué imagen usar basándose en el frame de animación
    const imageIndex = Math.floor(gameState.player.animationFrame / ANIMATION_SPEED) % playerImages.length
    const imageName = playerImages[imageIndex]

    return imagesRef.current[imageName]
  }
  useEffect(() => {
    if (!gameStarted) return
    // Función para verificar si es seguro spawear un obstáculo
    const canSpawnObstacle = (type: string, gameState: any) => {
      const currentX = GAME_WIDTH
      const lastObstacle = gameState.obstacles[gameState.obstacles.length - 1]

      // Si no hay obstáculos, se puede spawear
      if (!lastObstacle) return true

      // Calcular distancia desde el último obstáculo
      const distanceFromLast = currentX - lastObstacle.x

      // Reglas específicas según el tipo
      if (type === "bus") {
        // Los buses necesitan más espacio
        if (distanceFromLast < MIN_BUS_DISTANCE) return false

        // No permitir bus después de bus muy cerca
        if (lastObstacle.type === "bus" && distanceFromLast < MIN_BUS_DISTANCE * 1.5) return false

        // Verificar que haya pasado suficiente tiempo desde el último bus
        const distanceFromLastBus = currentX - gameState.lastBusX
        if (distanceFromLastBus < MIN_BUS_DISTANCE) return false
      } else {
        // Para perros, verificar distancia mínima
        if (distanceFromLast < MIN_OBSTACLE_DISTANCE) return false

        // No permitir perro inmediatamente después de un bus
        if (lastObstacle.type === "bus" && distanceFromLast < SAFE_ZONE_AFTER_BUS) return false
      }

      return true
    }
    // Load images
    const imageSources = {
      player1: "images/player1.png",
      player2: "images/player2.png",
      player3: "images/player3.png",
      dog: "images/dog.png",
      bus: "images/bus.png",
      glove: "images/glove.png",
      background: "images/city-background.png",
    }

    Object.entries(imageSources).forEach(([key, src]) => {
      const img = new Image()
      img.src = src
      img.crossOrigin = "anonymous"
      img.onload = () => {
        console.log(`Image loaded: ${key}`)
        imagesRef.current[key] = img
      }
      img.onerror = (e) => {
        console.error(`Failed to load image: ${key}`, e)
      }
    })

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number

    const gameLoop = () => {
      const gameState = gameStateRef.current

      // Update game state
      gameState.frameCount++
      gameState.gameSpeed += SPEED_INCREMENT

      // Update player
      const player = gameState.player
      player.animationFrame++

      if (player.isJumping) {
        player.y += player.vy
        player.vy += GRAVITY
        player.x += player.vx
        // Check if player landed
        if (player.y >= GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT) {
          player.y = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT
          player.isJumping = false
          player.vy = 0
          player.vx = 0 // Detener movimiento horizontal al aterrizar
          // Volver a la posición X original gradualmente
          if (player.x > 50) {
            player.x = Math.max(50, player.x - 2)
          }
        } else {
          player.x = 50
        }
      }

      // Calcular dificultad progresiva basada en el tiempo de juego
      const difficultyLevel = Math.floor(gameState.frameCount / DIFFICULTY_INCREASE_INTERVAL)
      const obstacleSpawnRate = Math.min(OBSTACLE_SPAWN_RATE_INITIAL + difficultyLevel * 0.001, OBSTACLE_SPAWN_RATE_MAX)
      const collectibleSpawnRate = Math.min(
        COLLECTIBLE_SPAWN_RATE_INITIAL + difficultyLevel * 0.0005,
        COLLECTIBLE_SPAWN_RATE_MAX,
      )

      // Spawn obstacles con control de espaciado mejorado
      if (Math.random() < obstacleSpawnRate) {
        // Seleccionar tipo de obstáculo con probabilidades balanceadas
        // Hacer que los buses sean menos frecuentes en niveles bajos
        const busChance = Math.min(0.3 + difficultyLevel * 0.05, 0.5) // Máximo 50% de chance para buses
        const type = Math.random() < busChance ? "bus" : "dog"

        // Verificar si es seguro spawear este tipo de obstáculo
        if (canSpawnObstacle(type, gameState)) {
          gameState.obstacles.push({
            x: GAME_WIDTH,
            y: GAME_HEIGHT - GROUND_HEIGHT - (type === "dog" ? OBSTACLE_HEIGHT : BUS_HEIGHT),
            type,
          })

          // Actualizar posiciones de referencia
          gameState.lastObstacleX = GAME_WIDTH
          if (type === "bus") {
            gameState.lastBusX = GAME_WIDTH
          }
        }
      }

      // Spawn collectibles con tasa progresiva
      if (Math.random() < collectibleSpawnRate) {
        // Solo spawear coleccionables si no hay obstáculos muy cerca
        const lastObstacle = gameState.obstacles[gameState.obstacles.length - 1]
        const safeToSpawnCollectible = !lastObstacle || GAME_WIDTH - lastObstacle.x > 150

        if (safeToSpawnCollectible) {
          gameState.collectibles.push({
            x: GAME_WIDTH,
            y: GAME_HEIGHT - GROUND_HEIGHT - COLLECTIBLE_SIZE - Math.random() * 100,
          })
        }
      }

      // Move obstacles
      gameState.obstacles = gameState.obstacles
        .map((obstacle) => ({
          ...obstacle,
          x: obstacle.x - gameState.gameSpeed,
        }))
        .filter((obstacle) => obstacle.x > -(obstacle.type === "bus" ? BUS_WIDTH : OBSTACLE_WIDTH))

      // Move collectibles
      gameState.collectibles = gameState.collectibles
        .map((collectible) => ({
          ...collectible,
          x: collectible.x - gameState.gameSpeed,
        }))
        .filter((collectible) => collectible.x > -COLLECTIBLE_SIZE)

      // Check collisions with obstacles
      for (const obstacle of gameState.obstacles) {
        const obstacleWidth = obstacle.type === "bus" ? BUS_WIDTH : OBSTACLE_WIDTH
        const obstacleHeight = obstacle.type === "bus" ? BUS_HEIGHT : OBSTACLE_HEIGHT

        if (
          player.x < obstacle.x + obstacleWidth &&
          player.x + PLAYER_WIDTH > obstacle.x &&
          player.y < obstacle.y + obstacleHeight &&
          player.y + PLAYER_HEIGHT > obstacle.y
        ) {
          setGameOver(true)
          return
        }
      }

      // Check collisions with collectibles
      gameState.collectibles = gameState.collectibles.filter((collectible) => {
        if (
          player.x < collectible.x + COLLECTIBLE_SIZE &&
          player.x + PLAYER_WIDTH > collectible.x &&
          player.y < collectible.y + COLLECTIBLE_SIZE &&
          player.y + PLAYER_HEIGHT > collectible.y
        ) {
          gameState.score += COLLECTIBLE_SCORE
          setScore(gameState.score)

          toast({
            title: "¡+5 puntos!",
            description: "¡Buen trabajo!",
            duration: 1000,
          })

          if (gameState.score >= VICTORY_SCORE) {
            setVictory(true)
          }

          return false
        }
        return true
      })

      // Draw everything
      // Background
      if (imagesRef.current.background) {
        const bgWidth = imagesRef.current.background.width
        const bgHeight = imagesRef.current.background.height
        const bgX = (gameState.frameCount * 2) % bgWidth
        ctx.drawImage(imagesRef.current.background, -bgX, 0, bgWidth, GAME_HEIGHT)
        ctx.drawImage(imagesRef.current.background, bgWidth - bgX, 0, bgWidth, GAME_HEIGHT)
      } else {
        ctx.fillStyle = "#333"
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      }

      // Ground
      ctx.fillStyle = "#545a74"
      ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT)

      /// Player con animación
      const currentPlayerImage = getCurrentPlayerImage(gameState)
      if (currentPlayerImage && currentPlayerImage.complete) {
        ctx.drawImage(currentPlayerImage, player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT)
      } else {
        // Fallback: dibujar un rectángulo con animación básica
        // Cambiar ligeramente el color para simular movimiento
        const animationOffset = Math.sin(player.animationFrame * 0.3) * 5
        ctx.fillStyle = "#545a74"
        ctx.fillRect(player.x, player.y + animationOffset, PLAYER_WIDTH, PLAYER_HEIGHT)

        // Dibujar ruedas de bicicleta con rotación
        const wheelRotation = (player.animationFrame * 0.2) % (Math.PI * 2)
        ctx.fillStyle = "#000000"

        // Rueda trasera
        ctx.save()
        ctx.translate(player.x + 15, player.y + 45 + animationOffset)
        ctx.rotate(wheelRotation)
        ctx.beginPath()
        ctx.arc(0, 0, 10, 0, Math.PI * 2)
        ctx.fill()
        // Rayos de la rueda
        ctx.strokeStyle = "#333"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-8, 0)
        ctx.lineTo(8, 0)
        ctx.moveTo(0, -8)
        ctx.lineTo(0, 8)
        ctx.stroke()
        ctx.restore()

        // Rueda delantera
        ctx.save()
        ctx.translate(player.x + 45, player.y + 45 + animationOffset)
        ctx.rotate(wheelRotation)
        ctx.beginPath()
        ctx.arc(0, 0, 10, 0, Math.PI * 2)
        ctx.fill()
        // Rayos de la rueda
        ctx.strokeStyle = "#333"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-8, 0)
        ctx.lineTo(8, 0)
        ctx.moveTo(0, -8)
        ctx.lineTo(0, 8)
        ctx.stroke()
        ctx.restore()
      }

      // Obstacles
      for (const obstacle of gameState.obstacles) {
        if (imagesRef.current[obstacle.type] && imagesRef.current[obstacle.type].complete) {
          const height = obstacle.type === "bus" ? BUS_HEIGHT : OBSTACLE_HEIGHT
          const width = obstacle.type === "bus" ? BUS_WIDTH : OBSTACLE_WIDTH
          ctx.drawImage(imagesRef.current[obstacle.type], obstacle.x, obstacle.y, width, height)
        } else {
          // Fallback: dibujar formas básicas para representar los obstáculos
          if (obstacle.type === "dog") {
            // Pochi: rectángulo blanco con detalles
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(obstacle.x, obstacle.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT)
            ctx.fillStyle = "#000000"
            ctx.fillRect(obstacle.x + OBSTACLE_WIDTH - 10, obstacle.y, 10, 15) // cabeza
            ctx.fillRect(obstacle.x, obstacle.y + OBSTACLE_HEIGHT - 10, OBSTACLE_WIDTH, 5) // patas
          } else {
            // Bondi del 39: rectángulo azul más grande
            ctx.fillStyle = "#0066ff"
            ctx.fillRect(obstacle.x, obstacle.y, BUS_WIDTH, BUS_HEIGHT)
            // Ventanas
            ctx.fillStyle = "#ffffff"
            for (let i = 0; i < 6; i++) {
              ctx.fillRect(obstacle.x + 20 + i * 30, obstacle.y + 10, 20, 15)
            }
            // Número 39
            ctx.fillStyle = "#ffffff"
            ctx.font = "16px monospace"
            ctx.fillText("39", obstacle.x + BUS_WIDTH - 40, obstacle.y + 30)
          }
        }
      }

      // Collectibles
      for (const collectible of gameState.collectibles) {
        if (imagesRef.current.glove && imagesRef.current.glove.complete) {
          ctx.drawImage(imagesRef.current.glove, collectible.x, collectible.y, COLLECTIBLE_SIZE, COLLECTIBLE_SIZE)
        } else {
          // Fallback: dibujar un guante de boxeo básico
          ctx.fillStyle = "#ff0000" // rojo para el guante
          ctx.beginPath()
          ctx.arc(
            collectible.x + COLLECTIBLE_SIZE / 2,
            collectible.y + COLLECTIBLE_SIZE / 2,
            COLLECTIBLE_SIZE / 2,
            0,
            Math.PI * 2,
          )
          ctx.fill()
          ctx.fillStyle = "#aa0000" // rojo más oscuro para detalles
          ctx.fillRect(collectible.x + 5, collectible.y + COLLECTIBLE_SIZE - 10, COLLECTIBLE_SIZE - 10, 5)
        }
      }

      // Score y nivel
      ctx.fillStyle = "#ffffff"
      ctx.font = "20px monospace"
      ctx.fillText(`Puntos: ${gameState.score}`, 20, 30)
      ctx.fillText(`Nivel: ${difficultyLevel + 1}`, 20, 60)

      if (!gameOver && !victory) {
        animationFrameId = requestAnimationFrame(gameLoop)
      }
    }

    animationFrameId = requestAnimationFrame(gameLoop)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.code === "Space" || e.code === "ArrowUp") &&
        !gameStateRef.current.player.isJumping &&
        !gameStateRef.current.isChargingJump
      ) {
        gameStateRef.current.isChargingJump = true
        gameStateRef.current.jumpStartTime = Date.now()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.code === "ArrowUp") && gameStateRef.current.isChargingJump) {
        const holdTime = Date.now() - gameStateRef.current.jumpStartTime

        // Salto corto si se mantiene menos de 200ms, salto alto si se mantiene más
        const jumpForce = holdTime < 200 ? JUMP_FORCE_MIN : Math.min(JUMP_FORCE_MAX, JUMP_FORCE_MIN + holdTime / 75)

        gameStateRef.current.player.isJumping = true
        gameStateRef.current.player.vy = -jumpForce
        gameStateRef.current.isChargingJump = false
        gameStateRef.current.jumpStartTime = 0
        gameStateRef.current.player.vx = gameStateRef.current.gameSpeed * 1.2
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [gameStarted, gameOver, victory, toast])

  const handleJump = () => {
    if (!gameStateRef.current.player.isJumping && !gameStateRef.current.isChargingJump) {
      // Para el botón, hacer un salto medio automáticamente
      gameStateRef.current.player.isJumping = true
      gameStateRef.current.player.vy = -(JUMP_FORCE_MIN + JUMP_FORCE_MAX) / 2
      gameStateRef.current.player.vx = gameStateRef.current.gameSpeed * 1.2
    }
  }

  const handleRestart = () => {
    gameStateRef.current = {
      player: {
        x: 50,
        y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
        vy: 0,
        vx: 0,
        isJumping: false,
        animationFrame: 0,
      },
      obstacles: [],
      collectibles: [],
      gameSpeed: GAME_SPEED_INITIAL,
      frameCount: 0,
      score: 0,
      jumpStartTime: 0,
      isChargingJump: false,
      lastObstacleX: -MIN_OBSTACLE_DISTANCE,
      lastBusX: -MIN_BUS_DISTANCE,
    }
    setScore(0)
    setGameOver(false)
    setVictory(false)
    setGameStarted(true)
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="border-4 border-white rounded-lg shadow-lg"
        />

        {!gameStarted && !gameOver && !victory && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <h2 className="text-3xl font-bold text-white mb-6 font-pixel">¡Aventura en Bicicleta!</h2>
            <p className="text-white mb-4 text-center max-w-md font-pixel text-sm">
              La bicicleta está lista, solo tenés que ir a buscarla pero...
              <br />
              ¡hay perros y collectivos en el camino!
              <br />
              <br />
              Esquivá los bondis del 39, no pises a pochi, y agarrá los guantes de boxeo para sumar puntos.
              <br />
              <br />
              Consegí {VICTORY_SCORE} puntos y obtené tu regalo!
            </p>
            <Button onClick={() => setGameStarted(true)} className="bg-red-600 hover:bg-red-700 font-pixel">
              Empezar
            </Button>
          </div>
        )}

        {gameOver && <GameOverScreen score={score} onRestart={handleRestart} />}
        {victory && <VictoryScreen score={score} />}
      </div>

      {gameStarted && !gameOver && !victory && (
        <div className="mt-4">
          <p className="text-white text-center mt-2 font-pixel text-xs">
            Presiona la flecha arriba o mantén la barra espaciadora para saltar.
          </p>
        </div>
      )}
    </div>
  )
}
