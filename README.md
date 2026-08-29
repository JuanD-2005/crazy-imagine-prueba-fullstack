# CrazySupportHub

<p align="center">
  <img alt="CI" src="https://github.com/JuanD-2005/crazy-imagine-prueba-fullstack/actions/workflows/ci.yml/badge.svg" />
</p>

> Herramienta interna de tickets de soporte con enriquecimiento automático de prioridad,
> categoría, tags y respuesta sugerida, disparado por un workflow de n8n al crear cada ticket.

## 📑 Índice

- [✨ Visión general](#-visión-general)
- [🎬 Demo](#-demo)
- [🚀 Setup](#-setup)
- [🧪 Tests](#-tests)
- [🧠 Decisiones técnicas](#-decisiones-técnicas)
- [🤖 Uso de IA](#-uso-de-ia)
- [📌 Pendientes / bugs conocidos](#-pendientes--bugs-conocidos)
- [🔐 Seguridad](#-seguridad)
- [🧾 En resumen](#-en-resumen)

## ✨ Visión general

CrazySupportHub centraliza la gestión de soporte con un flujo inteligente que permite:

- crear tickets desde una interfaz interna,
- disparar un workflow de n8n al generar cada caso,
- clasificar automáticamente prioridad y categoría,
- detectar tags relevantes,
- sugerir una respuesta profesional para el agente,
- monitorear el estado de enriquecimiento en tiempo real,
- proteger la API con autenticación, roles y validación.

## 🎬 Demo

https://drive.google.com/file/d/1qjOEtIUcAxJcK_MZgl0y3Rizas8wT898/view\?usp\=sharing

---

## 🚀 Setup

### 1) Clonar y configurar variables de entorno

```bash
git clone <url-del-repo>
cd PruebaTecnica
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

En `backend/.env`, completá `JWT_SECRET`, `N8N_WEBHOOK_SECRET` e `INVITE_CODE` con valores aleatorios seguros para desarrollo local. El resto de las variables (`DATABASE_URL`, `N8N_WEBHOOK_URL`, `PORT`, `CORS_ORIGIN`) ya vienen con los valores correctos para correr todo vía Docker Compose.

`frontend/.env` ya trae `VITE_API_URL=http://localhost:3000`, que es la URL del backend en local.

> `INVITE_CODE` es un secreto compartido y no un placeholder decorativo: protege `POST /auth/register`.
>
> Dejar el valor por defecto de `.env.example` en un entorno que no sea local/desarrollo anula la protección real del gate de invitación.

> Si preferís correr el backend fuera de Docker (`npm run start:dev` en el host), `DATABASE_URL` y `N8N_WEBHOOK_URL` deben apuntar a `localhost` en lugar de `postgres`/`n8n`.

### 2) Levantar Postgres, n8n y el backend

```bash
docker compose up --build
```

Esto levanta los 3 servicios. El backend aplica automáticamente las migraciones pendientes en cada arranque (`prisma migrate deploy`) y queda con hot-reload activo. El seed no corre solo; es un paso manual explícito para no pisar datos modificados si reiniciás el contenedor:

```bash
docker compose exec backend npx prisma db seed
```

Con esto quedan 3 usuarios y 12 tickets de prueba. El seed es idempotente y no duplica datos.

### Servicios locales

- Backend: `http://localhost:3000`
- n8n: `http://localhost:5678`
- Postgres: `localhost:5432`

### 3) Importar y activar el workflow de n8n

El JSON del workflow está en [`n8n/workflow.json`](n8n/workflow.json). Pasos esenciales:

1. Abrí `http://localhost:5678` y creá tu owner account si es la primera vez.
2. Menú → **Import from File** → seleccioná `n8n/workflow.json`.
3. Creá **2 credenciales de tipos distintos** que te va a pedir: una **Header Auth**
   (`X-Webhook-Secret`, mismo valor que `N8N_WEBHOOK_SECRET` en `backend/.env` — la usan
   tanto el nodo `Webhook` como `Send Callback`) y una **Google Gemini(PaLM) Api** (API key
   gratis de Google AI Studio, para el nodo `Message a model`). Detalle completo paso a
   paso de ambas en [`docs/n8n-setup.md`](docs/n8n-setup.md).
4. Activá el workflow con el toggle **Active**.

Sin este paso, el backend igual funciona: el ticket se crea y el disparo saliente no encuentra el webhook activo, quedando en `enrichmentStatus: pending` en lugar de avanzar. Eso es comportamiento esperado y no un error.

### 4) Frontend

```bash
cd frontend
npm install
npm run dev
```

La app corre en `http://localhost:5173` y necesita el backend levantado en `http://localhost:3000`.

### Usuarios de prueba (seed)

| Email | Password | Rol |
| --- | --- | --- |
| `admin@crazysupporthub.test` | `Admin1234!` | `admin` |
| `bruno.agente@crazysupporthub.test` | `Agent1234!` | `agent` |
| `carla.agente@crazysupporthub.test` | `Agent1234!` | `agent` |

### Backend fuera de Docker

Si preferís correr el backend en el host, manteniendo Postgres y n8n contenedorizados:

```bash
cd backend
# En .env: cambiá "postgres"/"n8n" por "localhost" en DATABASE_URL / N8N_WEBHOOK_URL
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

---

## 🧪 Tests

```bash
cd backend
npm run test       # unit
npm run test:e2e   # e2e (Supertest, requiere Postgres corriendo)
```

Los tests e2e corren sobre una base separada (`crazysupporthub_test`) para evitar mezclar datos de prueba con los del seed real. Se crea una sola vez:

```bash
docker compose exec postgres createdb -U crazysupporthub crazysupporthub_test
cp backend/.env.test.example backend/.env.test   # completar secretos iguales a .env
```

`npm run test:e2e` carga `backend/.env.test` automáticamente y aplica migraciones + seed antes de correr.

---

## 🧠 Decisiones técnicas

### Stack

**Backend: NestJS + Prisma + PostgreSQL**

- Guards para roles.
- Pipes con `class-validator` para validación.
- Testing integrado con Nest.
- Prisma para migraciones y tipado fuerte.

**Frontend: React + Vite + TypeScript + React Router + TanStack Query**

- SPA cerrada detrás de login.
- Query cache + polling condicional para el estado de enriquecimiento.
- UX más rápida y simple que construir manualmente caché y re-fetch.

### Enriquecimiento asíncrono: pending → processing → done/failed

`Ticket.enrichmentStatus` tiene 4 estados porque el flujo tiene dos puntos de red separados que pueden fallar por distintos motivos:

1. Al crear el ticket, se guarda en `pending` y se dispara un `POST` a n8n con `{ ticketId, title, description }`.
2. Si el webhook responde `2xx`, el ticket pasa a `processing`.
3. El workflow de n8n luego llama a `POST /webhooks/n8n/enrichment` con el resultado.
4. Si `status: done`, se populatean `priority`, `category`, `tags` y `suggestedReply`; si `status: failed`, queda en `failed` sin tocar esos campos.

Esto deja rastro claro de dónde se cortó el flujo.

### Reconciliación automática de tickets estancados

Los dos saltos de red pueden fallar sin que nadie se entere. Por eso `ReconciliationService` corre cada minuto y resuelve:

- `pending` con reintento y backoff simple.
- `processing` con timeout si no llega callback.
- `failed` definitivo cuando ya no tiene sentido reintentar.

Esto evita que tickets queden “colgados” sin que nadie lo detecte.

### CI con GitHub Actions

`.github/workflows/ci.yml` corre en cada push a `master` usando un Postgres real (`services: postgres:16`), con:

- unit tests,
- `prisma migrate deploy`,
- seed,
- suite e2e completa contra base real.

### Backend en el mismo docker-compose que n8n

El backend y n8n se resolvieron por nombre de servicio (`backend` / `n8n`) en vez de depender de `host.docker.internal`, que no es portable entre sistemas. El frontend se dejó fuera de Docker para evitar complejidad extra durante desarrollo.

<details>
<summary><strong>Callback de n8n y hardcode deliberado</strong></summary>

La URL del callback se hardcodeó en el nodo de n8n porque `BACKEND_CALLBACK_URL` no resolvía bien con esta instancia de n8n por `N8N_BLOCK_ENV_ACCESS_IN_NODE`. Como no es un secreto, se eligió hardcodear el nombre interno del servicio `http://backend:3000/webhooks/n8n/enrichment` y dejando el secreto real (`X-Webhook-Secret`) en la credencial `Header Auth`.

</details>

### Estado asíncrono en el frontend

La vista de detalle usa `refetchInterval` como función del estado actual:

```ts
refetchInterval: (query) => {
  const status = query.state.data?.enrichmentStatus;
  return status === "pending" || status === "processing" ? 3000 : false;
};
```

Esto hace polling solo mientras el ticket está en estados transitorios. Cuando llega a `done` o `failed`, el polling se apaga solo.

### Registro protegido con código de invitación

`POST /auth/register` exige un `inviteCode` que debe coincidir con `INVITE_CODE`. Si no coincide, devuelve `403` antes de tocar la base de datos.

Esto evita que el registro público se convierta en una puerta abierta y deja un mecanismo simple de rotación si se filtra el código.

### Scoping de status: mismo criterio en frontend y backend

El selector de estado del detalle usa la misma regla que el backend: admin sin restricción; agent solo si es `createdBy` o `assignedTo` del ticket. La duplicación aquí es una defensa en profundidad: el backend sigue siendo la fuente de verdad.

<details>
<summary><strong>La historia real del fix de <code>nest --watch</code> en Docker</strong></summary>

El problema no estaba en Chokidar ni en bind mounts; era el ciclo de vida del proceso de `@nestjs/cli`: al reiniciar, el proceso padre quedaba vivo con el puerto 3000 ocupado y sirviendo código viejo en silencio. La solución final fue:

- `tsc --watch` compilando a `dist/`
- `nodemon` observando `dist/**/*.js` con `--delay 300ms`

Esto preserva los metadatos de decoradores y evita el conflicto del puerto durante el hot reload.

</details>

---

## 🤖 Uso de IA

### Nodo de Gemini en n8n

Más allá de la clasificación por palabras clave, el workflow de n8n incorpora un nodo de Gemini para generar `suggestedReply`, una respuesta breve y profesional en español. La salida se valida contra el contrato de `EnrichmentCallbackDto` antes de enviarse al backend.

Si Gemini falla o devuelve algo no parseable, el workflow continúa con `On Error: Continue`, de modo que la clasificación determinística sigue funcionando sin bloquear la operación completa.

### Cómo se construyó este proyecto

Este proyecto se construyó con **Claude** para la planeación y revisión, y **Claude Code** para ejecución. Cada fase fue revisada antes de avanzar, con pruebas reales contra la app y no solo checks sintácticos.

Se detectaron bugs reales de:

- secuencia de Postgres con `upsert`,
- CORS no habilitado,
- `nest --watch` silencioso en Docker,
- path incorrecto del webhook,
- hardcode del callback versus seguridad de n8n.

El mismo flujo (Claude para revisión, Claude Code para ejecución) se usó también en el
trabajo posterior al Sprint 1: el nodo de Gemini en n8n, rate limiting en los endpoints de
auth, el pipeline de CI con Postgres efímero real (no mocks), el registro protegido con
código de invitación, el selector de estado y el botón de eliminar ticket para admin en el
frontend.

Historial completo de prompts usados, fase por fase, en
[`docs/claude-code-prompts.md`](docs/claude-code-prompts.md) — se deja como evidencia de
proceso, ya que la prueba pide transparencia sobre el uso de IA.

---

## 📌 Pendientes / bugs conocidos

- `priority` y `category` no tienen edición manual en UI por decisión de diseño.
- `assignedTo` sería una feature de gestión de equipo para el futuro.
- No hubo deploy: la entrega corre localmente via `docker compose up` + frontend con `npm run dev`.
- **Condición de carrera entre la reconciliación (Fase 9) y un callback real tardío de
  n8n**: el cron marca un ticket como `failed` si lleva más de 10 minutos en `processing`
  (`PROCESSING_TIMEOUT_MS`, `backend/src/webhooks/reconciliation.service.ts:8`). Si el
  callback real de n8n llega recién después de ese timeout, el backend lo acepta y
  sobrescribe el ticket a `done` con los datos válidos sin problema — no hay corrupción de
  datos, Postgres serializa la escritura sobre la fila. El problema es en el frontend: deja
  de hacer polling en cuanto ve el ticket en `failed` (comportamiento intencional, para no
  pegarle al backend indefinidamente en un estado terminal), así que si un agente tenía la
  pantalla de detalle abierta en ese momento, va a seguir viendo "la clasificación falló"
  hasta que recargue manualmente, aunque la base ya tenga el resultado correcto. Tampoco hay
  logging que distinga este caso de un `failed` real y definitivo. Con el timeout actual (10
  min) muy por encima de la latencia observada de Gemini (~1 min), la probabilidad de que
  esto ocurra en la práctica es baja, pero queda identificado como mejora pendiente: agregar
  un guard de estado en el callback (no sobrescribir un `failed` sin registrar que fue una
  resolución tardía) y hacer que el frontend reanude el polling si detecta esta situación al
  recargar.

---

## 🔐 Seguridad

- Passwords hasheados con `bcrypt` (cost factor 10).
- Auth mediante JWT (`@nestjs/jwt` + `passport-jwt`).
- Registro público asigna `role: agent` y no permite escalar a admin.
- Rate limiting (`@nestjs/throttler`) en `POST /auth/login` y `POST /auth/register`: 5
  requests por minuto por IP, `429` al exceder — mitiga fuerza bruta y creación masiva de
  cuentas.
- `DELETE /tickets/:id` reservado al rol `admin` (`@Roles('admin')` en el controller) — es
  una acción irreversible, ningún `agent` puede ejecutarla aunque conozca el id.
- Callback de n8n protegido por secreto compartido (`X-Webhook-Secret`).
- CORS restringido a un origin específico (`CORS_ORIGIN`).
- Validación de entrada con DTOs + `class-validator`.
- Ningún secreto se commitea: `.env` queda fuera del repo y sólo existe `.env.example` con placeholders.

---

## 🧾 En resumen

CrazySupportHub combina:

- backend robusto con NestJS y Prisma,
- datos operativos en PostgreSQL,
- automatización en n8n,
- IA para respuesta sugerida,
- frontend ligero y reactivo,
- seguridad y validación en cada capa.
