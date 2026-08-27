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
