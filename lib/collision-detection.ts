export interface CollisionBox {
  x: number
  y: number
  width: number
  height: number
}

export interface GameObject extends CollisionBox {
  image?: HTMLImageElement
  type?: string
}

export function basicCollision(obj1: CollisionBox, obj2: CollisionBox): boolean {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  )
}

export function pixelPerfectCollision(obj1: GameObject, obj2: GameObject): boolean {
  if (!obj1.image || !obj2.image || !obj1.image.complete || !obj2.image.complete) {
    return basicCollision(obj1, obj2)
  }

  if (!basicCollision(obj1, obj2)) {
    return false
  }

  const overlapX = Math.max(obj1.x, obj2.x)
  const overlapY = Math.max(obj1.y, obj2.y)
  const overlapWidth = Math.min(obj1.x + obj1.width, obj2.x + obj2.width) - overlapX
  const overlapHeight = Math.min(obj1.y + obj1.height, obj2.y + obj2.height) - overlapY

  if (overlapWidth <= 0 || overlapHeight <= 0) {
    return false
  }

  try {
    const tempCanvas = document.createElement("canvas")
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx) return basicCollision(obj1, obj2)

    tempCanvas.width = overlapWidth
    tempCanvas.height = overlapHeight

    const scaleX1 = obj1.image.width / obj1.width
    const scaleY1 = obj1.image.height / obj1.height
    const sourceX1 = (overlapX - obj1.x) * scaleX1
    const sourceY1 = (overlapY - obj1.y) * scaleY1
    const sourceWidth1 = overlapWidth * scaleX1
    const sourceHeight1 = overlapHeight * scaleY1

    tempCtx.drawImage(obj1.image, sourceX1, sourceY1, sourceWidth1, sourceHeight1, 0, 0, overlapWidth, overlapHeight)

    const imageData1 = tempCtx.getImageData(0, 0, overlapWidth, overlapHeight)

    tempCtx.clearRect(0, 0, overlapWidth, overlapHeight)

    const scaleX2 = obj2.image.width / obj2.width
    const scaleY2 = obj2.image.height / obj2.height
    const sourceX2 = (overlapX - obj2.x) * scaleX2
    const sourceY2 = (overlapY - obj2.y) * scaleY2
    const sourceWidth2 = overlapWidth * scaleX2
    const sourceHeight2 = overlapHeight * scaleY2

    tempCtx.drawImage(obj2.image, sourceX2, sourceY2, sourceWidth2, sourceHeight2, 0, 0, overlapWidth, overlapHeight)

    const imageData2 = tempCtx.getImageData(0, 0, overlapWidth, overlapHeight)

    for (let i = 0; i < imageData1.data.length; i += 4) {
      const alpha1 = imageData1.data[i + 3]
      const alpha2 = imageData2.data[i + 3]

      if (alpha1 > 0 && alpha2 > 0) {
        return true
      }
    }

    return false
  } catch (error) {
    console.warn("Error en detección pixel-perfect, usando detección básica:", error)
    return basicCollision(obj1, obj2)
  }
}

export interface CustomHitbox extends CollisionBox {
  offsetX?: number
  offsetY?: number
  hitboxWidth?: number
  hitboxHeight?: number
}

export function customHitboxCollision(obj1: CustomHitbox, obj2: CustomHitbox): boolean {
  const hitbox1 = {
    x: obj1.x + (obj1.offsetX || 0),
    y: obj1.y + (obj1.offsetY || 0),
    width: obj1.hitboxWidth || obj1.width,
    height: obj1.hitboxHeight || obj1.height,
  }

  const hitbox2 = {
    x: obj2.x + (obj2.offsetX || 0),
    y: obj2.y + (obj2.offsetY || 0),
    width: obj2.hitboxWidth || obj2.width,
    height: obj2.hitboxHeight || obj2.height,
  }

  return basicCollision(hitbox1, hitbox2)
}

export interface CircularObject {
  x: number
  y: number
  radius: number
}

export function circularCollision(obj1: CircularObject, obj2: CircularObject): boolean {
  const dx = obj1.x - obj2.x
  const dy = obj1.y - obj2.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance < obj1.radius + obj2.radius
}

export class CollisionDetector {
  private usePixelPerfect = true

  constructor(usePixelPerfect = true) {
    this.usePixelPerfect = usePixelPerfect
  }

  setPixelPerfect(enabled: boolean): void {
    this.usePixelPerfect = enabled
  }

  isPixelPerfectEnabled(): boolean {
    return this.usePixelPerfect
  }

  detectCollision(obj1: GameObject, obj2: GameObject): boolean {

      return pixelPerfectCollision(obj1, obj2)
  }

  detectCollisions(obj: GameObject, objects: GameObject[]): GameObject[] {
    return objects.filter((target) => this.detectCollision(obj, target))
  }

  pointInObject(pointX: number, pointY: number, obj: CollisionBox): boolean {
    return pointX >= obj.x && pointX <= obj.x + obj.width && pointY >= obj.y && pointY <= obj.y + obj.height
  }
}

export const collisionDetector = new CollisionDetector(true)
