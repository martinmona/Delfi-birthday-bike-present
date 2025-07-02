# Configuración de Base de Datos para el Juego de Bicicleta (con Prisma)

## 1. Configuración inicial

Este proyecto usa Prisma como ORM para conectar con Neon Tech PostgreSQL.

Tu URL de conexión está configurada en el archivo `.env`:
```
DATABASE_URL=postgresql://ranking_owner:npg_4QG5qMKDxYXZ@ep-muddy-hill-acw83qu0-pooler.sa-east-1.aws.neon.tech/ranking?sslmode=require
```

## 2. Esquema de la base de datos

La tabla de rankings se define en `prisma/schema.prisma`:

```prisma
model Ranking {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(50)
  score     Int
  createdAt DateTime @default(now())

  @@map("rankings")
}
```

## 3. Migraciones

Para aplicar las migraciones:
```bash
pnpm prisma migrate dev
```

Para generar el cliente de Prisma:
```bash
pnpm prisma generate
```

## 4. Reglas de negocio

- Solo se pueden guardar puntajes mayores a 0
- Los nombres están limitados a 50 caracteres
- Los puntajes se ordenan de mayor a menor
- En caso de empate, se considera la fecha de creación (el más antiguo primero)

## 5. Comandos útiles para desarrollo

Ver la base de datos con Prisma Studio:
```bash
pnpm prisma studio
```

Resetear la base de datos:
```bash
pnpm prisma migrate reset
```

Ver todos los rankings:
```bash
pnpm prisma db seed
```
