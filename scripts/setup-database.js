const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

async function createTables() {
  const client = await pool.connect()
  
  try {
    console.log('Conectando a la base de datos...')
    
    // Crear tabla rankings
    await client.query(`
      CREATE TABLE IF NOT EXISTS rankings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        score INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    console.log('✅ Tabla rankings creada exitosamente')
    
    // Crear índice
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_rankings_score ON rankings(score DESC, created_at ASC);
    `)
    
    console.log('✅ Índice creado exitosamente')
    
    // Insertar datos de ejemplo
    const result = await client.query('SELECT COUNT(*) FROM rankings')
    const count = parseInt(result.rows[0].count)
    
    if (count === 0) {
      await client.query(`
        INSERT INTO rankings (name, score) VALUES 
        ('Jugador Demo', 100),
        ('Test Player', 85),
        ('Ejemplo', 75);
      `)
      console.log('✅ Datos de ejemplo insertados')
    } else {
      console.log(`ℹ️  La tabla ya tiene ${count} registros`)
    }
    
    // Verificar que todo está funcionando
    const rankings = await client.query('SELECT * FROM rankings ORDER BY score DESC LIMIT 5')
    console.log('🏆 Top 5 rankings:')
    rankings.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name} - ${row.score} puntos`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    client.release()
    await pool.end()
  }
}

createTables()
