# CrazySupportHub

Herramienta interna de tickets de soporte con enriquecimiento automático (prioridad,
categoría, tags y respuesta sugerida) vía un workflow de n8n disparado al crear cada
ticket.

## Demo

_[Link al video/GIF de la demo — pendiente de grabar]_

## Setup

### 1. Clonar y configurar variables de entorno

```bash
git clone <url-del-repo>
cd PruebaTecnica
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

En `backend/.env`, completá `JWT_SECRET` y `N8N_WEBHOOK_SECRET` con valores random
propios (cualquier string largo sirve para desarrollo local). El resto de las variables
(`DATABASE_URL`, `N8N_WEBHOOK_URL`, `PORT`, `CORS_ORIGIN`) ya vienen con los valores
correctos para correr todo vía Docker Compose — no hace falta tocarlas. `frontend/.env`
ya trae `VITE_API_URL=http://localhost:3000`, que es donde queda publicado el backend.

> Si preferís correr el backend fuera de Docker (`npm run start:dev` en el host) en vez
> de en el contenedor, `DATABASE_URL` y `N8N_WEBHOOK_URL` necesitan `localhost` en vez de
> `postgres`/`n8n` (esos son nombres de servicio, solo resolubles dentro de la red de
> Docker). Ver el bloque "Backend fuera de Docker" más abajo.

### 2. Levantar Postgres, n8n y el backend

```bash
docker compose up --build
```

Esto levanta los tres servicios contenedorizados. El backend aplica automáticamente las
migraciones pendientes en cada arranque (`prisma migrate deploy`) y queda con hot-reload
activo (ver "La historia real del fix de `nest --watch`" más abajo). El **seed no corre
solo** — es un paso manual explícito para no pisar datos que hayas modificado si
reiniciás el contenedor:

```bash
docker compose exec backend npx prisma db seed
```

Con esto quedan 3 usuarios y 12 tickets de prueba. El seed es idempotente (usa
`upsert`), así que correrlo de nuevo no duplica nada.

- Backend: `http://localhost:3000`
- n8n: `http://localhost:5678`
- Postgres: `localhost:5432`

### 3. Importar y activar el workflow de n8n

El JSON del workflow vive en [`n8n/workflow.json`](n8n/workflow.json). Pasos esenciales
(instrucciones completas y detalladas en [`docs/n8n-setup.md`](docs/n8n-setup.md)):

1. Abrí `http://localhost:5678`, creá tu owner account si es la primera vez.
2. Menú → **Import from File** → seleccioná `n8n/workflow.json`.
3. Creá las 2 credenciales **Header Auth** que te va a pedir (`X-Webhook-Secret`, mismo
   valor que `N8N_WEBHOOK_SECRET` en `backend/.env`, una para el nodo Webhook y otra
   para el nodo Send Callback).
4. Activá el workflow (toggle **Active**).

Sin este paso el backend igual funciona: el ticket se crea y el disparo saliente
simplemente no encuentra el webhook activo, así que queda en `enrichmentStatus: pending`
en vez de avanzar — comportamiento esperado, no un error.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Corre en `http://localhost:5173` (fuera de Docker, a propósito — ver Decisiones
técnicas). Necesita el backend ya levantado en `http://localhost:3000`.

### Usuarios de prueba (del seed)

| Email | Password | Rol |
|---|---|---|
| `admin@crazysupporthub.test` | `Admin1234!` | admin |
| `bruno.agente@crazysupporthub.test` | `Agent1234!` | agent |
| `carla.agente@crazysupporthub.test` | `Agent1234!` | agent |

### Backend fuera de Docker

Si preferís correr el backend directo en el host en vez de en el contenedor (Postgres y
n8n siguen contenedorizados vía `docker compose up postgres n8n`):

```bash
cd backend
# En .env: cambiá "postgres"/"n8n" por "localhost" en DATABASE_URL / N8N_WEBHOOK_URL
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

### Tests

```bash
cd backend
npm run test       # unit
npm run test:e2e   # e2e (Supertest, necesita Postgres corriendo)
```

Los tests e2e corren contra una base de datos **separada** de la de desarrollo
(`crazysupporthub_test`, mismo Postgres del `docker-compose`), para que una corrida
interrumpida a mitad de camino nunca deje datos de test mezclados con los del seed real.
Se crea una sola vez:

```bash
docker compose exec postgres createdb -U crazysupporthub crazysupporthub_test
cp backend/.env.test.example backend/.env.test   # completá los secretos igual que en .env
```

`npm run test:e2e` carga `backend/.env.test` automáticamente (vía `dotenv-cli`) y aplica
migraciones + seed sobre esa base antes de correr — no hace falta ningún paso manual
extra.

## Decisiones técnicas

### Stack

**NestJS + Prisma + PostgreSQL** en el backend: Nest da Guards para roles, Pipes con
`class-validator` para validación, y un módulo de testing integrado — mapea directo con
los requisitos de auth/roles/validación/tests de la prueba. Prisma ofrece mejor DX que
TypeORM para migraciones y un cliente tipado desde el schema (importante para el seed y
para los DTOs de tickets).

**React + Vite + TypeScript + React Router + TanStack Query** en el frontend: es una SPA
que vive completamente detrás de login, así que SSR (Next.js) hubiera sido complejidad
sin beneficio real. TanStack Query resuelve caching, invalidación y — más importante acá
— el polling condicional del estado de enriquecimiento sin tener que escribir esa lógica
a mano.

### Enriquecimiento asíncrono: pending → processing → done/failed

`Ticket.enrichmentStatus` tiene 4 estados, no solo dos, porque el flujo tiene dos saltos
de red independientes que pueden fallar por separado:

1. Al crear el ticket (`TicketsService.create`), se persiste con `enrichmentStatus:
   pending` y se dispara un `POST` a n8n (`N8nNotifierService`) con `{ticketId, title,
   description}` y un timeout de 5s. Esta llamada es **fire-and-forget respecto al
   usuario**: si n8n no responde, está caído, o tarda, el error se loguea
   (`Logger.error`) y el ticket queda en `pending` — pero la respuesta HTTP de `POST
   /tickets` ya se le devolvió al usuario con `201` antes de intentar esto. El usuario
   nunca espera a n8n.
2. Si el `POST` saliente sí devuelve `2xx`, recién ahí el ticket pasa a `processing` —
   confirma que n8n *recibió* el ticket, no que ya lo clasificó.
3. El workflow de n8n (clasificación por keywords + `HTTP Request` de vuelta) llama a
   `POST /webhooks/n8n/enrichment` con el resultado. Si `status: done`, se completan
   `priority`/`category`/`tags`/`suggestedReply` y el ticket pasa a `done`. Si `status:
   failed` (el nodo Code de n8n tiene su propio `try/catch`), pasa a `failed` sin tocar
   esos campos.

Separar `processing` de `done` deja rastro de en qué salto de la cadena se frenó un
ticket que nunca termina de enriquecerse (ver Pendientes).

### Backend en el mismo docker-compose que n8n

Hasta la Fase 4 el backend corría en el host (`npm run start:dev`) apuntando a n8n vía
`localhost:5678`. Se movió al mismo `docker-compose.yml` (Fase 5) para que backend y n8n
se resuelvan por **nombre de servicio** (`http://backend:3000`, `http://n8n:5678`) en vez
de `host.docker.internal`, que no es portable entre Linux/Mac/Windows y agrega fricción
para quien evalúe esto en una máquina que no sea la mía. El frontend se dejó
deliberadamente **fuera** de Docker: no gana nada corriendo en un contenedor durante
desarrollo (no necesita resolver nombres de servicio de la red interna, solo pegarle al
backend por su puerto publicado), y agregar un cuarto servicio con su propio hot-reload
en contenedor era complejidad extra sin beneficio para el alcance de esta prueba.

### Por qué se hardcodeó la URL del callback en el nodo de n8n

El diseño original tenía `BACKEND_CALLBACK_URL` como variable de entorno del servicio
`n8n` en `docker-compose.yml`, referenciada desde el nodo `HTTP Request` del workflow
como `{{$env.BACKEND_CALLBACK_URL}}` — así no quedaba ninguna URL hardcodeada en el JSON
exportado. En la práctica, esta instancia de n8n bloquea el acceso a variables de entorno
desde expresiones de nodo por defecto (`N8N_BLOCK_ENV_ACCESS_IN_NODE`), así que la
expresión simplemente no resolvía. Había dos salidas: relajar esa restricción de
seguridad de n8n globalmente, o hardcodear el valor. Se eligió hardcodear
(`http://backend:3000/webhooks/n8n/enrichment` literal en el nodo) porque **no es un
secreto** — es solo el nombre de servicio interno de Docker, no navegable desde afuera de
esa red. El secreto real (`X-Webhook-Secret`) sigue yendo por credencial `Header Auth` de
n8n, nunca en texto plano en el JSON. Relajar una protección de seguridad de la
plataforma para evitar hardcodear un dato que no es sensible hubiera sido el trade-off
equivocado. `docker-compose.yml` deja la variable declarada igual, comentada, por si en
algún momento se retoma ese enfoque.

### Estado asíncrono en el frontend

La página de detalle (`TicketDetailPage`) usa `refetchInterval` de TanStack Query como
**función del estado actual**, no un intervalo fijo:

```ts
refetchInterval: (query) => {
  const status = query.state.data?.enrichmentStatus
  return status === 'pending' || status === 'processing' ? 3000 : false
}
```

Mientras el ticket esté en `pending`/`processing`, refetchea cada 3s; en cuanto llega a
`done`/`failed`, la función devuelve `false` y el polling se apaga solo — sin
`clearInterval` manual, sin `useEffect` con cleanup, sin riesgo de seguir pegándole al
backend indefinidamente después de que el dato ya no cambia. TanStack Query también
pausa el polling automáticamente cuando la pestaña del navegador no está visible
(comportamiento por defecto, no algo que se implementó a mano).

### La historia real del fix de `nest --watch` en Docker

El comando original del servicio `backend` era `nest start --watch` corriendo dentro del
contenedor con el código montado por bind mount. Se cayó dos veces recompilando,
exigiendo `docker compose restart backend` a mano. La primera hipótesis (la clásica:
chokidar no detecta cambios de filesystem en bind mounts) resultó **incorrecta** —
agregar `watchOptions` con polling en `nest-cli.json` y `CHOKIDAR_USEPOLLING=true` no
arregló nada, y probándolo con ediciones reales se confirmó que el problema era otro: el
watch mode de `@nestjs/cli` mata el proceso hijo viejo y levanta uno nuevo sin esperar a
que libere el puerto 3000. Cuando ese respawn choca con `EADDRINUSE`, **el proceso padre
no muere** — se queda vivo sirviendo el código del proceso anterior, en silencio, así que
ni un `until` de supervisión externa lo detectaba (el comando `npm run start:dev` nunca
retorna con código de error).

El primer reemplazo probado fue `nodemon` watcheando los `.ts` y ejecutándolos
directamente con `tsx` (sin paso de compilación) — nodemon sí maneja bien el ciclo de
vida del proceso (espera la salida completa antes de reinstanciar), pero **rompió la
inyección de dependencias de Nest**: `ConfigService` llegaba `undefined` al constructor
de `PrismaService`. `tsx` (basado en esbuild) no preserva de forma confiable los
metadatos de decoradores (`emitDecoratorMetadata`) que el sistema de DI de Nest necesita
vía `reflect-metadata`. La solución final: `tsc --watch` compilando a `dist/` (que sí
emite esos metadatos correctamente) + `nodemon` watcheando `dist/**/*.js` con `--delay
300ms` (para coalescer las múltiples escrituras que hace `tsc` en un solo recompile).
Probado con ediciones rápidas y sucesivas sin ningún crash.

## Uso de IA

Este proyecto se construyó con **Claude** (planeación y revisión de cada fase) +
**Claude Code** (ejecución — un prompt detallado por fase, ver
[`docs/claude-code-prompts.md`](docs/claude-code-prompts.md) para el historial completo
de prompts usados). Cada fase se revisó antes de avanzar a la siguiente — el output no se
aceptó a ciegas, ni se dio por verificado con solo build/lint en verde.

Ejemplos concretos de bugs reales que la IA encontró **probando la aplicación corriendo**
(no solo con tests automatizados):

- **Bug de secuencia de Postgres con `upsert`**: el script de seed inserta usuarios y
  tickets con `id` explícito vía `upsert` para que los datos sean deterministas. Postgres
  nunca avanza la secuencia `autoincrement` cuando se inserta un id a mano, así que la
  primera vez que la API creaba un ticket sin especificar id, chocaba con
  `Ticket_pkey`/`User_pkey` (`Unique constraint failed`) contra un id que el seed ya
  había usado. Se encontró recreando la base desde cero con `docker compose down -v` y
  probando la creación de un ticket real por API — no lo hubiera detectado ningún test
  contra una base que ya tenía la secuencia adelantada por casualidad. Fix: `setval`
  sobre `MAX(id)` al final del seed (`backend/prisma/seed.ts`).
- **CORS no habilitado**: el backend no tenía `app.enableCors(...)`. El frontend no podía
  ni completar el preflight `OPTIONS` (404) al intentar loguearse — no es algo que build
  o lint detecten, apareció recién probando el login real en el navegador.
- **`nest --watch` sirviendo código stale en silencio dentro de Docker**: ver la sección
  de arriba. Encontrado, investigado y con la hipótesis inicial descartada, todo probando
  ediciones reales contra el contenedor corriendo — no algo verificable con una suite de
  tests.
- **Path del webhook**: en el scaffolding inicial (Fase 0), `N8N_WEBHOOK_URL` apuntaba a
  un path placeholder (`/webhook/ticket-created`) elegido sin la especificación completa
  todavía. Al definirse el workflow real de n8n en la Fase 5, el path correcto pasó a ser
  `/webhook/ticket-enrichment` — se corrigió en `.env`/`.env.example` y quedó consistente
  desde ahí (los tests, que leen `N8N_WEBHOOK_URL` desde el entorno en vez de hardcodear
  el path, no se vieron afectados por el cambio).
- **Hardcode del callback vs. relajar seguridad de n8n**: ver la sección de Decisiones
  técnicas — decisión corregida a mano después de que la referencia por `$env` fallara
  contra la instancia real de n8n.

Lo que se hizo **100% a mano**, sin agente: importar y activar el workflow en la UI de
n8n, crear las 2 credenciales `Header Auth`, y grabar el video/GIF de la demo — nada de
eso es alcanzable por un agente sin acceso a esa UI.

## Pendientes / bugs conocidos

- Si el disparo saliente a n8n falla (caído, timeout, DNS), el ticket queda en `pending`
  indefinidamente — no hay reintento automático ni un job que lo reintente más tarde.
- Si n8n recibe el webhook pero el workflow falla antes de llegar al nodo de callback
  (ej. un error no capturado fuera del `try/catch` del nodo Code), el ticket queda en
  `processing` indefinidamente — mismo motivo: no hay timeout de vuelta ni polling de
  n8n que reconcilie el estado.
- El frontend no tiene UI de edición de tickets (`PATCH /tickets/:id`) — el backend lo
  soporta y está testeado, pero no se priorizó una vista de edición para el alcance de
  esta entrega.
- Deploy: no se hizo. La entrega corre localmente vía `docker compose up` (Postgres + n8n
  + backend) más el frontend con `npm run dev` — no hay una versión desplegada en la
  nube.

## Seguridad

- Passwords hasheados con `bcrypt` (cost factor 10), nunca en texto plano — ni en la base
  ni en las respuestas de la API (`passwordHash` nunca se serializa).
- Auth vía JWT (`@nestjs/jwt` + `passport-jwt`), payload con `sub` (userId) y `role`.
- El registro público (`POST /auth/register`) siempre asigna `role: agent` — el DTO ni
  siquiera acepta un campo `role`, así que no hay forma de escalar a admin desde el
  endpoint público.
- Callback de n8n protegido por secreto compartido (`X-Webhook-Secret`), comparado en un
  guard que corre *antes* que cualquier pipe o acceso a la base — un secreto ausente o
  incorrecto nunca toca la base de datos. En n8n, el valor vive en credenciales `Header
  Auth`, nunca en texto plano en el JSON del workflow.
- CORS restringido a un origin específico (`CORS_ORIGIN`, por defecto
  `http://localhost:5173`) — nunca wildcard `*`.
- Validación de entrada con DTOs + `class-validator` en todos los endpoints que reciben
  body (incluido el callback de n8n, con validación condicional: `priority`/`category`
  requeridos solo si `status: done`).
- Ningún secreto commiteado: `.env` está gitignoreado en ambos proyectos, solo se
  versiona `.env.example` con placeholders.
