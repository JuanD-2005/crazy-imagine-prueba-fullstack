# CrazySupportHub — Prompts para Claude Code

## Stack decidido

- **Backend:** NestJS + TypeScript
- **ORM:** Prisma (PostgreSQL)
- **Frontend:** React + Vite + TypeScript, React Router, TanStack Query
- **Integración:** n8n (self-hosted vía Docker o `npx n8n`)

**Por qué (para el README):** Nest da Guards para roles, Pipes con `class-validator` para
validación y un módulo de testing integrado, lo que mapea directo con los requisitos de
auth/roles/validación/tests de la prueba. Prisma ofrece mejor DX para migraciones y seed
tipado. React + Vite evita la complejidad innecesaria de SSR en una SPA que vive
completamente detrás de login.

## Convenciones generales

- Estructura de repo: `/backend`, `/frontend`, `/n8n`, `README.md` en la raíz.
- Commits atómicos por feature (auth, modelo de datos, CRUD tickets, webhook saliente,
  callback, frontend por vista). Nunca un solo commit final.
- TypeScript en modo `strict` en ambos proyectos.
- Nada de secretos hardcodeados: todo vía `.env` + `.env.example` commiteado (sin valores reales).

### Git y autoría de commits

Por defecto, Claude Code agrega a los mensajes de commit una firma tipo
`🤖 Generated with Claude Code` y un trailer `Co-Authored-By: Claude <noreply@anthropic.com>`.
Para esta entrega **no** queremos eso: los commits deben quedar autoreados únicamente con tu
`git config user.name` / `user.email`, sin firma ni co-autoría de la IA en el mensaje. La
transparencia sobre el uso de IA va en el README como pide la prueba, no en cada commit del
historial.

Para que esta regla (y el resto de convenciones) se respete en todas las fases sin repetirla
en cada prompt, la fijamos una sola vez en un `CLAUDE.md` en la raíz del repo — ver Fase 0.

---

## Fase 0 — CLAUDE.md del proyecto (crear antes de la Fase 1)

Crea este archivo a mano en la raíz del repo (o pídeselo a Claude Code con un prompt de una
línea: "Crea CLAUDE.md en la raíz con exactamente este contenido:" + el bloque de abajo).
Claude Code lo carga automáticamente en cada sesión que corras dentro de esa carpeta.

```markdown
# CrazySupportHub — instrucciones de proyecto para Claude Code

## Reglas de git

- Nunca agregues "🤖 Generated with Claude Code", "Co-Authored-By: Claude" ni ninguna
  firma o mención de IA en los mensajes de commit. Los commits se autorean únicamente con
  el `git config user.name` / `user.email` ya configurado en este repo.
- Commits atómicos por feature, mensajes descriptivos en imperativo (ej. "Add JWT auth
  guard"). Nada de "wip" genérico ni un único commit final.
- Nunca hagas commit de .env, node_modules, ni credenciales/API keys.

## Stack

- Backend: NestJS + TypeScript + Prisma + PostgreSQL.
- Frontend: React + Vite + TypeScript + React Router + TanStack Query.
- Integración: n8n (webhook saliente al crear ticket + callback de enriquecimiento).

## Convenciones

- TypeScript strict mode en ambos proyectos.
- Validación de entrada con class-validator/DTOs en el backend.
- Nada de secretos hardcodeados: todo vía variables de entorno (.env + .env.example).
```

---

## Prompt inicial — Scaffolding del proyecto (correr después de crear CLAUDE.md)

```
Actúa como Tech Lead Full-Stack. Tu misión es inicializar el proyecto "CrazySupportHub"
basándote estrictamente en los requerimientos de prueba-fullstack.pdf, los datos de
tickets-seed.json, y las reglas fijas en CLAUDE.md (debe existir ya en la raíz — si no
existe, detente y avísame en vez de improvisar convenciones).

Ejecuta paso a paso, usando la terminal:

1. Inicialización: git init en este directorio. Crea un .gitignore adecuado para un
   monorepo Node (node_modules, dist, build, .env, etc. — que cubra específicamente
   Nest y Vite, no una plantilla genérica).

2. Backend: inicializa un proyecto NestJS en /backend con TypeScript strict mode,
   ESLint y Prettier. Configúralo con Prisma (no TypeORM) apuntando a PostgreSQL.
   No generes todavía el schema de datos ni migraciones — eso es la Fase 1, este paso
   es solo scaffolding.

3. Frontend: inicializa un proyecto React + Vite + TypeScript en /frontend. Instala y
   configura Tailwind CSS, React Router y TanStack Query (la librería de fetching que
   usaremos para el polling del enrichmentStatus).

4. Infraestructura: crea docker-compose.yml en la raíz con un servicio de PostgreSQL 16
   (volumen persistente) y uno de n8n, listos para desarrollo local.

5. Variables de entorno: crea /backend/.env.example con DATABASE_URL, JWT_SECRET,
   JWT_EXPIRES_IN, N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET y PORT (valores de ejemplo, nunca
   reales).

6. Documentación: crea README.md base en la raíz con las secciones Setup (por pieza),
   Decisiones técnicas, Uso de IA y Pendientes/bugs conocidos — con placeholders por
   ahora, las completamos al cerrar cada fase.

7. Commit: un único commit para todo este scaffolding con mensaje
   "chore: inicializar estructura base (NestJS + Prisma, React + Vite, Docker)".
   Recuerda: sin firma ni co-autoría de IA, según las reglas de CLAUDE.md.

Detente después de estos 7 pasos y confírmame que la estructura está lista antes de
pasar a la Fase 1 (modelado de datos con Prisma).
```

---

## Fase 1 — Prompt: Modelado de datos y seed

```
Contexto: CrazySupportHub ya tiene el scaffolding base (NestJS + Prisma + PostgreSQL en
/backend, React + Vite en /frontend, docker-compose y .env.example listos). Este prompt
es solo para el modelo de datos y el seed — no toques auth, endpoints ni módulos de
negocio todavía, eso es la Fase 2.

1. Define en el schema de Prisma estos dos modelos:

   User
   - id (autoincrement)
   - name (string)
   - email (string, único)
   - passwordHash (string) — NUNCA se guarda password en texto plano
   - role (enum: admin, agent)
   - timestamps (createdAt, updatedAt)

   Ticket
   - id (autoincrement)
   - title (string, requerido, longitud razonable)
   - description (string, requerido)
   - status (enum: open, in_progress, resolved, closed — default: open)
   - createdBy (relación a User, requerido)
   - assignedTo (relación a User, nullable)
   - priority (enum: low, medium, high, urgent — nullable, la llena n8n)
   - category (enum: billing, technical, account, other — nullable, la llena n8n)
   - tags (array de strings)
   - suggestedReply (string, nullable)
   - enrichmentStatus (enum: pending, processing, done, failed — default: pending)
   - enrichedAt (datetime, nullable)
   - timestamps (createdAt, updatedAt)

2. Genera la migración inicial con `prisma migrate dev`.

3. Crea un script de seed (`prisma/seed.ts`) que:
   - Lea el archivo tickets-seed.json que voy a colocar en /backend/prisma/tickets-seed.json
     (contiene 3 usuarios con password en texto plano y 12 tickets ficticios).
   - Hashee cada password con bcrypt (cost factor 10) antes de insertar los usuarios.
   - Inserte los tickets respetando las relaciones createdBy/assignedTo por id.
   - Sea idempotente (usa upsert, no falla si se corre dos veces).
   - Registra el script en package.json bajo la convención de Prisma
     (`"prisma": {"seed": "ts-node prisma/seed.ts"}`).

4. No implementes todavía módulos de auth, users ni tickets — solo deja la estructura de
   carpetas de Nest lista (app.module.ts limpio) para que en el siguiente prompt agreguemos
   los módulos de auth, users y tickets sobre esta base.

5. Haz commit de este trabajo por separado del scaffolding, mensaje sugerido:
   "feat: modelar schema de Prisma y agregar seed inicial".

Al terminar, dame un resumen corto de qué archivos creaste y cómo correr las migraciones
y el seed localmente.
```

---

## Fase 2 — Prompt: Auth, roles y módulo de usuarios

```
Contexto: CrazySupportHub ya tiene scaffolding (NestJS + Prisma) y el modelo de datos
(User, Ticket) con migración y seed aplicados. Esta fase agrega autenticación y
autorización por rol. No implementes todavía el CRUD de tickets — eso es la Fase 3.

1. Módulo de auth (Passport + JWT):
   - POST /auth/register: crea un usuario nuevo. Valida con DTO (class-validator):
     name requerido, email formato válido y único, password mínimo 8 caracteres.
     Hashea con bcrypt antes de persistir. Por defecto asigna role "agent" — el registro
     público NUNCA debe poder crear un admin (evita escalación de privilegios). Si el
     email ya existe, responde 409.
   - POST /auth/login: valida credenciales, responde JWT (incluye userId y role en el
     payload) + datos básicos del usuario (sin passwordHash). Credenciales inválidas → 401.
   - GET /auth/me: ruta protegida, devuelve el perfil del usuario autenticado a partir
     del JWT (útil para que el frontend valide sesión al cargar).

2. Guards y autorización:
   - JwtAuthGuard global (o por ruta) que valida el token y adjunta el usuario al request.
   - Rutas públicas explícitas con un decorador @Public() para login/register.
   - RolesGuard + decorador @Roles('admin', 'agent') para autorización fina por endpoint.
     (Los endpoints de tickets que la usarán vienen en la Fase 3, pero deja el guard listo
     y genérico para reutilizarlo ahí.)

3. Módulo de users (mínimo, para soporte de la Fase 3):
   - GET /users: solo admin. Devuelve id, name, email, role (sin passwordHash) — lo
     usaremos para el selector de "asignar a" en el frontend.

4. Manejo de errores consistente: usa un exception filter global de Nest para que todos
   los errores devuelvan un shape uniforme (statusCode, message, error) en vez de mezclar
   formatos por endpoint.

5. Tests: agrega un test e2e mínimo de auth (Supertest) que cubra: registro exitoso,
   registro con email duplicado (409), login exitoso (200 + token), login con password
   incorrecta (401), y acceso a una ruta protegida sin token (401).

6. Commit separado de esta fase, mensaje sugerido:
   "feat: implementar auth JWT con roles admin/agent".

Al terminar, dame un resumen de los endpoints creados y confírmame que los tests pasan
antes de avanzar a la Fase 3 (CRUD de tickets).
```

---

## Fase 3 — Prompt: CRUD de tickets, filtros y autorización por rol

```
Contexto: Auth + roles ya están listos (JwtAuthGuard global, @Public(), RolesGuard +
@Roles(), @CurrentUser()). Esta fase es el CRUD de tickets. NO integres n8n todavía
(ni el webhook saliente ni el callback) — eso es la Fase 4. Los tickets se crean con
enrichmentStatus "pending" por defecto y ahí se quedan por ahora.

1. DTOs con class-validator:
   - CreateTicketDto: title (string, requerido, 3-200 chars), description (string,
     requerido, 10-2000 chars), assignedTo (id de usuario, opcional, nullable).
     No incluyas priority/category/tags/suggestedReply en este DTO — esos los llena n8n
     en la Fase 4, no el usuario al crear.
   - UpdateTicketDto: status, assignedTo, priority, category, tags — todos opcionales
     (PATCH parcial). Valida que status/priority/category sean uno de los enums válidos.

2. Reglas de autorización (a nivel de servicio, no solo del guard):
   - admin: ve, edita y elimina cualquier ticket.
   - agent: ve y edita solo tickets donde sea createdBy o assignedTo. Si el ticket existe
     pero no le pertenece → 403. Si el id no existe → 404. No puede eliminar tickets
     (DELETE es exclusivo de admin, usa @Roles('admin') ahí).
   - Documenta esta política en un comentario claro al inicio de TicketsService — la
     vamos a tener que explicar en la entrevista.

3. Endpoints:
   - POST /tickets: createdBy = usuario autenticado (@CurrentUser()). status "open",
     enrichmentStatus "pending" por defecto.
   - GET /tickets: listado con:
     - Filtros por query params: status, priority, category (exactos).
     - Búsqueda de texto (?search=) sobre title y description (case-insensitive).
     - Paginación: ?page y ?limit (defaults razonables, p. ej. page=1, limit=10).
     - Ordenamiento: ?sortBy (createdAt, updatedAt, priority) y ?sortOrder (asc/desc),
       default createdAt desc.
     - Aplica el filtro de visibilidad por rol (agent solo ve lo suyo) ANTES de paginar,
       no después.
     - Responde también el total de resultados para que el frontend arme la paginación
       (p. ej. { data, total, page, limit }).
   - GET /tickets/:id: detalle, aplicando la regla de 403/404 del punto 2.
   - PATCH /tickets/:id: aplica la misma regla de ownership antes de permitir la edición.
   - DELETE /tickets/:id: solo admin.

4. Manejo de errores: usa el AllExceptionsFilter ya existente; nada de try/catch sueltos
   devolviendo formatos distintos.

5. Tests e2e (Supertest), agrégalos junto a los de auth:
   - Crear ticket autenticado → 201, createdBy correcto.
   - Crear ticket sin token → 401.
   - Agent intenta ver/editar un ticket ajeno → 403.
   - Admin ve todos los tickets sin filtro adicional.
   - Filtro por status y búsqueda por texto devuelven el subconjunto esperado (usa los
     datos del seed para las aserciones).

6. Commit separado, mensaje sugerido: "feat: CRUD de tickets con filtros, paginación y
   autorización por rol".

Al terminar, dame la lista de endpoints con sus reglas de acceso y confírmame que los
tests pasan antes de avanzar a la Fase 4 (integración con n8n).
```

---

## Fase 4 — Prompt: Integración con n8n (webhook saliente + callback)

```
Contexto: CRUD de tickets, auth y roles ya están completos y testeados. Esta fase es el
corazón de la prueba: la integración bidireccional con n8n. NO construyas el workflow de
n8n todavía (eso es la Fase 5) — aquí solo el lado del backend: el disparo saliente y el
endpoint de callback. Usa N8N_WEBHOOK_URL y N8N_WEBHOOK_SECRET, ya definidas en .env /
.env.example desde el scaffolding.

1. Disparo saliente (al crear un ticket):
   - Después de persistir el ticket en TicketsService.create (con enrichmentStatus
     "pending"), dispara un POST a N8N_WEBHOOK_URL con { ticketId, title, description }.
     Usa HttpModule/HttpService de Nest (@nestjs/axios) con timeout corto (p. ej. 5s).
   - Esta llamada NO debe bloquear ni hacer fallar la respuesta al frontend: si
     N8N_WEBHOOK_URL no responde, está caído, o da timeout, atrápalo, logueá el error
     (Logger.error) y deja el ticket en "pending" igual — el usuario ya tiene su ticket
     creado; documenta esto como limitación conocida en el README más adelante.
   - Si el POST a n8n se envía con éxito (2xx), actualiza enrichmentStatus a "processing"
     — así usamos los 4 estados del enum, no solo pending/done.
   - Envía también el header X-Webhook-Secret en esta llamada saliente (mismo valor que
     validaremos en el callback). No es requisito estricto del PDF, pero es una buena
     práctica fácil de justificar en la entrevista: le da a n8n forma de confirmar que la
     llamada viene realmente de nuestro backend.

2. Endpoint de callback: POST /webhooks/n8n/enrichment (mantén el estilo de rutas sin
   prefijo /api que ya usa el resto de la app — no introduzcas un prefijo global que
   rompa las rutas existentes de auth/tickets/users).
   - @Public() (no requiere JWT — quien llama es n8n, no un usuario logueado), pero
     protegido por secreto compartido: compara el header X-Webhook-Secret contra
     N8N_WEBHOOK_SECRET. Si falta o no coincide → 401, sin tocar la base de datos.
   - DTO del payload (class-validator):
     - ticketId: number, requerido.
     - status: enum ('done' | 'failed'), requerido — resultado del enriquecimiento, no
       confundir con el status del ticket.
     - priority, category: requeridos si status='done' (validador condicional).
     - tags: array de strings, opcional.
     - suggestedReply: string, opcional.
   - Busca el ticket por ticketId: si no existe → 404.
   - Si status='done': actualiza priority, category, tags, suggestedReply (si vino),
     enrichmentStatus='done', enrichedAt=now().
   - Si status='failed': actualiza solo enrichmentStatus='failed', enrichedAt=now()
     (logueá cualquier detalle extra que mande n8n; no hace falta persistirlo, el schema
     no tiene campo para el motivo del fallo).
   - Responde 200 con el ticket actualizado.

3. Tests e2e — importante: NO deben depender de un n8n real corriendo (en esta fase el
   workflow ni existe, y en CI tampoco habrá n8n disponible). Mockea el HttpService/axios
   en los tests de creación de ticket para que la llamada saliente no golpee una URL real.
   - Crear ticket → el mock de HttpService fue llamado con la URL y payload correctos.
   - Crear ticket cuando el mock de HttpService rechaza (simula n8n caído) → el ticket
     igual se crea con 201 y queda en "pending", sin que la petición falle.
   - Callback con secreto correcto y payload válido (status=done) → 200, ticket queda
     enrichmentStatus=done con priority/category/tags actualizados.
   - Callback con secreto incorrecto o ausente → 401, ticket sin cambios.
   - Callback con ticketId inexistente → 404.
   - Callback con status=done pero sin priority/category → 400 (falla la validación).

4. Commit separado, mensaje sugerido: "feat: integración saliente con n8n y endpoint de
   callback de enriquecimiento".

Al terminar, dame un resumen de cómo probarlo manualmente sin n8n (p. ej. con curl
simulando el callback) y confírmame que los tests pasan antes de avanzar a la Fase 5
(el workflow de n8n en sí).
```

---

## Fase 5 — Prompt: Consolidar Docker + workflow de n8n

```
Contexto: hasta ahora docker-compose.yml solo tiene Postgres y n8n; el backend corre en
el host vía `npm run start:dev`. Vamos a meter también el backend al compose para que
backend y n8n se comuniquen por nombre de servicio Docker (sin host.docker.internal, que
es frágil entre sistemas operativos) y el evaluador pueda levantar todo con un solo
`docker compose up`.

PARTE A — Backend al docker-compose

1. Crea backend/Dockerfile (Node 26, coincide con lo que ya usa el proyecto). Instala
   dependencias, corre `prisma generate` (el cliente se genera en src/generated, ya
   gitignored), expone el puerto de la app.

2. Agrega el servicio `backend` a docker-compose.yml:
   - build: ./backend
   - depends_on: postgres
   - volumes: monta ./backend:/app para hot-reload en desarrollo, con un volumen
     anónimo para /app/node_modules (que no se pise con el host).
   - command: `sh -c "npx prisma migrate deploy && npm run start:dev"` (aplica
     migraciones pendientes en cada arranque; NO corras el seed automáticamente acá —
     el seed es un paso manual único, documentado aparte, para no pisar datos que el
     evaluador haya modificado si reinicia el contenedor).
   - environment (o via env_file apuntando a un .env que uses solo para este contexto):
     DATABASE_URL=postgresql://<user>:<pass>@postgres:5432/<db>  (host "postgres", no
       "localhost" — ahora vive en la misma red Docker).
     N8N_WEBHOOK_URL=http://n8n:5678/webhook/ticket-enrichment
     N8N_WEBHOOK_SECRET, JWT_SECRET, JWT_EXPIRES_IN, PORT — igual que antes.
   - ports: publica el puerto del backend al host (para que el frontend, que sigue
     corriendo fuera de Docker, y vos con curl/Postman, puedan acceder).

3. Agrega al servicio `n8n` una variable de entorno BACKEND_CALLBACK_URL con el valor
   http://backend:<PORT>/webhooks/n8n/enrichment — la vamos a referenciar desde el
   workflow como {{$env.BACKEND_CALLBACK_URL}} en vez de hardcodear la URL en el nodo.

4. Actualiza backend/.env.example para reflejar que estos valores son los que aplican
   cuando se corre vía docker-compose, y agrega una nota en el README (sección Setup)
   aclarando que si alguien corre el backend fuera de Docker (npm run dev directo en el
   host) necesita valores distintos (localhost en vez de nombres de servicio).

5. Verifica end-to-end: `docker compose up --build`, espera a que backend levante,
   corre el seed una sola vez a mano (`docker compose exec backend npx prisma db seed`),
   y confirma con curl que el backend responde en el puerto publicado y que puede
   alcanzar `http://n8n:5678` (podés probarlo con un curl simple al healthcheck de n8n
   desde dentro del contenedor backend, `docker compose exec backend curl http://n8n:5678`).

PARTE B — Workflow de n8n (clasificación por reglas)

Escribe el JSON del workflow en /n8n/workflow.json (no tengo la UI de n8n abierta ahora
para que la uses vos):

1. Webhook (trigger): Method POST, Path "ticket-enrichment", Response Mode "Immediately"
   (responde 200 de inmediato; el backend ya trata esta llamada como fire-and-forget con
   timeout corto — la clasificación real llega después por el callback). Autenticación:
   credencial "Header Auth" de n8n validando X-Webhook-Secret (nunca el valor en texto
   plano en el nodo — las credenciales no se incluyen en el JSON exportado).

2. Code (JavaScript) — clasificación por keywords en title+description (case-insensitive):
   - category: billing (factura, cobro, pago, suscripción, cancelación, reembolso) ·
     technical (error, bug, no funciona, se cierra, crash, no carga, 500) · account
     (contraseña, email, cuenta, acceso, sesión, login) · other (default).
   - priority: urgent (urgente, no puedo trabajar, crítico) · high (error 500, cobro
     duplicado, no funciona, no puedo iniciar sesión) · low (sugerencia, consulta,
     pregunta) · medium (default).
   - tags: keywords que matchearon.
   - Devuelve { ticketId, status: "done", priority, category, tags }. Envuelto en
     try/catch: si falla, devuelve { ticketId, status: "failed" }.

3. HTTP Request (callback): POST a {{$env.BACKEND_CALLBACK_URL}}, header X-Webhook-Secret
   vía credencial Header Auth (mismo criterio, nunca texto plano), body = salida del
   nodo Code.

Al terminar:
- Muéstrame el JSON completo del workflow.
- Escribe docs/n8n-setup.md con los pasos manuales que me quedan a mí: importar el
  workflow (Import from File), crear las 2 credenciales Header Auth con el valor de
  N8N_WEBHOOK_SECRET, activar el workflow, y verificar que BACKEND_CALLBACK_URL llegó
  bien como variable de entorno al contenedor de n8n.
- Commit separado para la Parte A ("chore: mover backend al docker-compose") y otro para
  la Parte B ("feat: agregar workflow de n8n para clasificación de tickets").

Avísame explícitamente qué verificaciones manuales me quedan a mí antes de dar esto por
cerrado — no puedes probar el workflow end-to-end vos solo sin la UI de n8n.
```

**Después de esto, el trabajo manual que sí te toca a ti:** importar el JSON, crear las credenciales, activar el workflow, y probar el flujo completo (crear ticket → "processing" → workflow corre → "done" con priority/category). Es exactamente lo que vas a grabar para el video/GIF obligatorio — aprovecha esa misma sesión para grabarlo.

---

## Fase 6 — Prompt: Frontend (login, lista, formulario, detalle con polling)

```
Contexto: el backend está completo (auth JWT, roles, CRUD de tickets con filtros, y la
integración con n8n). El scaffolding del frontend ya tiene React + Vite + TS + Tailwind +
React Router + TanStack Query cableados, sin rutas de negocio. El backend corre en
docker-compose con el puerto publicado al host — el frontend sigue corriendo fuera de
Docker (npm run dev) y le pega a esa URL.

0. Antes de nada: crea frontend/.env.example con VITE_API_URL (apuntando al puerto
   publicado del backend, p. ej. http://localhost:3000) y frontend/.env real con el mismo
   valor (gitignored). Instala react-hook-form, zod y @hookform/resolvers para la
   validación inline de formularios.

1. Cliente de API: un wrapper delgado sobre fetch/axios con baseURL=VITE_API_URL, que
   adjunte el JWT (Authorization: Bearer) en cada request autenticado, y que si recibe
   401 limpie la sesión y redirija a /login (sesión expirada) — sin que cada componente
   tenga que manejar ese caso por separado.

2. Auth:
   - Context/store simple (Context API o Zustand, tu elección) con user + token.
     Persiste en localStorage para sobrevivir un refresh (documenta en el README que es
     una simplificación aceptable para el alcance de esta prueba — en producción real
     usaríamos httpOnly cookies + refresh tokens).
   - Página /login: formulario email/password, valida inline, llama POST /auth/login,
     guarda sesión, redirige a /tickets. Error de credenciales → mensaje inline, nunca
     alert().
   - Componente ProtectedRoute: si no hay sesión, redirige a /login. Al cargar la app,
     si hay token guardado, valida contra GET /auth/me antes de dar acceso (por si el
     token expiró estando la app cerrada).

3. Página /tickets (lista):
   - Filtros (status, priority, category), búsqueda de texto (con debounce ~300ms),
     paginación y ordenamiento — reflejados en la URL vía query params (useSearchParams
     de React Router), así son compartibles y el botón "atrás" del navegador funciona.
   - useQuery de TanStack Query, keyed por esos params, contra GET /tickets.
   - Estados cuidados: loading (skeleton, no solo un spinner genérico), vacío ("no se
     encontraron tickets" + sugerencia de ajustar filtros), error (mensaje + botón reintentar).
   - Cada fila/card: title, status, priority (badge o "sin clasificar" si aún es null),
     category, createdAt. Click navega al detalle.
   - Botón/link a /tickets/new.

4. Página /tickets/new (crear ticket):
   - react-hook-form + zod: title (3-200 chars), description (10-2000 chars). Errores
     inline debajo de cada campo, no alert().
   - POST /tickets al enviar. Éxito → redirige al detalle del ticket creado. Error de
     red o 500 → mensaje de error a nivel de formulario (no inline de campo).

5. Página /tickets/:id (detalle):
   - useQuery contra GET /tickets/:id.
   - Si enrichmentStatus es "pending" o "processing": muestra un indicador claro
     ("Enriqueciendo ticket...") y usa refetchInterval de TanStack Query (p. ej. 3s) SOLO
     mientras siga en ese estado — corta el polling automáticamente en cuanto llega a
     "done" o "failed" (refetchInterval como función del data actual, no un intervalo fijo
     indefinido).
   - Si "done": muestra priority, category, tags (badges) y suggestedReply si vino.
   - Si "failed": mensaje indicando que la clasificación automática falló.
   - Estados de loading/error igual de cuidados que en la lista.

6. Layout general: nav simple con nombre/rol del usuario autenticado y botón de logout.

No implementes edición de tickets desde el frontend (PATCH) en esta fase — el PDF solo
pide que el detalle *muestre* el enriquecimiento, no que se edite desde la UI. Si sobra
tiempo al final lo agregamos como extra, pero no es prioridad ahora.

Commit(s) separados por vista (auth+layout, lista, formulario, detalle) — no todo en un
solo commit gigante de frontend.

Al terminar, dame la lista de rutas del frontend y confírmame que build + lint pasan
antes de que yo pruebe manualmente contra el backend real.
```

---

## Fase 7 — Prompt: Pulido y pendientes acumulados

```
Contexto: backend, frontend e integración con n8n están completos y verificados
end-to-end. Antes de pasar al README final, hay varios pendientes menores acumulados
de fases anteriores que hay que cerrar.

1. Sincronizar n8n/workflow.json (pendiente desde la Fase 5): en el nodo "Send Callback",
   reemplaza la expresión {{$env.BACKEND_CALLBACK_URL}} del campo URL por el string
   literal "http://backend:3000/webhooks/n8n/enrichment" — mismo fix que ya se aplicó a
   mano en la UI de n8n, pero nunca se reflejó en el archivo del repo. Sin esto, el
   evaluador va a chocar con el mismo error de "access to env vars denied" al importar
   el workflow desde cero. Verifica también docs/n8n-setup.md por si menciona la
   variable de entorno BACKEND_CALLBACK_URL como parte del setup — si ya no hace falta
   configurarla en n8n, actualiza esas instrucciones también.

2. Estabilizar `nest --watch` en Docker: ya se cayó dos veces al recompilar dentro del
   contenedor con bind mount, obligando a reiniciar manualmente. Investiga si es el
   problema clásico de chokidar no detectando cambios de filesystem en bind mounts
   (agregar CHOKIDAR_USEPOLLING=true, o configurar watchOptions con polling en
   nest-cli.json) y aplica el fix permanente. Verifica editando un archivo y confirmando
   que recarga solo, sin que tengas que reiniciar el contenedor.

3. El `dist/` del backend quedó con permisos de root por el bind mount (EACCES visto en
   la Fase 6). Aunque está gitignoreado, arréglalo para que no moleste a futuro: corre
   el proceso de desarrollo como usuario no-root en el Dockerfile, o ajusta el comando
   para que compile a una ruta que no choque con el bind mount del host.

4. Verifica que CORS_ORIGIN no haya quedado como wildcard "*" — debe ser el origin
   específico del frontend (p. ej. http://localhost:5173), documentado en .env.example.

5. Resetea los datos a un estado limpio para la demo/video: dropea los tickets de
   prueba manual que se acumularon (los "Prueba de integración n8n..." y cualquier otro
   ticket de smoke test) dejando solo los 12 del seed original. Puedes hacerlo re-corriendo
   migrate reset + seed sobre una base limpia, o borrando esos ids puntuales — lo que sea
   más rápido, pero confirma el conteo final (12 tickets, 3 usuarios).

6. Corre la suite completa (backend unit + e2e, build + lint de ambos proyectos) una vez
   más para confirmar que nada se rompió con estos cambios.

7. Commits separados por cada pendiente cerrado, no un solo commit de "misc fixes".

Al terminar, dame la lista de qué quedó resuelto de cada punto y confírmame que todo
está verde antes de que armemos el README final (Fase 8).
```

---

## Fase 7.5 — Prompt: Aislar la base de datos de tests

```
Contexto: los tests e2e del backend corren hoy contra la misma base de datos de
desarrollo (la que tiene los 12 tickets/3 usuarios del seed). Son idempotentes y limpian
lo que crean, pero si una corrida se interrumpe a mitad de camino (Ctrl+C, crash), los
datos de test quedan mezclados con los de desarrollo. Vamos a aislarlos.

1. Crea una base de datos separada en el mismo Postgres del docker-compose (no toques el
   volumen ni la base de desarrollo existente): algo como
   `docker compose exec postgres createdb -U <user> crazysupporthub_test`.

2. Crea backend/.env.test con el mismo contenido que .env pero DATABASE_URL apuntando a
   esa base de test en vez de la de desarrollo. Documenta esta variable también en
   .env.example (o un .env.test.example) para que el evaluador sepa que existe.

3. Instala dotenv-cli (o usa un setupFile de Jest) para que `npm run test:e2e` cargue
   .env.test en vez de .env al ejecutarse — sin tener que exportar variables a mano.

4. Agrega un paso de preparación (script `pretest:e2e` en package.json, o global setup
   de Jest) que antes de correr los tests: aplique las migraciones (`prisma migrate
   deploy`) y corra el seed sobre esa base de test — los tests de la Fase 3 dependen de
   los datos del seed para sus aserciones de filtros/búsqueda, así que la base de test
   necesita el mismo seed que la de desarrollo, no una vacía.

5. Corre la suite completa contra la base de test y confirma dos cosas por separado:
   - Los tests pasan igual que antes (24/24).
   - La base de datos de DESARROLLO (docker compose exec backend npx prisma studio, o
     una query directa) sigue intacta con exactamente 12 tickets/3 usuarios — nada se
     escribió ahí durante la corrida de tests.

6. Actualiza el borrador del README: en la sección "Pendientes/bugs conocidos", elimina
   el bullet sobre "tests corriendo contra la misma DB de desarrollo" — ya no aplica.
   Agrega en su lugar una línea corta en "Setup" o en un apartado de Testing mencionando
   que existe una base de datos de test separada y cómo se prepara.

7. Commit: "test: aislar la base de datos de tests de la de desarrollo".

Al terminar, confírmame que ambas bases (dev y test) quedaron verificadas por separado,
y muéstrame cómo quedó la sección de Pendientes del README después del ajuste.
```

---

## Fase 8 — Prompt: README final

```
Contexto: CrazySupportHub está completo — backend (auth, roles, CRUD de tickets,
integración bidireccional con n8n), frontend (login, lista, formulario, detalle con
polling), workflow de n8n funcionando end-to-end, y todo corriendo vía docker-compose
(Postgres + n8n + backend contenedorizados, frontend fuera de Docker). Escribe el
README.md final en la raíz, con estas secciones:

1. Setup — instrucciones exactas y probadas para las tres piezas:
   - Clonar, copiar .env.example a .env en backend/ y frontend/, con qué valores.
   - `docker compose up --build` (levanta Postgres + n8n + backend).
   - Seed manual una sola vez: `docker compose exec backend npx prisma db seed`.
   - Importar y activar el workflow de n8n (resume los pasos de docs/n8n-setup.md acá,
     no dupliques todo el detalle, solo lo esencial + link al doc).
   - Frontend: `cd frontend && npm install && npm run dev`.
   - Usuarios de prueba (admin/agent) y sus credenciales, tal como están en el seed.

2. Decisiones técnicas (no genérico — con el detalle real de este proyecto):
   - Por qué NestJS + Prisma + React/Vite (el resumen que ya armamos en Fase 0).
   - Cómo modelamos el enriquecimiento asíncrono: pending → processing → done/failed,
     el disparo saliente fire-and-forget con timeout, y por qué el callback no bloquea
     la creación del ticket.
   - Por qué el backend terminó en el mismo docker-compose que n8n (networking por
     nombre de servicio en vez de host.docker.internal).
   - Por qué se hardcodeó la URL del callback en el nodo de n8n en vez de usar $env
     (no es un secreto; el secreto real va por credencial).
   - Cómo se maneja el estado asíncrono en el frontend (TanStack Query + refetchInterval
     condicional que se apaga solo al llegar a done/failed).
   - La historia real del fix de `nest --watch` en Docker (tsc+nodemon en vez de
     nest --watch directo) — es un detalle técnico interesante, inclúyelo.

3. Uso de IA — sé específico y honesto, no genérico:
   - Se usó Claude (planeación, revisión de cada fase) + Claude Code (ejecución, un
     prompt detallado por fase, ver docs/claude-code-prompts.md) a lo largo de todo el
     proyecto.
   - Cada fase se revisó antes de avanzar a la siguiente — no se aceptó el output a
     ciegas. Da 3-4 ejemplos concretos de bugs reales que la IA encontró probando (no
     solo con build/lint) y de veces que una decisión de la IA se corrigió a mano (el
     nombre de variable de entorno equivocado para n8n, el bug de secuencia de Postgres
     con upsert, el hardcode del callback vs relajar la seguridad de n8n).
   - Lo que se hizo 100% a mano: importar y activar el workflow en la UI de n8n, crear
     las credenciales, y grabar el video de la demo — nada de eso lo puede hacer un
     agente sin acceso a esa UI.

4. Pendientes / bugs conocidos (sé honesto, no los escondas):
   - Si el disparo saliente a n8n falla (caído, timeout), el ticket queda en "pending"
     indefinidamente — no hay reintento automático.
   - Si n8n recibe el webhook pero el workflow falla sin llegar al nodo de callback, el
     ticket queda en "processing" indefinidamente — mismo motivo, sin timeout de vuelta.
   - El frontend no tiene UI de edición de tickets (PATCH) — el backend lo soporta, pero
     no se priorizó para el frontend en el alcance de esta entrega.
   - Deploy: [complétalo según corresponda — si no lo hiciste, dilo directamente].

5. Recapitula seguridad básica en una lista corta: passwords con bcrypt, JWT, secreto
   compartido para el callback (X-Webhook-Secret + credenciales de n8n, nunca en texto
   plano), CORS restringido a origin específico, validación de entrada con DTOs,
   ningún secreto commiteado (.env gitignoreado, solo .env.example).

No repitas contenido completo de docs/n8n-setup.md o docs/claude-code-prompts.md —
enlázalos donde corresponda. Commit final: "docs: agregar README completo del proyecto".

Al terminar, dame el README completo para que yo lo revise antes de grabar el video y
enviar la entrega.
```

Cuando tengas el README, revísalo conmigo antes de grabar el video — hay un par de cosas
del "Pendientes" que quiero ver cómo quedaron redactadas antes de que sea la versión final.

---

# Sprint 2 — Ideas y prompts

El sprint 1 (todo lo de arriba) está completo, funcional y entregado. Esto es trabajo
adicional de portafolio, priorizado por impacto vs. esfuerzo. No hay presión de rúbrica
acá — se hace en el orden que tengas tiempo/ganas.

## Prioridad alta (resuelven pendientes ya documentados, esfuerzo bajo-medio)

### Fase 9 — Reconciliación del enrichment (cierra los 2 pendientes del README)

```
Contexto: hoy, si el POST saliente a n8n falla, el ticket queda en "pending" para
siempre; si n8n recibe el webhook pero nunca llega al callback, queda en "processing"
para siempre. Ambos están documentados como pendientes conocidos — vamos a cerrarlos
con un job de reconciliación, sin agregar infraestructura nueva (nada de Redis/colas).

1. Migración: agrega a Ticket dos campos nullable: `notifyAttempts` (int, default 0) y
   `lastNotifyAttemptAt` (datetime, nullable).

2. Instala @nestjs/schedule. Crea un cron job (cada 1 minuto) que:
   - Busque tickets en "pending" con `notifyAttempts < 3` y (nunca intentados, o el
     último intento fue hace más de: 1 min si notifyAttempts=0, 5 min si =1, 15 min si
     =2 — backoff exponencial simple). Reintenta el POST a n8n, incrementa
     `notifyAttempts` y actualiza `lastNotifyAttemptAt` en cada intento.
   - Si un ticket llega a `notifyAttempts >= 3` sin éxito, márcalo `enrichmentStatus:
     failed` — ya agotamos los reintentos razonables.
   - Busque tickets en "processing" hace más de 10 minutos sin callback recibido, y
     márcalos `enrichmentStatus: failed` (timeout — no reintentes el dispatch de nuevo,
     ya se los mandaste a n8n, podría duplicar la clasificación si el workflow solo
     estaba lento).

3. Tests: un test unitario del servicio de reconciliación con tiempos mockeados
   (no esperes minutos reales en el test) cubriendo los 3 casos: reintento exitoso,
   agotar reintentos → failed, timeout de processing → failed.

4. Actualiza el README: saca los dos bullets de "Pendientes" que esto resuelve, y
   documenta el mecanismo nuevo en Decisiones técnicas.

Commit: "feat: reconciliación automática de tickets estancados en pending/processing".
```

### Fase 10 — Rate limiting en auth

```
Instala @nestjs/throttler. Aplica límite de 5 intentos por minuto por IP en
POST /auth/login y POST /auth/register (los dos endpoints públicos, los más expuestos a
fuerza bruta / creación masiva de cuentas). Respuesta 429 al exceder el límite. Un test
e2e que dispare 6 requests seguidos y confirme que el 6to da 429. Commit: "feat: rate
limiting en endpoints públicos de auth".
```

### Fase 11 — CI en GitHub Actions

```
Crea .github/workflows/ci.yml que en cada push/PR: levante un servicio de Postgres
(container de GitHub Actions), corra lint + build + tests unitarios + tests e2e del
backend, y lint + build del frontend. Debe fallar el check si cualquiera de esos pasos
falla. No hace falta cachear node_modules de forma sofisticada, con cache de npm
estándar de actions/setup-node alcanza. Commit: "ci: agregar pipeline de GitHub Actions".
```

## Prioridad media (más esfuerzo, buen impacto en demo/entrevista)

### Fase 12 — Cierre de tickets + historial de actividad

```
1. Nuevo modelo TicketActivity: ticketId, userId, action (string: "status_changed",
   "assigned", "enriched"), fromValue/toValue (string, nullable), createdAt. Migración.
2. En TicketsService, cada cambio vía PATCH que modifique status o assignedTo escribe
   una fila en TicketActivity (dentro de la misma transacción que el update).
3. Nuevo endpoint GET /tickets/:id/activity (misma regla de ownership que el ticket).
4. Frontend: en el detalle del ticket, agrega botones de transición de estado
   (open→in_progress→resolved→closed) respetando las reglas de rol ya existentes en el
   backend, y una sección "Historial" listando la actividad devuelta por el nuevo
   endpoint (usuario, acción, fecha, de-qué-a-qué).
5. Tests e2e del nuevo endpoint y de que las transiciones de estado generan actividad.
Commit(s) separados: backend primero, frontend después.
```

### Fase 13 — Respuesta sugerida con IA real

```
Contexto: el campo suggestedReply existe en el schema desde la Fase 1 pero siempre
queda null — la clasificación es 100% por reglas. Vamos a generarlo con un LLM real
(bonus explícito del PDF).

En n8n/workflow.json, entre el nodo Code y el HTTP Request de callback, agrega un nodo
HTTP Request (o el nodo nativo de IA si la versión de n8n instalada lo tiene) que llame
a un proveedor con capa gratuita (Gemini o Groq, a elección) pidiendo una respuesta
breve y profesional al cliente basada en title+description+category+priority ya
clasificados. La API key va como credencial de n8n (nunca en el JSON). Si la llamada de
IA falla, no rompas el workflow — cae al callback igual con suggestedReply: null.

Esto es principalmente trabajo en la UI de n8n (yo no puedo probarlo sin acceso), así
que dame el JSON actualizado y una checklist de lo que te queda por configurar a mano
(la credencial de la API key del proveedor que elijas).
```

## Backlog (ideas de mayor esfuerzo, sin prompt detallado todavía — avisa cuál priorizar)

- **Refresh tokens** (access token corto + refresh con rotación) — mejora de seguridad,
  buen tema de entrevista, pero toca el flujo de auth del frontend también.
- **Dashboard/analytics** (tickets por categoría/prioridad, tiempo promedio de
  resolución) — buen showcase visual, requiere agregaciones nuevas en el backend.
- **Deploy gratuito** (Render para backend + Neon/Supabase para Postgres + n8n
  autohospedado) — viable, pero hay que resolver el problema de cold-starts de n8n en
  free tier antes de confiar en que el enriquecimiento funcione en producción.
- **Búsqueda semántica de tickets similares** (embeddings + pgvector) — la más ambiciosa,
  buen "wow factor" pero es prácticamente una mini-feature aparte.
- **WebSockets/SSE** en vez de polling — el PDF dice explícitamente que no hace falta,
  pero es un extra con criterio si sobra tiempo.
