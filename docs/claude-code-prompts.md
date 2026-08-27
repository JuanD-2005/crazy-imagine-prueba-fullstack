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

## Próximas fases (pendientes de redactar)

- **Fase 2:** Módulo de auth (registro, login, JWT, Guards de rol) + módulo de users.
- **Fase 3:** CRUD de tickets con filtros/búsqueda/paginación + autorización por rol.
- **Fase 4:** Webhook saliente a n8n al crear ticket + endpoint de callback protegido por secreto.
- **Fase 5:** Workflow de n8n (export JSON).
- **Fase 6:** Frontend (login, lista de tickets, formulario, detalle con polling).
- **Fase 7:** Tests (login, creación de ticket, callback de enriquecimiento).
- **Fase 8:** README final + docker-compose completo.
