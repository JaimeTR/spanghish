# Spanglish

Web pública (`apps/web`, spanglish.com.au) y plataforma educativa (`apps/app`, app.spanglish.com.au) sobre un backend Supabase compartido.

- Plan y decisiones: [docs/PLAN.md](docs/PLAN.md)
- Logo: [brand/logo-spanglish.png](brand/logo-spanglish.png)
- Colores: amarillo `#FCD404`, fucsia `#D71950`, burdeos `#8F0831`, morado `#592F85`

Estructura: monorepo pnpm + Turborepo (`apps/*`, `packages/*`).

## Cómo correr en local

1. `pnpm install`
2. `pnpm supabase start` (requiere Docker) y `pnpm supabase db reset` (migraciones + `supabase/seed.sql`).
3. Variables de la app: `pnpm supabase status -o env` da `API_URL` y `ANON_KEY` para
   `apps/app/.env.local` (ver `.env.example`; nunca subir valores).
4. `pnpm dev`. Pruebas: `pnpm test`, `pnpm supabase test db` y `pnpm --filter @spanglish/app e2e`.

**`supabase/seed.sql` es solo para el stack local**: crea usuarios con una contraseña
pública. Nunca usar `supabase db push --include-seed` ni Supabase Branching con este
seed. El propio archivo aborta si la base no es la local.
