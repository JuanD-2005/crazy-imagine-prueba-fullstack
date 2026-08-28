# CrazySupportHub

Herramienta interna de tickets de soporte con enriquecimiento automático vía n8n.

## Setup

### Todo junto con Docker Compose (recomendado)

```bash
cp backend/.env.example backend/.env   # completa JWT_SECRET / N8N_WEBHOOK_SECRET
docker compose up --build
```

Levanta PostgreSQL, n8n y el backend (con hot-reload, aplicando migraciones
pendientes automáticamente en cada arranque vía `prisma migrate deploy`). El
seed **no** corre automáticamente para no pisar datos que hayas modificado al
reiniciar el contenedor — corrélo una sola vez a mano:

```bash
docker compose exec backend npx prisma db seed
```

El backend queda publicado en `http://localhost:3000` y n8n en
`http://localhost:5678`. Dentro de la red de Docker, backend y n8n se
resuelven por nombre de servicio (`http://backend:3000`, `http://n8n:5678`) —
por eso `backend/.env.example` usa esos hostnames en `DATABASE_URL` y
`N8N_WEBHOOK_URL` en vez de `localhost`.

### Backend fuera de Docker (`/backend`)

Si preferís correr el backend directo en el host (`npm run start:dev`) en vez
de dentro del contenedor, necesitás valores de `.env` distintos: reemplazá
`postgres` y `n8n` por `localhost` en `DATABASE_URL` y `N8N_WEBHOOK_URL`
respectivamente (Postgres y n8n siguen publicados en el host vía
`docker compose up postgres n8n`).

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

### Frontend (`/frontend`)

_Pendiente — se completa al cerrar la fase de frontend._

## Decisiones técnicas

_Pendiente._

## Uso de IA

_Pendiente — se documentará aquí el uso de Claude Code durante el desarrollo, según lo
solicitado en la prueba._

## Pendientes / bugs conocidos

_Pendiente._
