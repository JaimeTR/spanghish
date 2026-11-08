# Hito 1A: Cimientos (monorepo, base de datos, auth y roles) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar funcionando un monorepo con Supabase local, esquema de identidad con RLS probado, auditoría, idiomas y niveles, y un portal (`apps/app`) con login, rutas por rol y español/inglés.

**Architecture:** pnpm + Turborepo con `apps/app` (portal), `apps/web` (esqueleto de la web pública) y `packages/ui` (tokens y componentes). Un solo Supabase (Postgres, Auth, RLS) compartido. La seguridad vive en la base de datos (RLS y funciones `security definer`), no en la app. Las políticas se prueban con pgTAP.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind v4, shadcn/ui, next-intl, `@supabase/ssr`, Supabase CLI (local con Docker), pgTAP, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-08-spanglish-platform-design.md`

## Global Constraints
- Moneda AUD; zona `Australia/Brisbane`; idiomas de interfaz `es` (por defecto) y `en`, rutas `/es` y `/en`.
- Roles: `admin`, `teacher`, `student`, `guardian`. Una persona puede tener varios.
- Colores: `#FCD404`, `#D71950`, `#8F0831`, `#592F85`; tokens en `packages/ui/tokens.css`.
- Cuentas con `status = 'suspended'` no acceden al portal privado.
- Ningún secreto en el repositorio; solo `.env.example`. Contraseñas de prueba solo en `supabase/seed.sql`.
- Nombres de paquetes: `@spanglish/ui`, `@spanglish/app`, `@spanglish/web`, `@spanglish/config`.
- Accesibilidad objetivo WCAG 2.2 AA; foco visible `3px solid #592F85`.

## Review Focus
1. Usuario suspendido con sesión válida abierta: debe perder acceso en la siguiente petición.
2. Usuario con varios roles (docente y alumno): entra al panel de mayor prioridad (`admin > teacher > student > guardian`) y puede cambiar.
3. Parámetro `next` del login con URL externa (`//evil.com`): se ignora y va al panel del rol.
4. Usuario nuevo sin fila en `profiles` (falla el trigger): no debe quedar una cuenta a medias.
5. Recuperación de contraseña: la respuesta es idéntica exista o no el correo.

---

### Task 1: Monorepo y herramientas

**Files:**
- Create: `turbo.json`, `tsconfig.base.json`, `packages/config/package.json`, `packages/config/tsconfig.nextjs.json`, `vitest.workspace.ts`, `.github/workflows/ci.yml`
- Modify: `package.json` (devDependencies: `turbo`, `typescript`, `vitest`, `prettier`, `eslint`), `.gitignore`

**Interfaces:** Produces: scripts raíz `pnpm build | lint | typecheck | test` que corren en todos los paquetes.

- [ ] **Step 1:** Instalar dependencias raíz con pnpm y crear `turbo.json` con tareas `build`, `dev`, `lint`, `typecheck`, `test`.
- [ ] **Step 2:** Crear `packages/config` con el tsconfig compartido (strict, `noUncheckedIndexedAccess`).
- [ ] **Step 3:** Crear `.github/workflows/ci.yml` que corre `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `test` en cada push y PR a `main`/`develop`.
- [ ] **Step 4:** Run: `pnpm typecheck` · Expected: sale 0 (sin paquetes aún, no falla).
- [ ] **Step 5:** Commit `chore: monorepo tooling y CI`.

### Task 2: `@spanglish/ui` (tokens + Tailwind + Button)

**Files:**
- Create: `packages/ui/src/theme.css`, `packages/ui/src/button.tsx`, `packages/ui/src/index.ts`, `packages/ui/src/button.test.tsx`
- Modify: `packages/ui/package.json`

**Interfaces:** Produces: `Button({ variant: 'primary' | 'secondary' | 'highlight', ...ButtonHTMLAttributes })`; `theme.css` importa `tokens.css` y expone `--color-*` como tema de Tailwind v4.

- [ ] **Step 1: Test** en `button.test.tsx`: `renders primary with fuchsia background class`, `renders highlight with ink text` (texto `--color-on-highlight`), `is focusable and shows focus ring class`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/ui test` · Expected: FAIL (Button no existe).
- [ ] **Step 3:** Implementar `Button` con clases Tailwind basadas en los tokens; `highlight` usa fondo amarillo y texto `--ink`, nunca amarillo como texto.
- [ ] **Step 4:** Run el test · Expected: PASS.
- [ ] **Step 5:** Commit `feat(ui): theme y Button`.

### Task 3: Esqueleto de `apps/app` y `apps/web` con i18n

**Files:**
- Create: `apps/app/` y `apps/web/` (Next.js App Router con `--ts --tailwind --eslint --src-dir`), `apps/*/src/i18n/{routing.ts,request.ts}`, `apps/*/messages/{es,en}.json`, `apps/*/src/middleware.ts`
- Test: `apps/app/src/i18n/routing.test.ts`

**Interfaces:** Produces: `routing = { locales: ['es','en'], defaultLocale: 'es' }`; tipo `Locale = 'es' | 'en'`; función `isLocale(value: string): value is Locale`.

- [ ] **Step 1: Test** `isLocale accepts es and en`, `isLocale rejects 'fr' and ''`, `unknown locale in URL redirects to /es`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app test` · Expected: FAIL.
- [ ] **Step 3:** Crear ambas apps con `create-next-app`, importar `@spanglish/ui/theme.css`, configurar `next-intl` con rutas `/[locale]`. `apps/web` solo muestra un título y el `Button` en ambos idiomas.
- [ ] **Step 4:** Run tests y `pnpm build` · Expected: PASS y build verde en ambas apps.
- [ ] **Step 5:** Commit `feat: apps web y app con i18n`.

### Task 4: Supabase local y esquema de identidad con RLS

**Files:**
- Create: `supabase/config.toml` (vía `supabase init`), `supabase/migrations/0001_identity.sql`, `supabase/tests/database/identity.test.sql`

**Interfaces:** Produces en SQL:
- `type public.app_role as enum ('admin','teacher','student','guardian')`
- `public.profiles(id uuid pk references auth.users on delete cascade, full_name text, email text, preferred_locale text default 'es' check in ('es','en'), status text default 'active' check in ('active','suspended'), created_at, updated_at)`
- `public.user_roles(user_id uuid, role app_role, primary key(user_id, role))`
- `public.has_role(r app_role) returns boolean` y `public.is_active() returns boolean`, ambas `security definer`, `stable`, con `search_path = ''`.
- Trigger `on auth.users insert` que crea la fila en `profiles` y asigna rol `student` por defecto.

- [ ] **Step 1: Test pgTAP** en `identity.test.sql` con estos casos: `student cannot select other profiles`, `student can select own profile`, `student cannot update own role or status`, `admin can select all profiles`, `suspended user sees no rows`, `teacher cannot insert into user_roles`, `new auth user gets profile and student role`, `anon sees nothing`.
- [ ] **Step 2:** Run `pnpm supabase start` y `pnpm supabase test db` · Expected: FAIL (tablas no existen).
- [ ] **Step 3:** Escribir `0001_identity.sql`: tablas, funciones, trigger y políticas RLS (select propio o admin; update propio solo `full_name` y `preferred_locale` mediante columna-permisos; escritura de roles y `status` solo admin; todo exige `is_active()`).
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): identidad, roles y RLS`.

### Task 5: Auditoría

**Files:**
- Create: `supabase/migrations/0002_audit.sql`, `supabase/tests/database/audit.test.sql`

**Interfaces:** Produces: `public.audit_logs(id bigint identity, actor uuid, table_name text, row_id text, action text, old_data jsonb, new_data jsonb, at timestamptz default now())` y función `public.audit_row()` usable como trigger. Aplicada a `profiles` y `user_roles`.

- [ ] **Step 1: Test** `role change writes an audit row with actor`, `only admin can select audit_logs`, `nobody can update or delete audit_logs`.
- [ ] **Step 2:** Run `pnpm supabase test db` · Expected: FAIL.
- [ ] **Step 3:** Implementar tabla (insert solo vía trigger, sin políticas de update/delete) y triggers.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): auditoría por triggers`.

### Task 6: Idiomas y niveles

**Files:**
- Create: `supabase/migrations/0003_languages_levels.sql`, `supabase/tests/database/catalog.test.sql`

**Interfaces:** Produces: `public.languages(code text pk, name_es text, name_en text, active bool)` con `es` y `en`; `public.levels(id uuid pk, language_code text references languages, code text check in ('A1','A2','B1','B2','C1','C2'), name_es text, name_en text, sort smallint, unique(language_code, code))` con 12 filas semilla (6 por idioma).

- [ ] **Step 1: Test** `any authenticated user can read languages and levels`, `student cannot insert a level`, `admin can update a level name`, `seed has 12 levels`.
- [ ] **Step 2:** Run `pnpm supabase test db` · Expected: FAIL.
- [ ] **Step 3:** Escribir migración con semilla y RLS (lectura para autenticados activos; escritura solo admin); auditar con `audit_row()`.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): idiomas y niveles`.

### Task 7: Clientes Supabase y lógica de acceso por rol (sin UI)

**Files:**
- Create: `apps/app/src/lib/supabase/{server.ts,browser.ts}`, `apps/app/src/lib/access.ts`, `apps/app/src/lib/access.test.ts`

**Interfaces:** Produces:
- `type AppRole = 'admin' | 'teacher' | 'student' | 'guardian'`
- `roleHomePath(roles: AppRole[], locale: Locale): string` → `/${locale}/admin|teacher|student|guardian` por prioridad `admin > teacher > student > guardian`; sin roles → `/${locale}/login`.
- `canAccess(roles: AppRole[], path: string): boolean` (`/admin` solo `admin`, `/teacher` solo `teacher` o `admin`, etc.).
- `isSafeRedirect(next: string | null): boolean` (solo rutas relativas que empiecen por una sola `/`).
- `getSessionUser(): Promise<{ id: string; roles: AppRole[]; status: 'active' | 'suspended'; locale: Locale } | null>` (consulta `profiles` y `user_roles` en el servidor).

- [ ] **Step 1: Test** `roleHomePath prefers admin over teacher`, `roleHomePath returns login with no roles`, `canAccess blocks student from /es/admin`, `isSafeRedirect rejects '//evil.com' and 'https://x.com'`, `isSafeRedirect accepts '/es/student/courses'`, `suspended user is treated as no access`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app test` · Expected: FAIL.
- [ ] **Step 3:** Implementar `access.ts` como funciones puras y `server.ts`/`browser.ts` con `@supabase/ssr`.
- [ ] **Step 4:** Run tests · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): lógica de acceso por rol y clientes Supabase`.

### Task 8: Login, recuperación de contraseña y rutas protegidas

**Files:**
- Create: `apps/app/src/app/[locale]/login/page.tsx`, `apps/app/src/app/[locale]/forgot-password/page.tsx`, `apps/app/src/app/[locale]/{admin,teacher,student,guardian}/page.tsx`, `apps/app/src/app/[locale]/(shell)/layout.tsx`
- Modify: `apps/app/src/middleware.ts` (refresca sesión, redirige por rol y por `suspended`), `apps/app/messages/{es,en}.json`
- Create: `supabase/seed.sql` (usuarios locales: administradora, docente, alumno, suspendido; contraseñas solo de desarrollo)
- Test: `apps/app/e2e/auth.spec.ts` (Playwright)

**Interfaces:** Consumes: `roleHomePath`, `canAccess`, `isSafeRedirect`, `getSessionUser` (Task 7).

- [ ] **Step 1: Test e2e** `admin logs in and lands on /es/admin`, `student visiting /es/admin is redirected to /es/student`, `teacher with student role lands on /es/teacher`, `suspended user is sent to /es/login?error=suspended`, `login with next=//evil.com ignores it`, `forgot-password shows the same message for unknown email`, `/en/login renders English text`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app exec playwright test` · Expected: FAIL.
- [ ] **Step 3:** Implementar páginas con formularios accesibles (etiquetas, errores con `aria-live`, foco visible) y acciones de servidor con validación `zod`; middleware según las reglas anteriores; `seed.sql` con los cuatro usuarios.
- [ ] **Step 4:** Run `pnpm supabase db reset` y el e2e · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): login, recuperación y rutas por rol`.

### Task 9: Shell del portal por rol

**Files:**
- Create: `apps/app/src/components/{Sidebar.tsx,Topbar.tsx,LocaleSwitch.tsx}`, `apps/app/src/components/shell.test.tsx`
- Modify: layouts de `admin`, `teacher`, `student`, `guardian`

**Interfaces:** Produces: `Sidebar({ role: AppRole, locale: Locale })` que lista los enlaces del rol; `LocaleSwitch` conserva la ruta al cambiar de idioma.

- [ ] **Step 1: Test** `admin sidebar lists dashboard, students, teachers`, `student sidebar does not list admin links`, `LocaleSwitch keeps the current path`, `sidebar has accessible nav landmark`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app test` · Expected: FAIL.
- [ ] **Step 3:** Implementar con tokens: sidebar morado, acciones fucsia, saludo con fondo crema; estilos según `docs/DESIGN.md`.
- [ ] **Step 4:** Run tests y `pnpm build` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): shell por rol`.

### Task 10: CI con base de datos y cierre del hito

**Files:**
- Modify: `.github/workflows/ci.yml` (job `db` que ejecuta `supabase start`, `supabase db reset`, `supabase test db`; job `e2e`)
- Create: `README.md` sección "Cómo correr en local"

- [ ] **Step 1:** Añadir jobs `db` y `e2e` al workflow.
- [ ] **Step 2:** Run localmente `pnpm typecheck && pnpm lint && pnpm test && pnpm supabase test db` · Expected: todo verde.
- [ ] **Step 3:** Abrir PR hacia `develop` y confirmar CI verde.
- [ ] **Step 4:** Commit `chore: CI de base de datos y e2e`.

---

## Fuera de este plan (siguientes planes)
- **1B:** programas, cursos, grupos, matrículas, calendario, sesiones, asistencia y dashboards de administradora y docente.
- **2:** portal del alumno, biblioteca, grabaciones, lecciones interactivas (rastreo de la web actual), tareas, progreso, notificaciones, tutores.
- **3:** Stripe y pagos externos, solicitudes, gestión de contenido web, web pública, migración y lanzamiento.
- **Cuentas en la nube** (Supabase Sídney, Vercel, dominios): requieren decisión y acceso del desarrollador; se crean antes del hito 3.
