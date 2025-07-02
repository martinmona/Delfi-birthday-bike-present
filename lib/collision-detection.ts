/**
 * Librería de detección de colisiones para el juego de bicicleta
 * Incluye detección pixel-perfect y básica
 */

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

/**
 * Detección de colisiones básica usando rectángulos
 */
export function basicCollision(obj1: CollisionBox, obj2: CollisionBox): boolean {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  )
}

/**
 * Detección de colisiones pixel-perfect usando imágenes PNG
 * Analiza los píxeles reales para detectar transparencias
 */
export function pixelPerfectCollision(obj1: GameObject, obj2: GameObject): boolean {
  // Verificar que ambos objetos tengan imágenes
  if (!obj1.image || !obj2.image || !obj1.image.complete || !obj2.image.complete) {
    // Fallback a detección básica si no hay imágenes
    return basicCollision(obj1, obj2)
  }

  // Primero verificar si los rectángulos se superponen (optimización)
  if (!basicCollision(obj1, obj2)) {
    return false
  }

  // Calcular el área de superposición
  const overlapX = Math.max(obj1.x, obj2.x)
  const overlapY = Math.max(obj1.y, obj2.y)
  const overlapWidth = Math.min(obj1.x + obj1.width, obj2.x + obj2.width) - overlapX
  const overlapHeight = Math.min(obj1.y + obj1.height, obj2.y + obj2.height) - overlapY

  // Si no hay área de superposición, no hay colisión
  if (overlapWidth <= 0 || overlapHeight <= 0) {
    return false
  }

  try {
    // Crear canvas temporal para verificar píxeles
    const tempCanvas = document.createElement("canvas")
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx) return basicCollision(obj1, obj2)

    tempCanvas.width = overlapWidth
    tempCanvas.height = overlapHeight

    // Dibujar la primera imagen en el área de superposición
    const scaleX1 = obj1.image.width / obj1.width
    const scaleY1 = obj1.image.height / obj1.height
    const sourceX1 = (overlapX - obj1.x) * scaleX1
    const sourceY1 = (overlapY - obj1.y) * scaleY1
    const sourceWidth1 = overlapWidth * scaleX1
    const sourceHeight1 = overlapHeight * scaleY1

    tempCtx.drawImage(obj1.image, sourceX1, sourceY1, sourceWidth1, sourceHeight1, 0, 0, overlapWidth, overlapHeight)

    const imageData1 = tempCtx.getImageData(0, 0, overlapWidth, overlapHeight)

    // Limpiar y dibujar la segunda imagen
    tempCtx.clearRect(0, 0, overlapWidth, overlapHeight)

    const scaleX2 = obj2.image.width / obj2.width
    const scaleY2 = obj2.image.height / obj2.height
    const sourceX2 = (overlapX - obj2.x) * scaleX2
    const sourceY2 = (overlapY - obj2.y) * scaleY2
    const sourceWidth2 = overlapWidth * scaleX2
    const sourceHeight2 = overlapHeight * scaleY2

    tempCtx.drawImage(obj2.image, sourceX2, sourceY2, sourceWidth2, sourceHeight2, 0, 0, overlapWidth, overlapHeight)

    const imageData2 = tempCtx.getImageData(0, 0, overlapWidth, overlapHeight)

    // Verificar si hay píxeles no transparentes que se superponen
    for (let i = 0; i < imageData1.data.length; i += 4) {
      const alpha1 = imageData1.data[i + 3] // Canal alpha de la primera imagen
      const alpha2 = imageData2.data[i + 3] // Canal alpha de la segunda imagen

      // Si ambos píxeles no son transparentes (alpha > 0), hay colisión
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

/**
 * Detección de colisiones con hitboxes personalizados
 * Permite definir áreas de colisión más pequeñas que la imagen completa
 */
export interface CustomHitbox extends CollisionBox {
  offsetX?: number
  offsetY?: number
  hitboxWidth?: number
  hitboxHeight?: number
}

export function customHitboxCollision(obj1: CustomHitbox, obj2: CustomHitbox): boolean {
  // Calcular las hitboxes reales
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

/**
 * Detección de colisiones circular
 * Útil para objetos redondos como pelotas o power-ups
 */
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

/**
 * Clase principal para manejar diferentes tipos de colisiones
 */
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

  /**
   * Detecta colisión usando el método configurado
   */
  detectCollision(obj1: GameObject, obj2: GameObject): boolean {

      return pixelPerfectCollision(obj1, obj2)
  }

  /**
   * Detecta colisiones entre un objeto y una lista de objetos
   */
  detectCollisions(obj: GameObject, objects: GameObject[]): GameObject[] {
    return objects.filter((target) => this.detectCollision(obj, target))
  }

  /**
   * Verifica si un punto está dentro de un objeto
   */
  pointInObject(pointX: number, pointY: number, obj: CollisionBox): boolean {
    return pointX >= obj.x && pointX <= obj.x + obj.width && pointY >= obj.y && pointY <= obj.y + obj.height
  }
}

/**
 * Instancia global del detector de colisiones
 */
export const collisionDetector = new CollisionDetector(true)
