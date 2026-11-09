# Spanglish

Web pública (`apps/web`, spanglish.com.au) y plataforma educativa (`apps/app`, app.spanglish.com.au) sobre un backend Supabase compartido.

- Plan y decisiones: [docs/PLAN.md](docs/PLAN.md)
- Logo: [brand/logo-spanglish.png](brand/logo-spanglish.png)
- Colores: amarillo `#FCD404`, fucsia `#D71950`, burdeos `#8F0831`, morado `#592F85`

Estructura: monorepo pnpm + Turborepo (`apps/*`, `packages/*`).

## Cómo correr en local

Requisitos: Node 22+, pnpm 9.7 (`corepack enable`) y Docker Desktop en ejecución.

1. `pnpm install`
2. `pnpm supabase start` (levanta el stack local) y `pnpm supabase db reset` (migraciones + `supabase/seed.sql`).
3. Variables de la app: `pnpm supabase status -o env` da `API_URL` y `ANON_KEY`; copiarlos a
   `apps/app/.env.local` (git-ignored; ver `.env.example` en la raíz). Añadir también `NEXT_PUBLIC_SITE_URL`
   (`http://127.0.0.1:3001`; sin ella la recuperación de contraseña registra un error) y, para el e2e,
   `SUPABASE_SERVICE_ROLE_KEY` (`SERVICE_ROLE_KEY` del mismo comando).
4. `pnpm dev`.
5. Al terminar: `pnpm supabase stop`.

### Usuarios de prueba (solo desarrollo)

El seed crea cuatro usuarios locales (admin, teacher, student, suspended; correos
`*@spanglish.test`). Los correos y la contraseña de desarrollo están en `supabase/seed.sql`;
no se repiten aquí.

### Pruebas

- Unitarias: `pnpm test` (también `pnpm lint`, `pnpm typecheck`, `pnpm build`).
- Base de datos (pgTAP): `pnpm supabase test db`.
- Tipos de BD: tras cada migración, `pnpm supabase db reset` y `pnpm db:types`, y versionar
  `packages/db/src/database.types.ts` (CI falla si no coincide con las migraciones).
- e2e (Playwright, requiere Supabase local con seed): `pnpm --filter @spanglish/app e2e`.
  La primera vez: `pnpm --filter @spanglish/app exec playwright install chromium`.

### Reglas

- `supabase/seed.sql` es solo para el stack local: crea usuarios con contraseña pública.
  Nunca usar `supabase db push --include-seed` ni Supabase Branching con este seed. El propio
  archivo aborta si la base no es la local.
- Nunca subir archivos `.env*` (solo `.env.example`) ni claves.

## Estructura del repo

- `apps/app`: plataforma educativa (Next.js).
- `apps/web`: web pública (Next.js).
- `packages/ui`: componentes compartidos.
- `packages/db`: tipos generados de la base de datos (`@spanglish/db`).
- `supabase/`: configuración, migraciones, seed local y pruebas pgTAP.
- `docs/`: plan y decisiones. `.github/workflows/ci.yml`: CI (check, db, e2e).

## Estado del proyecto

Hito 1A (cimientos) completo: monorepo, base de datos con roles y RLS, autenticación,
shell por rol y CI. Siguiente: hito 1B (programas, cursos, grupos, matrículas, calendario,
sesiones, asistencia y paneles de administradora y docente).
