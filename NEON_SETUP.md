# Configuración de Base de Datos Neon Tech para Ranking

## Pasos para configurar la base de datos:

### 1. Crear proyecto en Neon Tech
1. Ve a [Neon Tech](https://neon.tech) y crea una cuenta
2. Crea un nuevo proyecto
3. Copia la string de conexión

### 2. Crear tabla de rankings
Ejecuta este SQL en el dashboard de Neon:

```sql
CREATE TABLE rankings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice para ordenar por score
CREATE INDEX idx_rankings_score ON rankings(score DESC);

-- Insertar algunos datos de ejemplo
INSERT INTO rankings (name, score) VALUES 
('Martín', 95),
('Godi', 85),
('Player3', 75),
('Player4', 65),
('Player5', 55);
```

### 3. Configurar variables de entorno
Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Neon Database
DATABASE_URL="postgresql://username:password@hostname/database?sslmode=require"
```

### 4. Instalar dependencias de base de datos
```bash
npm install @neondatabase/serverless
# o
npm install pg @types/pg
```

### 5. Actualizar el archivo API
Reemplaza el contenido de `app/api/rankings/route.ts` con el código que conecta a Neon:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

interface RankingEntry {
  id: number
  name: string
  score: number
  created_at: string
}

export async function GET() {
  try {
    const rankings = await sql`
      SELECT id, name, score, created_at 
      FROM rankings 
      ORDER BY score DESC 
      LIMIT 100
    `
    
    return NextResponse.json(rankings)
  } catch (error) {
    console.error('Error fetching rankings:', error)
    return NextResponse.json({ error: 'Error fetching rankings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, score } = await request.json()
    
    if (!name || typeof score !== 'number') {
      return NextResponse.json({ error: 'Name and score are required' }, { status: 400 })
    }
    
    const cleanName = name.substring(0, 20).trim()
    
    const result = await sql`
      INSERT INTO rankings (name, score) 
      VALUES (${cleanName}, ${score})
      RETURNING *
    `
    
    return NextResponse.json({ success: true, entry: result[0] })
  } catch (error) {
    console.error('Error saving ranking:', error)
    return NextResponse.json({ error: 'Error saving ranking' }, { status: 500 })
  }
}
```

## Cambios realizados en el juego:

1. **Eliminado sistema de victoria fijo**: Ya no hay un puntaje específico para ganar
2. **Nuevo sistema de ranking**: El juego continúa hasta que la persona pierde
3. **Pantalla de ranking**: Muestra el ranking global y permite guardar el puntaje
4. **API de rankings**: Endpoint para obtener y guardar puntajes
5. **Detectión de récord**: Felicita al jugador si logra el puntaje más alto

## Funcionalidades del ranking:

- **Ranking global**: Muestra los top 10 puntajes
- **Posición del jugador**: Indica dónde quedaría el jugador en el ranking
- **Detección de récord**: Si es el puntaje más alto, lanza confeti y felicita
- **Guardado opcional**: El jugador puede elegir guardar su puntaje o no
- **Validación**: Nombres limitados a 20 caracteres

¡El juego ahora es competitivo y permite ver quién tiene los mejores puntajes!
