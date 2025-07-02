"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import RankingScreen from "./ranking-screen"
import { collisionDetector, type GameObject } from "@/lib/collision-detection"

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
const INITIAL_GRAVITY = 0.3
const JUMP_FORCE_MIN = 10
const JUMP_FORCE_MAX = 22
const GAME_SPEED_INITIAL = 4
const SPEED_INCREMENT = 0.0005
const OBSTACLE_SPAWN_RATE_INITIAL = 0.003
const OBSTACLE_SPAWN_RATE_MAX = 0.015
const COLLECTIBLE_SPAWN_RATE_INITIAL = 0.002
const COLLECTIBLE_SPAWN_RATE_MAX = 0.008
const DIFFICULTY_INCREASE_INTERVAL = 300
const COLLECTIBLE_SCORE = 5
const MIN_OBSTACLE_DISTANCE = 200
const MIN_BUS_DISTANCE = 350
const SAFE_ZONE_AFTER_BUS = 300

const OBSTACLE_TYPES = ["dog", "bus"]

export default function BikeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
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
    lastObstacleX: -MIN_OBSTACLE_DISTANCE,
    lastBusX: -MIN_BUS_DISTANCE, 
  })

  const imagesRef = useRef<Record<string, HTMLImageElement>>({})
  const createGameObject = (
    x: number,
    y: number,
    width: number,
    height: number,
    imageKey?: string,
    type?: string,
  ): GameObject => ({
    x,
    y,
    width,
    height,
    image: imageKey ? imagesRef.current[imageKey] : undefined,
    type,
  })
  const getCurrentPlayerImage = (gameState: any) => {
    const playerImages = ["player1", "player2", "player3"]
    const imageIndex = Math.floor(gameState.player.animationFrame / ANIMATION_SPEED) % playerImages.length
    const imageName = playerImages[imageIndex]

    return imagesRef.current[imageName]
  }
  useEffect(() => {
    if (!gameStarted) return
    const canSpawnObstacle = (type: string, gameState: any) => {
      const currentX = GAME_WIDTH
      const lastObstacle = gameState.obstacles[gameState.obstacles.length - 1]

      if (!lastObstacle) return true

      const distanceFromLast = currentX - lastObstacle.x

      if (type === "bus") {
        if (distanceFromLast < MIN_BUS_DISTANCE) return false
        if (lastObstacle.type === "bus" && distanceFromLast < MIN_BUS_DISTANCE * 1.5) return false
        const distanceFromLastBus = currentX - gameState.lastBusX
        if (distanceFromLastBus < MIN_BUS_DISTANCE) return false
      } else {
        if (distanceFromLast < MIN_OBSTACLE_DISTANCE) return false
        if (lastObstacle.type === "bus" && distanceFromLast < SAFE_ZONE_AFTER_BUS) return false
      }

      return true
    }
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

      gameState.frameCount++
      gameState.gameSpeed += SPEED_INCREMENT

      const player = gameState.player
      player.animationFrame++
      const currentGravity = INITIAL_GRAVITY + gameState.gameSpeed * 0.001

      if (player.isJumping) {
        player.y += player.vy
        player.vy += currentGravity
        player.x += player.vx
        if (player.y >= GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT) {
          player.y = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT
          player.isJumping = false
          player.vy = 0
          player.vx = 0
          if (player.x > 50) {
            player.x = Math.max(50, player.x - 2)
          }
        } else {
          player.x = 50
        }
      }

      const difficultyLevel = Math.floor(gameState.frameCount / DIFFICULTY_INCREASE_INTERVAL)
      const obstacleSpawnRate = Math.min(OBSTACLE_SPAWN_RATE_INITIAL + difficultyLevel * 0.001, OBSTACLE_SPAWN_RATE_MAX)
      const collectibleSpawnRate = Math.min(
        COLLECTIBLE_SPAWN_RATE_INITIAL + difficultyLevel * 0.0005,
        COLLECTIBLE_SPAWN_RATE_MAX,
      )

      if (Math.random() < obstacleSpawnRate) {
        const busChance = Math.min(0.3 + difficultyLevel * 0.05, 0.5)
        const type = Math.random() < busChance ? "bus" : "dog"

        if (canSpawnObstacle(type, gameState)) {
          gameState.obstacles.push({
            x: GAME_WIDTH,
            y: GAME_HEIGHT - GROUND_HEIGHT - (type === "dog" ? OBSTACLE_HEIGHT : BUS_HEIGHT),
            type,
          })

          gameState.lastObstacleX = GAME_WIDTH
          if (type === "bus") {
            gameState.lastBusX = GAME_WIDTH
          }
        }
      }

      if (Math.random() < collectibleSpawnRate) {
        const lastObstacle = gameState.obstacles[gameState.obstacles.length - 1]
        const safeToSpawnCollectible = !lastObstacle || GAME_WIDTH - lastObstacle.x > 150

        if (safeToSpawnCollectible) {
          gameState.collectibles.push({
            x: GAME_WIDTH,
            y: GAME_HEIGHT - GROUND_HEIGHT - COLLECTIBLE_SIZE - Math.random() * 100,
          })
        }
      }

      gameState.obstacles = gameState.obstacles
        .map((obstacle) => ({
          ...obstacle,
          x: obstacle.x - gameState.gameSpeed,
        }))
        .filter((obstacle) => obstacle.x > -(obstacle.type === "bus" ? BUS_WIDTH : OBSTACLE_WIDTH))

      gameState.collectibles = gameState.collectibles
        .map((collectible) => ({
          ...collectible,
          x: collectible.x - gameState.gameSpeed,
        }))
        .filter((collectible) => collectible.x > -COLLECTIBLE_SIZE)

      const playerObject = createGameObject(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT, "player", "player")

      for (const obstacle of gameState.obstacles) {
        const obstacleWidth = obstacle.type === "bus" ? BUS_WIDTH : OBSTACLE_WIDTH
        const obstacleHeight = obstacle.type === "bus" ? BUS_HEIGHT : OBSTACLE_HEIGHT

        const obstacleObject = createGameObject(
          obstacle.x,
          obstacle.y,
          obstacleWidth,
          obstacleHeight,
          obstacle.type,
          obstacle.type,
        )

        if (collisionDetector.detectCollision(playerObject, obstacleObject)) {
          setGameOver(true)
          return
        }
      }

      gameState.collectibles = gameState.collectibles.filter((collectible) => {
        const collectibleObject = createGameObject(
          collectible.x,
          collectible.y,
          COLLECTIBLE_SIZE,
          COLLECTIBLE_SIZE,
          "glove",
          "collectible",
        )

        if (collisionDetector.detectCollision(playerObject, collectibleObject)) {
          gameState.score += COLLECTIBLE_SCORE
          setScore(gameState.score)

          toast({
            title: "¡+5 puntos!",
            description: "¡Buen trabajo!",
            duration: 1000,
          })

          return false
        }
        return true
      })

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

      ctx.fillStyle = "#545a74"
      ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT)

      const currentPlayerImage = getCurrentPlayerImage(gameState)
      if (currentPlayerImage && currentPlayerImage.complete) {
        ctx.drawImage(currentPlayerImage, player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT)
      } else {
        const animationOffset = Math.sin(player.animationFrame * 0.3) * 5
        ctx.fillStyle = "#545a74"
        ctx.fillRect(player.x, player.y + animationOffset, PLAYER_WIDTH, PLAYER_HEIGHT)

        const wheelRotation = (player.animationFrame * 0.2) % (Math.PI * 2)
        ctx.fillStyle = "#000000"

        ctx.save()
        ctx.translate(player.x + 15, player.y + 45 + animationOffset)
        ctx.rotate(wheelRotation)
        ctx.beginPath()
        ctx.arc(0, 0, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#333"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-8, 0)
        ctx.lineTo(8, 0)
        ctx.moveTo(0, -8)
        ctx.lineTo(0, 8)
        ctx.stroke()
        ctx.restore()

        ctx.save()
        ctx.translate(player.x + 45, player.y + 45 + animationOffset)
        ctx.rotate(wheelRotation)
        ctx.beginPath()
        ctx.arc(0, 0, 10, 0, Math.PI * 2)
        ctx.fill()
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

      for (const obstacle of gameState.obstacles) {
        if (imagesRef.current[obstacle.type] && imagesRef.current[obstacle.type].complete) {
          const height = obstacle.type === "bus" ? BUS_HEIGHT : OBSTACLE_HEIGHT
          const width = obstacle.type === "bus" ? BUS_WIDTH : OBSTACLE_WIDTH
          ctx.drawImage(imagesRef.current[obstacle.type], obstacle.x, obstacle.y, width, height)
        } else {
          if (obstacle.type === "dog") {
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(obstacle.x, obstacle.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT)
            ctx.fillStyle = "#000000"
            ctx.fillRect(obstacle.x + OBSTACLE_WIDTH - 10, obstacle.y, 10, 15)
            ctx.fillRect(obstacle.x, obstacle.y + OBSTACLE_HEIGHT - 10, OBSTACLE_WIDTH, 5)
          } else {
            ctx.fillStyle = "#0066ff"
            ctx.fillRect(obstacle.x, obstacle.y, BUS_WIDTH, BUS_HEIGHT)
            ctx.fillStyle = "#ffffff"
            for (let i = 0; i < 6; i++) {
              ctx.fillRect(obstacle.x + 20 + i * 30, obstacle.y + 10, 20, 15)
            }
            ctx.fillStyle = "#ffffff"
            ctx.font = "16px monospace"
            ctx.fillText("39", obstacle.x + BUS_WIDTH - 40, obstacle.y + 30)
          }
        }
      }

      for (const collectible of gameState.collectibles) {
        if (imagesRef.current.glove && imagesRef.current.glove.complete) {
          ctx.drawImage(imagesRef.current.glove, collectible.x, collectible.y, COLLECTIBLE_SIZE, COLLECTIBLE_SIZE)
        } else {
          ctx.fillStyle = "#ff0000"
          ctx.beginPath()
          ctx.arc(
            collectible.x + COLLECTIBLE_SIZE / 2,
            collectible.y + COLLECTIBLE_SIZE / 2,
            COLLECTIBLE_SIZE / 2,
            0,
            Math.PI * 2,
          )
          ctx.fill()
          ctx.fillStyle = "#aa0000"
          ctx.fillRect(collectible.x + 5, collectible.y + COLLECTIBLE_SIZE - 10, COLLECTIBLE_SIZE - 10, 5)
        }
      }

      ctx.fillStyle = "#ffffff"
      ctx.font = "20px monospace"
      ctx.fillText(`Puntos: ${gameState.score}`, 20, 30)
      ctx.fillText(`Nivel: ${difficultyLevel + 1}`, 20, 60)

      if (!gameOver) {
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

      if (e.code === 'Space' && gameStarted && !gameOver) {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.code === "ArrowUp") && gameStateRef.current.isChargingJump) {
        const holdTime = Date.now() - gameStateRef.current.jumpStartTime

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

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      if (!gameStateRef.current.player.isJumping && !gameStateRef.current.isChargingJump) {
        gameStateRef.current.isChargingJump = true
        gameStateRef.current.jumpStartTime = Date.now()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      if (gameStateRef.current.isChargingJump) {
        const holdTime = Date.now() - gameStateRef.current.jumpStartTime
        const jumpForce = holdTime < 200 ? JUMP_FORCE_MIN : JUMP_FORCE_MAX
        gameStateRef.current.player.isJumping = true
        gameStateRef.current.player.vy = -jumpForce
        gameStateRef.current.isChargingJump = false
        gameStateRef.current.jumpStartTime = 0
      }
    }

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false })
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false })

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchend", handleTouchEnd)
    }
  }, [gameStarted, gameOver, toast])

  const handleJump = () => {
    if (!gameStateRef.current.player.isJumping && !gameStateRef.current.isChargingJump) {
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
    setGameStarted(true)
  }

  return (
    <div className="game-container flex flex-col items-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="game-canvas border-4 border-white rounded-lg shadow-lg max-w-full h-auto touch-none"
        />

        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-2 sm:p-4 overflow-y-auto">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 sm:mb-4 font-pixel text-center">
              ¡Aventura en Bicicleta!
            </h2>
            <div className="text-white text-center max-w-[90%] sm:max-w-xs md:max-w-sm font-pixel text-[10px] xs:text-xs sm:text-sm space-y-2">
              <p>La bicicleta está lista, solo tenés que ir a buscarla pero...</p>
              <p>¡hay perros y collectivos en el camino!</p>
              <p>Esquivá los bondis del 39, no pises a pochi, y agarrá los guantes de boxeo para sumar puntos.</p>
              <p>¡Consigue la mayor cantidad de puntos posible y sube al ranking global!</p>
            </div>
            <Button
              onClick={() => setGameStarted(true)}
              className="bg-red-600 hover:bg-red-700 font-pixel mt-3 sm:mt-4 text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2"
            >
              Empezar
            </Button>
          </div>
        )}

        {gameOver && <RankingScreen score={score} onRestart={handleRestart} />}
      </div>

      {gameStarted && !gameOver && (
        <div className="mt-4">
          <p className="text-white text-center mt-2 font-pixel text-[10px] xs:text-xs sm:text-sm max-w-[90%] sm:max-w-md">
            Presiona rápido o mantén la barra espaciadora para diferentes alturas de salto. En móvil, toca y mantén la
            pantalla.
          </p>
        </div>
      )}
    </div>
  )
}
