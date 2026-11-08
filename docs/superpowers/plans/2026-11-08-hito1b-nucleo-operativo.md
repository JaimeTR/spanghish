# Hito 1B: Núcleo operativo (catálogo, personas, grupos, calendario, asistencia, solicitudes y paneles) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la administradora gestione sedes, programas con ediciones y precios, alumnos (adultos y menores con tutor y consentimiento), grupos con horarios que generan sesiones, matrículas con cupo y lista de espera, packs de clases y solicitudes de la web; y que cada docente vea sus clases de hoy y pase asistencia en un clic desde el móvil.

**Architecture:** Igual que 1A: la seguridad vive en Postgres. Cada tabla nueva tiene RLS por rol probada con pgTAP; las invariantes (cupo, consentimiento de menores, ventana de asistencia, consumo de créditos, última admin) se imponen con triggers `security definer`, así que valen para cualquier camino de escritura; las operaciones de docente que cambian sesiones van por RPC con comprobación explícita. `apps/app` lee y escribe siempre con el JWT del usuario (`createClient()`); la `service_role` solo se usa en un módulo `server-only` para crear cuentas de Auth. La web pública entrega las solicitudes a la plataforma llamando, desde su servidor, a una única RPC `submit_lead` con la clave anon más un token de admisión; el email a Maribel se mantiene como aviso y respaldo.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), TypeScript, Tailwind v4, next-intl, `@supabase/ssr` + `@supabase/supabase-js`, zod 4, Supabase CLI local (Postgres 17), pgTAP, Vitest, Playwright + axe, GitHub Actions. Paquete nuevo `@spanglish/db` (tipos generados).

**Spec:** `docs/superpowers/specs/2026-11-08-spanglish-platform-design.md` (§5, §6, §7 hito 1, §11, §12). Contexto: `docs/PLAN.md`, `docs/DESIGN.md`, `docs/superpowers/plans/2026-11-08-hito1a-cimientos.md`, `docs/superpowers/plans/2026-11-08-pendientes-tras-hito1a.md`.

## Global Constraints
- Moneda AUD (importes en centavos `integer`, columna `currency` fija `'AUD'`); zona `Australia/Brisbane` (sin horario de verano). Instantes en `timestamptz` (UTC); fechas de calendario escolar en `date` interpretadas en Brisbane.
- Idiomas de interfaz `es` (por defecto) y `en`; todo texto nuevo de UI va en `apps/app/messages/{es,en}.json` con las mismas claves. Contenido editable bilingüe por campo (`*_es`, `*_en`).
- Roles `admin`, `teacher`, `student`, `guardian`; prioridad `admin > teacher > student > guardian`. Toda política exige cuenta activa (`is_active()` o `has_role()`).
- Segmentos: niños 6–13 (`kids`), adultos 14+ (`adults`), mayores 65+ (`mature`). Formatos: individual, grupo propio (máx. 2), grupo local. Sedes: biblioteca, oficina (WOTSO), domicilio, online.
- Menores (13 o menos): sin cuenta propia; su ficha cuelga de un tutor; consentimiento guardado con fecha y versión del texto. No se recogen fotos, escuela ni datos de salud.
- Packs con saldo de clases que baja con la asistencia; sin caducidad salvo que la administradora la ponga. Clase gratuita: una por persona; crea una solicitud (lead), no un alumno.
- Cancelaciones y recuperaciones: las gestiona docente o administradora; el alumno solo solicita.
- Sin secretos en el repo (solo `.env.example`); la `SUPABASE_SERVICE_ROLE_KEY` nunca llega a `apps/web` ni al navegador.
- Migraciones numeradas desde `0006_`. `supabase/seed.sql` sigue siendo solo local (su guarda no se toca).
- Fuera de 1B: cobros y conciliación (hito 3), portal de alumno/tutor, biblioteca, grabaciones, tareas (hito 2), CMS (hito 3), notificaciones por email (hito 2; salvo el aviso de solicitudes que ya existe).
- Accesibilidad WCAG 2.2 AA; foco `3px solid #592F85`; objetivos táctiles de 44px en las vistas de docente; móvil primero (375px) para docente.

## Review Focus
1. **Límite del día en Brisbane:** una clase a las 07:00 de Brisbane es 21:00 UTC del día anterior. "Hoy" del docente y la semana del calendario deben calcularse en Brisbane, nunca en UTC ni en la zona del servidor. Pruebas en Task 4 (`schoolDayRange`) y Task 19 (e2e de "Hoy").
2. **Asistencia que cambia varias veces** (presente → justificada → presente, o borrar la marca): el saldo del pack termina con exactamente un cargo y nunca negativo por duplicados. Prueba en Task 17.
3. **Última plaza:** dos matrículas sobre la última plaza; la segunda debe fallar con `group_full` (el trigger bloquea la fila del grupo con `for update`). Prueba en Task 13.
4. **IDs ajenos (IDOR):** una docente que abre la URL de la sesión o del grupo de otra docente, o envía su id en una acción, recibe 404/`forbidden`, nunca datos. Pruebas en Task 18 (pgTAP) y Task 26 (e2e de aislamiento).
5. **Formulario público repetido o masivo:** la misma persona pide dos clases gratis; la segunda se guarda como `duplicate` y ve el mismo agradecimiento; una ráfaga por encima del límite devuelve `rate_limited` sin enviar emails. Pruebas en Task 22 y Task 23.

---

## Fases y PRs

Cada fase es software funcionando, con su propio PR hacia `develop` y CI verde. Dentro de cada fase: base de datos + RLS + pgTAP primero, después UI.

| Fase | Contenido | Tareas | Migraciones |
|---|---|---|---|
| 1. Base 1B y deudas de 1A | privilegios por defecto, auditoría, última admin, rol inicial, email, `/reset-password`, utilidades compartidas, tipos de BD | 1–5 | 0006, 0007 |
| 2. Catálogo y personas | sedes, programas, ediciones, precios, alumnos, tutores, consentimientos, alta de cuentas, docentes | 6–11 | 0008, 0009 |
| 3. Grupos, calendario y matrículas | grupos, reglas de repetición, cierres, sesiones, matrículas, cupo, lista de espera | 12–16 | 0010, 0011 |
| 4. Clases y asistencia | asistencia, packs y créditos, cancelar/mover/recuperar, solicitudes de cambio, vistas de docente | 17–21 | 0012, 0013 |
| 5. Solicitudes de la web | `leads`, `submit_lead`, integración de `apps/web`, bandeja de la administradora | 22–24 | 0014 |
| 6. Panel y cierre | KPIs de administradora, aislamiento e2e, seed, CI, docs | 25–26 | 0015 |

## Contratos comunes (valen para todas las tareas)

**Plantilla de migración** (cada tabla nueva):
- `id uuid primary key default gen_random_uuid()` en TODAS las tablas nuevas (incluidas las de unión), así `audit_row()` funciona sin cambios (`row_id = id`).
- `created_at timestamptz not null default now()`; si es mutable, `updated_at` + trigger `public.touch_updated_at()` (Task 1).
- `alter table … enable row level security;` y `grant` explícito a `authenticated` solo de las operaciones que tienen política. `anon` no recibe nada (privilegios por defecto revocados en 0006). `service_role` recibe DML por defecto (0006).
- Políticas `to authenticated`, con funciones envueltas en `(select …)`.
- `select public.enable_audit('public.<tabla>');` al final.
- Funciones `security definer`: `set search_path = ''`, primera sentencia = comprobación de autorización, `revoke execute … from public, anon, authenticated, service_role` y `grant execute … to authenticated` solo si la llama la app. Un trigger que necesite saber el rol usa `public.user_has_role(uid, rol)` (Task 2) dentro de una función `security definer`; nunca llama a `has_role()` desde código que pueda ejecutar `service_role` (lección de 0004).
- Índice en cada FK usada por políticas (`teacher_id`, `group_id`, `student_id`, `profile_id`, `guardian_id`).

**Errores de dominio:** `raise exception '<code>' using errcode = 'P0001'`; autorización: `raise exception 'forbidden' using errcode = '42501'`. Códigos (únicos válidos; la app los traduce): `forbidden`, `not_found`, `conflict`, `already_enrolled`, `slot_taken`, `group_full`, `group_closed`, `student_inactive`, `guardian_required`, `consent_required`, `teacher_required`, `session_not_editable`, `session_has_attendance`, `outside_attendance_window`, `not_in_roster`, `last_admin`, `invalid_range`, `horizon_too_far`, `lead_already_converted`. `23505` sobre `enrollments_seat_unique` → `already_enrolled`; sobre `sessions_group_starts_unique` → `slot_taken`; otro `23505` → `conflict`.

**Personas de prueba pgTAP** (cada archivo crea las suyas en `auth.users` como en 1A, con UUID fijos y prefijo propio del archivo): `admin` (A), `teacher1` (T1, grupo G1), `teacher2` (T2, grupo G2), `student1` (S1, cuenta, adulto en G1), `student2` (S2, cuenta, adulto en G2), `guardian1` (GU1, cuenta guardian) tutor de `kid1` (K1, menor sin cuenta, en G1), `suspended` (admin suspendido para probar fallo cerrado), `anon`.

**Matriz de RLS** (R = leer, W = insertar/actualizar/borrar; "vía RPC" = sin grant directo):

| Tabla | admin | teacher | student | guardian | anon |
|---|---|---|---|---|---|
| `locations`, `programs`, `program_editions`, `program_prices`, `consent_texts`, `closures` | RW (`consent_texts`: solo insert) | R | R | R | — |
| `students` | RW | R: alumnos con matrícula no cancelada en sus grupos o invitados en sus sesiones | R: su fila | R: sus menores | — |
| `student_private` | RW | — | R: propia | R: de sus menores | — |
| `guardians` | RW | — | — | R: su fila | — |
| `student_guardians` | RW | — | R: propias | R: propias | — |
| `consents` | R + insert (append-only) | — | R: propios | R: de sus menores | — |
| `groups` | RW | R: los suyos | R: donde está matriculado | R: de sus menores | — |
| `schedule_rules` | RW | R: sus grupos | — | — | — |
| `sessions` | RW | R: sus grupos o sesiones asignadas; W vía RPC | R: de sus grupos | R: de sus menores | — |
| `session_guests` | RW | R: sus sesiones | R: propias | R: de sus menores | — |
| `enrollments` | RW | R: sus grupos | R: propias | R: de sus menores | — |
| `waitlist_entries` | RW | — | R: propias | R: de sus menores | — |
| `attendance` | RW | RW: sus sesiones (ventana en trigger) | R: propia | R: de sus menores | — |
| `credit_packs` | RW | — | R: propios | R: de sus menores | — |
| `credit_movements` | R + insert `adjustment` | — | R: propios | R: de sus menores | — |
| `change_requests` | RW | R + insert: sus grupos; resolver vía RPC | R + insert: propias | R + insert: de sus menores | — |
| `leads` | RW | — | — | — | solo `submit_lead()` |

**Convenciones de `apps/app`:**
- Lecturas en `apps/app/src/lib/data/<dominio>.ts` (`import "server-only"`), funciones que reciben `SupabaseClient<Database>` y devuelven filas tipadas; `null` cuando RLS no deja ver → la página llama `notFound()`.
- Acciones en `actions.ts` junto a la ruta (`"use server"`): `requireArea(locale, area)` → `parseForm(schema, formData)` → escritura con `createClient()` → `toDomainError()` → `revalidatePath()`. Firma: `(prev: ActionState<F>, formData: FormData) => Promise<ActionState<F>>`.
- Esquemas zod en `apps/app/src/lib/schemas/<dominio>.ts` con test al lado.
- Páginas de docente filtran además por `teacher_id = user.id` (una admin que entra al área docente ve solo lo suyo).
- e2e: cada prueba crea sus datos con sufijo único (`e2e-${Date.now()}`) vía UI o `adminClient()`, y no depende del orden.

---

## Fase 1. Base 1B y deudas de 1A (PR "1B-1")

### Task 1: Privilegios por defecto, `service_role` y auditoría reutilizable

**Files:**
- Create: `supabase/migrations/0006_privileges_baseline.sql`, `supabase/tests/database/privileges.test.sql`

**Interfaces:**
- Produces (SQL):
  - `alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated;` ídem `on sequences` y `revoke execute on functions from public, anon, authenticated, service_role`; `grant select, insert, update, delete on tables to service_role` y `grant usage, select on sequences to service_role` por defecto.
  - Grants explícitos a `service_role` de DML en `profiles`, `user_roles`, `languages`, `levels`; en `audit_logs` solo `select`.
  - `public.touch_updated_at() returns trigger` (pone `new.updated_at := now()`).
  - `public.reject_mutation() returns trigger` (lanza `42501 'append-only'`; para `consents` y `credit_movements`).
  - `public.enable_audit(p_table regclass) returns void`: crea `audit_<tabla>_ins_del` (`after insert or delete`) y `audit_<tabla>_upd` (`after update … when (old.* is distinct from new.*)`), ambos con `audit_row()`. Sin EXECUTE para roles de la API.
  - Sustituye los triggers de auditoría de `profiles`, `user_roles`, `languages`, `levels` por `enable_audit(...)` (pendiente de calidad: UPDATE sin cambios ya no audita).

- [ ] **Step 1: Test** en `privileges.test.sql`: `new table in public gives no privilege to anon or authenticated` (crear `public.__probe` dentro de la transacción y comprobar `has_table_privilege`), `new table in public gives DML to service_role`, `new function in public is not executable by anon or authenticated`, `service_role can select profiles, user_roles, languages and levels`, `service_role can select but not insert audit_logs`, `enable_audit creates insert/delete and update triggers`, `no-op update on levels writes no audit row`, `real update on levels still writes one audit row`, `authenticated cannot execute enable_audit`.
- [ ] **Step 2:** Run `pnpm supabase db reset && pnpm supabase test db` · Expected: FAIL en `privileges.test.sql`.
- [ ] **Step 3:** Escribir `0006_privileges_baseline.sql` según Interfaces.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db` · Expected: PASS (también los archivos de 1A).
- [ ] **Step 5:** Commit `feat(db): privilegios por defecto, service_role y enable_audit`.

### Task 2: Identidad endurecida (rol inicial, última admin, email)

**Files:**
- Create: `supabase/migrations/0007_identity_hardening.sql`, `supabase/tests/database/identity_hardening.test.sql`

**Interfaces:**
- Produces (SQL):
  - `public.user_has_role(p_user_id uuid, p_role public.app_role) returns boolean` (`security definer stable`, exige perfil activo; sin EXECUTE para roles de la API: solo para triggers y funciones definer).
  - `public.handle_new_user()` reemplazada: rol inicial = `raw_app_meta_data ->> 'initial_role'` si está en `('teacher','student','guardian')`; cualquier otro valor o ausencia → `student`. Nunca lee roles de `raw_user_meta_data`; `admin` nunca se asigna por metadatos.
  - `public.guard_last_admin() returns trigger` (`security definer`): en `user_roles` BEFORE DELETE/UPDATE cuando `old.role = 'admin'`, y en `profiles` BEFORE UPDATE OF `status` a `suspended` de un admin: si no queda otra admin activa → `P0001 'last_admin'`.
  - `public.sync_profile_email() returns trigger` + trigger `on_auth_user_email_changed after update of email on auth.users when (old.email is distinct from new.email)`.

- [ ] **Step 1: Test** `user with app_metadata initial_role teacher gets only teacher`, `initial_role guardian gets only guardian`, `initial_role admin falls back to student`, `initial_role in user_metadata is ignored`, `deleting the last active admin role raises last_admin`, `suspending the last active admin raises last_admin`, `an admin role can be removed while another active admin exists`, `a suspended admin does not count as the remaining admin`, `changing auth.users.email updates profiles.email`.
- [ ] **Step 2:** Run `pnpm supabase test db` · Expected: FAIL.
- [ ] **Step 3:** Escribir `0007_identity_hardening.sql`. La primera admin de producción se crea por SQL (documentado en Task 26); el guard no impide añadir admins.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db` · Expected: PASS (incluido `identity.test.sql`, que borra roles de no-admins).
- [ ] **Step 5:** Commit `feat(db): rol inicial por app_metadata, última admin y sincronía de email`.

### Task 3: Página `/reset-password`

**Files:**
- Create: `apps/app/src/app/[locale]/(auth)/reset-password/{page.tsx,reset-form.tsx}`, `supabase/templates/recovery.html`, `apps/app/e2e/reset-password.spec.ts`, `apps/app/src/lib/auth-actions.test.ts`
- Modify: `apps/app/src/lib/auth-actions.ts`, `supabase/config.toml` (`[auth.email.template.recovery]` con `content_path = "./supabase/templates/recovery.html"`; quitar el comentario "pendiente"), `apps/app/messages/{es,en}.json` (`reset.*`)

**Interfaces:**
- Produces: `updatePassword(prev: ResetState, formData: FormData): Promise<ResetState>`; `type ResetState = { status: "idle" | "invalid" | "mismatch" | "expired" | "unavailable" }`; `resetSchema = z.object({ tokenHash: z.string().min(10).max(512), password: z.string().min(10).max(72), confirm: z.string() })`.
- Flujo: la plantilla enlaza `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`. La página GET solo pinta el formulario con `token_hash` oculto (el enlace no se consume al abrirlo: los escáneres de correo no lo gastan). La acción hace `verifyOtp({ type: "recovery", token_hash })` y luego `updateUser({ password })`; si va bien, `loadSessionUser` y `redirect(roleHomePath(...))`; si `verifyOtp` falla → `expired`.

- [ ] **Step 1: Test** Vitest: `resetSchema rejects passwords shorter than 10`, `rejects confirm mismatch as 'mismatch'`, `updatePassword returns expired when verifyOtp fails` (cliente simulado). e2e: `reset-password with a recovery token sets a new password and lands in the role area` (usuario nuevo creado con `adminClient().auth.admin.createUser`, token con `auth.admin.generateLink({ type: "recovery" })` → `properties.hashed_token`; se borra al final), `an expired or reused token shows the expired message`, `/en/reset-password renders English text`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app test` y `pnpm --filter @spanglish/app e2e reset-password` · Expected: FAIL.
- [ ] **Step 3:** Implementar página, formulario accesible (etiquetas, `aria-live`, mismo estilo que `forgot-form.tsx`), acción y plantilla.
- [ ] **Step 4:** Run ambos · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): restablecer contraseña con token_hash`.

### Task 4: Utilidades compartidas de la app (hora escolar, formularios, errores, i18n)

**Files:**
- Create: `apps/app/src/lib/time.ts`, `apps/app/src/lib/time.test.ts`, `apps/app/src/lib/forms.ts`, `apps/app/src/lib/forms.test.ts`, `apps/app/src/lib/db-errors.ts`, `apps/app/src/lib/db-errors.test.ts`, `apps/app/src/lib/money.ts`, `apps/app/src/lib/money.test.ts`, `apps/app/src/components/forms/{Field.tsx,FormStatus.tsx,SubmitButton.tsx}`, `apps/app/src/components/forms/forms.test.tsx`, `apps/app/src/i18n/messages.test.ts`
- Modify: `apps/app/messages/{es,en}.json` (`forms.errors.*`, `errors.domain.*`)

**Interfaces:**
- Produces:
  - `SCHOOL_TIME_ZONE = "Australia/Brisbane"`; `schoolToday(now?: Date): string` (`YYYY-MM-DD`); `schoolDayRange(day: string): { from: string; to: string }` (instantes ISO UTC, `[from, to)`, construidos con offset `+10:00`, válido porque Queensland no tiene horario de verano); `weekStart(day: string): string` (lunes); `addDays(day: string, n: number): string`; `formatSessionTime(startsAt: string, endsAt: string, locale: Locale): string` (con `Intl.DateTimeFormat` y `timeZone: SCHOOL_TIME_ZONE`).
  - `type FieldErrors<F extends string> = Partial<Record<F, FormErrorKey>>`; `type FormErrorKey = "required" | "tooLong" | "invalid" | "email" | "url" | "number" | "date" | "range"`; `type ActionState<F extends string = string> = { status: "idle" } | { status: "invalid"; fieldErrors: FieldErrors<F> } | { status: "error"; error: DomainError } | { status: "ok" }`; `parseForm<S extends z.ZodObject>(schema: S, formData: FormData): { ok: true; data: z.infer<S> } | { ok: false; fieldErrors: FieldErrors<keyof z.infer<S> & string> }` (cadenas vacías → `undefined`).
  - `type DomainError` = unión de los códigos de "Contratos comunes" + `"unknown"`; `DOMAIN_ERRORS: readonly DomainError[]`; `toDomainError(error: { code?: string; message?: string; details?: string } | null): DomainError`.
  - `parseAudToCents(input: string): number | null` (acepta `205`, `205.5`, `205.50`; rechaza negativos, más de 2 decimales y > 100000); `formatAud(cents: number): string` (`"$205"`, `"$205.50"`; mismo formato que `apps/web/src/lib/prices.ts`).
  - `Field({ name, label, error, hint, children })` (enlaza `aria-describedby` e `aria-invalid`), `FormStatus({ state })` (región `role="status"`/`alert` con el mensaje traducido), `SubmitButton({ pendingLabel })` (`useFormStatus`).

- [ ] **Step 1: Test** `schoolToday at 2026-11-08T15:30Z is 2026-11-09`, `schoolDayRange('2026-11-09') is 2026-11-08T14:00Z..2026-11-09T14:00Z`, `a 07:00 Brisbane session falls inside its Brisbane day`, `July has the same offset as December (no DST)`, `weekStart of a Sunday is the previous Monday`; `parseForm maps empty strings to undefined`, `parseForm returns 'tooLong' for max violations`; `toDomainError maps P0001 group_full`, `maps 42501 to forbidden`, `maps 23505 on enrollments_seat_unique to already_enrolled`, `maps unknown P0001 messages to unknown`; `parseAudToCents('205.50') is 20550`, `rejects '-1' and '1.234'`, `formatAud(20500) is '$205'`; `Field marks the input invalid and describes it with the error`; `es and en messages have identical keys`, `every DomainError has a message in es and en`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app test` · Expected: FAIL.
- [ ] **Step 3:** Implementar los módulos y mensajes.
- [ ] **Step 4:** Run `pnpm --filter @spanglish/app test && pnpm typecheck` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): utilidades de hora escolar, formularios, errores y dinero`.

### Task 5: Paquete `@spanglish/db` con tipos generados y control en CI

**Files:**
- Create: `packages/db/package.json`, `packages/db/src/{index.ts,database.types.ts}`, `packages/db/tsconfig.json`
- Modify: `package.json` raíz (script `"db:types": "supabase gen types typescript --local --schema public > packages/db/src/database.types.ts"`), `apps/app/package.json` (dep `@spanglish/db`), `apps/app/src/lib/supabase/{server.ts,browser.ts}`, `apps/app/src/lib/load-session-user.ts`, `apps/app/e2e/fixtures.ts`, `.github/workflows/ci.yml` (job `db`: tras `db reset`, `pnpm db:types` y `git diff --exit-code packages/db/src/database.types.ts`)

**Interfaces:**
- Produces: `export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "./database.types"`; `createClient()` devuelve `SupabaseClient<Database>`; `loadSessionUser(supabase: SupabaseClient<Database>)`.

- [ ] **Step 1:** Run `pnpm db:types` · Expected: archivo generado con `profiles`, `user_roles`, `languages`, `levels`, `audit_logs`.
- [ ] **Step 2:** Tipar clientes y `loadSessionUser`; Run `pnpm typecheck && pnpm --filter @spanglish/app test` · Expected: PASS.
- [ ] **Step 3:** Añadir el paso de deriva al job `db`; comprobar en local que `git diff --exit-code` sale 0 tras regenerar.
- [ ] **Step 4:** Regla para el resto del plan: cada tarea con migración termina ejecutando `pnpm db:types` y versionando el archivo.
- [ ] **Step 5:** Commit `chore(db): paquete de tipos generados y control de deriva en CI`. Abrir PR "1B-1" a `develop`.

---

## Fase 2. Catálogo y personas (PR "1B-2")

### Task 6: Sedes, programas, ediciones y precios (0008)

**Files:**
- Create: `supabase/migrations/0008_catalog.sql`, `supabase/tests/database/catalog_programs.test.sql`
- Modify: `supabase/seed.sql` (2 sedes, 1 programa, 1 edición, 2 precios), `packages/db/src/database.types.ts`

**Interfaces:**
- Produces (SQL):
  - Enums: `audience_segment ('kids','adults','mature')`, `lesson_format ('individual','own_group','local_group')`, `location_kind ('library','office','home','online')`, `edition_status ('draft','open','closed','cancelled')`, `price_kind ('per_lesson','upfront','pack')`.
  - `locations(name text not null ≤120, kind location_kind, region text check in ('sunshine_coast','brisbane','online'), address text null ≤300, map_url text null check ~ '^https://', active bool default true, created_at, updated_at)`; `check (kind not in ('home','online') or address is null)` (sin direcciones privadas en el catálogo).
  - `programs(code text unique check ~ '^[a-z0-9-]{2,40}$', name_es, name_en not null ≤120, description_es, description_en text null ≤2000, language_code fk languages, audience audience_segment, format lesson_format, level_id fk levels null, duration_weeks smallint null check 1..52, lesson_minutes smallint not null default 70 check 15..240, active bool default true, is_public bool default false, …)`.
  - `program_editions(program_id fk, label_es, label_en text null, starts_on date, ends_on date, status edition_status default 'draft', unique (program_id, starts_on), unique (id, program_id), check (ends_on >= starts_on))`.
  - `program_prices(program_id fk, edition_id null, location_id null fk locations, kind price_kind, amount_cents integer check >= 0, currency text default 'AUD' check (currency = 'AUD'), lessons_included smallint null, label_es, label_en null, active bool default true)`; FK compuesta `(edition_id, program_id) references program_editions (id, program_id)`; `check ((kind = 'per_lesson') = (lessons_included is null))`, `check (lessons_included is null or lessons_included between 1 and 100)`; índice único `program_prices_active_unique (program_id, edition_id, location_id, kind, lessons_included) nulls not distinct where active`.
  - RLS según la matriz; auditoría con `enable_audit`.

- [ ] **Step 1: Test** `any active user reads locations, programs, editions and prices`, `suspended user reads none`, `anon cannot read programs (42501)`, `teacher cannot insert a program`, `admin creates program, edition and price`, `a home location with an address is rejected (23514)`, `edition ending before it starts is rejected`, `a price for an edition of another program is rejected (23503)`, `two active prices for the same program, edition, location, kind and lessons are rejected (23505)`, `per_lesson price with lessons_included is rejected`, `currency other than AUD is rejected`, `admin update of a program writes an audit row`.
- [ ] **Step 2:** Run `pnpm supabase test db` · Expected: FAIL.
- [ ] **Step 3:** Escribir `0008_catalog.sql` y ampliar `seed.sql`.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db && pnpm db:types` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): sedes, programas, ediciones y precios`.

### Task 7: Alumnos, tutores y consentimientos (0009)

**Files:**
- Create: `supabase/migrations/0009_people.sql`, `supabase/tests/database/people.test.sql`
- Modify: `supabase/seed.sql` (usuarios `teacher2@spanglish.test` con `initial_role` teacher y `guardian@spanglish.test` con guardian; alumnos "Student Local" enlazado a `student@spanglish.test`, "Student Two" sin cuenta, "Kid Local" menor con tutor "Guardian Local" enlazado a `guardian@spanglish.test`; texto `minor_data-v1` de desarrollo y su consentimiento), `apps/app/e2e/fixtures.ts` (`USERS.teacher2`, `USERS.guardian`, `SEED_IDS`), `packages/db/src/database.types.ts`

**Interfaces:**
- Produces (SQL):
  - Enums: `student_status ('active','inactive')`, `consent_kind ('enrolment_terms','privacy','minor_data','recordings','photos')`, `consent_method ('portal','paper','email','web_form')`.
  - `students(profile_id uuid unique null fk profiles on delete set null, full_name text not null ≤120, audience audience_segment not null, is_minor boolean generated always as (audience = 'kids') stored, level_id null fk levels, preferred_locale text default 'es' check in ('es','en'), status student_status default 'active', created_by uuid default auth.uid(), …)`; `check (not is_minor or profile_id is null)`.
  - `student_private(student_id uuid unique not null fk students on delete cascade, email text null ≤254, phone text null ≤30, birth_year smallint null check 1900..2100, admin_notes text null ≤2000, …)`.
  - `guardians(profile_id uuid unique null fk profiles on delete set null, full_name not null ≤120, email text not null ≤254, phone null ≤30, preferred_locale …)`; trigger: si `profile_id` no es null, `user_has_role(profile_id,'guardian')` o `P0001 'forbidden'`.
  - `student_guardians(student_id fk on delete cascade, guardian_id fk guardians on delete cascade, relationship text check in ('parent','legal_guardian','other'), is_primary bool default true, unique (student_id, guardian_id))`.
  - `consent_texts(id text pk check ~ '^[a-z_]+-v[0-9]+$', kind consent_kind, body_es text not null, body_en text not null, effective_from date not null, created_at, unique (id, kind))`; sin políticas de update/delete.
  - `consents(student_id fk, guardian_id null fk guardians, text_id text, kind consent_kind, granted boolean not null, method consent_method not null, recorded_by uuid default auth.uid(), recorded_at timestamptz default now())`; FK `(text_id, kind) references consent_texts (id, kind)`; append-only con `reject_mutation()`; para un menor, `guardian_id` obligatorio (trigger → `guardian_required`).
  - `public.current_student_ids() returns setof uuid`, `public.guarded_student_ids() returns setof uuid`, `public.can_view_student(p_student_id uuid) returns boolean` (admin, propio o tutor; Task 13 añade docente), `public.has_current_consent(p_student_id uuid, p_kind consent_kind) returns boolean` (último registro por `recorded_at` con `granted`; interna).
  - `public.create_student(p_payload jsonb) returns uuid` (admin; inserta en una transacción `students`, `student_private` y, si `audience = 'kids'`, `guardians` nuevo o existente por `guardian.id`, `student_guardians` y `consents` de `minor_data`; errores `guardian_required`, `consent_required`). Claves de `p_payload`: `full_name, audience, level_id, preferred_locale, email, phone, birth_year, admin_notes, guardian: { id | full_name, email, phone, relationship }, consent: { text_id, method }`.

- [ ] **Step 1: Test** `student reads only own students row`, `student reads own student_private but not others`, `guardian reads own minors and their consents only`, `guardian cannot read another guardian's minor`, `teacher cannot read student_private, guardians or consents`, `anon reads nothing`, `a minor with a profile_id is rejected`, `create_student for a minor without guardian raises guardian_required`, `create_student for a minor without consent raises consent_required`, `create_student for a minor writes student, guardian link and consent atomically`, `teacher cannot execute create_student (42501)`, `consents cannot be updated or deleted, even by admin`, `a consent whose kind differs from its text kind is rejected`, `linking a guardian profile without guardian role is rejected`, `has_current_consent follows the latest record (revocation wins)`.
- [ ] **Step 2:** Run `pnpm supabase test db` · Expected: FAIL.
- [ ] **Step 3:** Escribir `0009_people.sql` y el seed. El seed crea usuarios con `raw_app_meta_data` que incluye `initial_role` y llama a `create_student` tras `select set_config('request.jwt.claims', '{"sub":"<admin>","role":"authenticated"}', true)`.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db && pnpm db:types` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): alumnos, tutores y consentimientos`.

### Task 8: Alta de cuentas por la administradora y página de docentes

**Files:**
- Create: `apps/app/src/lib/supabase/admin.ts`, `apps/app/src/lib/people/provision.ts`, `apps/app/src/lib/people/provision.test.ts`, `apps/app/src/lib/schemas/people.ts`, `apps/app/src/lib/schemas/people.test.ts`, `apps/app/src/lib/data/people.ts`, `apps/app/src/app/[locale]/(shell)/admin/teachers/{page.tsx,new/page.tsx,actions.ts}`, `apps/app/e2e/admin-teachers.spec.ts`
- Modify: `apps/app/src/lib/nav.ts` (+ test), `apps/app/src/components/Sidebar.tsx` (ítem sin ruta como `<span aria-disabled="true">`, no `role="link"`), `apps/app/messages/{es,en}.json`

**Interfaces:**
- Produces:
  - `createAdminClient(): SupabaseClient<Database>` (`import "server-only"`; lee `SUPABASE_SERVICE_ROLE_KEY`; lanza si falta). Solo lo importa `provision.ts`.
  - `provisionAccount(input: { email: string; fullName: string; initialRole: "teacher" | "student" | "guardian"; locale: Locale }, deps?: { admin?: SupabaseClient<Database>; auth?: SupabaseClient<Database>; siteUrl?: string }): Promise<ProvisionResult>`; `type ProvisionResult = { ok: true; userId: string } | { ok: false; error: "exists" | "invalid" | "unavailable" }`. Hace `admin.auth.admin.createUser({ email, email_confirm: true, app_metadata: { initial_role }, user_metadata: { full_name } })` y después `auth.resetPasswordForEmail(email, { redirectTo: <site>/<locale>/reset-password })`.
  - `inviteTeacherSchema = z.object({ email: z.email().max(254), fullName: z.string().trim().min(1).max(120), locale: z.enum(["es","en"]) })`.
  - Acciones: `inviteTeacher(prev, formData)`, `setAccountSuspended(prev, formData)` (`userId`, `suspended: "true" | "false"`; error `last_admin` traducido).
  - `listStaff(supabase): Promise<{ id: string; fullName: string | null; email: string | null; roles: AppRole[]; status: UserStatus }[]>`.
  - Nav admin: `dashboard`, `calendar`, `groups`, `students`, `teachers`, `leads`, `requests`, `catalog`, `languages`; docente: `today`, `groups`, `requests`. `NavIcon` ampliado con `calendar`, `leads`, `requests`, `catalog`. Cada tarea UI posterior activa el `href` de su ítem.
- Ruta: `/[locale]/admin/teachers`, `/[locale]/admin/teachers/new`.

- [ ] **Step 1: Test** Vitest: `provisionAccount puts initial_role in app_metadata and never in user_metadata`, `maps email_exists to 'exists'`, `sends the reset email to /<locale>/reset-password`, `returns 'unavailable' when the service key is missing`; `inviteTeacherSchema rejects an empty name`; nav: `teachers item has a route`, `items without route render as aria-disabled span`. e2e: `admin invites a teacher who sets a password and lands on /es/teacher` (token con `generateLink`), `suspending the only admin shows the last-admin message`, `teacher cannot open /es/admin/teachers`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app test` y `e2e admin-teachers` · Expected: FAIL.
- [ ] **Step 3:** Implementar. La acción comprueba `requireArea(locale, "admin")` ANTES de tocar `createAdminClient()`.
- [ ] **Step 4:** Run ambos · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): alta de docentes y suspensión de cuentas`.

### Task 9: Catálogo en la app: sedes, programas y ediciones

**Files:**
- Create: `apps/app/src/lib/schemas/catalog.ts`, `apps/app/src/lib/schemas/catalog.test.ts`, `apps/app/src/lib/data/catalog.ts`, `apps/app/src/app/[locale]/(shell)/admin/catalog/{page.tsx,locations/page.tsx,locations/actions.ts,programs/page.tsx,programs/new/page.tsx,programs/[programId]/page.tsx,programs/actions.ts}`, `apps/app/e2e/admin-catalog.spec.ts`
- Modify: `apps/app/src/lib/nav.ts` (`catalog`), `apps/app/messages/{es,en}.json` (`catalog.*`, `enums.audience.*`, `enums.format.*`, `enums.locationKind.*`, `enums.editionStatus.*`)

**Interfaces:**
- Consumes: `parseForm`, `ActionState`, `toDomainError` (Task 4); tablas de Task 6.
- Produces: `locationSchema`, `programSchema`, `editionSchema` (zod, con `.superRefine` para dirección en `home`/`online` y `endsOn >= startsOn`); `listLocations(supabase)`, `listPrograms(supabase, filter?: { active?: boolean })`, `getProgram(supabase, id): Promise<ProgramWithEditions | null>`; acciones `saveLocation`, `saveProgram`, `saveEdition`.
- Rutas: `/[locale]/admin/catalog` (resumen con enlaces), `/admin/catalog/locations`, `/admin/catalog/programs`, `/admin/catalog/programs/new`, `/admin/catalog/programs/[programId]` (datos + ediciones).

- [ ] **Step 1: Test** `locationSchema rejects an address for a home location`, `programSchema rejects code 'Adults A1'`, `programSchema requires both names`, `editionSchema rejects an end before the start`. e2e: `admin creates a location and a program with an edition in both languages`, `the /en catalog shows English enum labels`, `catalog pages have no axe violations`.
- [ ] **Step 2:** Run tests · Expected: FAIL.
- [ ] **Step 3:** Implementar páginas (tabla en escritorio, lista en móvil) y acciones.
- [ ] **Step 4:** Run tests · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): catálogo de sedes, programas y ediciones`.

### Task 10: Precios por programa, edición y sede

**Files:**
- Create: `apps/app/src/lib/pricing.ts`, `apps/app/src/lib/pricing.test.ts`, `apps/app/src/app/[locale]/(shell)/admin/catalog/programs/[programId]/PricesSection.tsx`
- Modify: `apps/app/src/lib/schemas/catalog.ts` (+test), `apps/app/src/app/[locale]/(shell)/admin/catalog/programs/actions.ts`, `apps/app/e2e/admin-catalog.spec.ts`, mensajes

**Interfaces:**
- Produces: `type PriceRow = Tables<"program_prices">`; `resolvePrices(prices: PriceRow[], ctx: { programId: string; editionId: string | null; locationId: string | null }): PriceRow[]` → una por `(kind, lessons_included)`, la más específica entre las activas que encajan (edición+sede > edición > sede > programa); `priceSchema` (importe con `parseAudToCents`); acciones `savePrice`, `deactivatePrice`.

- [ ] **Step 1: Test** `edition+location price beats edition price`, `a location price never applies to another location`, `inactive prices are ignored`, `returns one price per kind and lessons_included`, `priceSchema rejects 'pack' without lessons`. e2e: `admin adds a 10-lesson pack price and a location-specific per-lesson price`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Implementar `resolvePrices` (sin acceso a BD) y la sección de precios con `formatAud`.
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): precios por programa, edición y sede`.

### Task 11: Alumnos, tutores y consentimientos en la app

**Files:**
- Create: `apps/app/src/app/[locale]/(shell)/admin/students/{page.tsx,new/page.tsx,new/StudentForm.tsx,[studentId]/page.tsx,actions.ts}`, `apps/app/src/app/[locale]/(shell)/admin/settings/consent-texts/{page.tsx,actions.ts}`, `apps/app/e2e/admin-students.spec.ts`
- Modify: `apps/app/src/lib/schemas/people.ts` (+test), `apps/app/src/lib/data/people.ts`, `apps/app/src/lib/nav.ts` (`students`), mensajes (`students.*`, `consents.*`)

**Interfaces:**
- Consumes: `create_student(jsonb)` (Task 7), `provisionAccount` (Task 8).
- Produces: `studentSchema = z.discriminatedUnion("audience", [adultLike("adults"), adultLike("mature"), kidSchema])` donde `kidSchema` exige `guardian` (existente por id o nuevo) y `consentTextId` + `consentMethod`; `consentTextSchema`; `listStudents(supabase, q?: { search?: string; audience?: AudienceSegment; status?: StudentStatus })`, `getStudentDetail(supabase, id): Promise<StudentDetail | null>` (alumno, privado, tutores, consentimientos, matrículas y packs cuando existan); acciones `createStudent`, `updateStudent`, `grantPortalAccess` (adulto: `provisionAccount` con `student` y después `update students set profile_id`), `recordConsent`, `createConsentText`.
- Rutas: `/admin/students`, `/admin/students/new`, `/admin/students/[studentId]`, `/admin/settings/consent-texts`. El formulario de menor muestra el texto del consentimiento (versión vigente del idioma de la interfaz) antes de la casilla.

- [ ] **Step 1: Test** `kidSchema requires a guardian email`, `kidSchema requires a consent text`, `adult schema ignores guardian fields`. e2e: `admin registers a minor with a new guardian and the consent shows its text version and date`, `admin registers an adult and grants portal access`, `search by name filters the list`, `a student id that does not exist returns 404`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Implementar; la ficha separa "Datos", "Contacto (solo administración)", "Tutores", "Consentimientos".
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): alumnos, tutores y consentimientos`. Abrir PR "1B-2".

---

## Fase 3. Grupos, calendario y matrículas (PR "1B-3")

### Task 12: Grupos, reglas de repetición, cierres y sesiones (0010)

**Files:**
- Create: `supabase/migrations/0010_groups_calendar.sql`, `supabase/tests/database/groups_calendar.test.sql`
- Modify: `supabase/seed.sql` (grupo A de `teacher`, grupo B de `teacher2`, regla semanal, sesiones generadas 8 semanas, y una sesión manual `starts_at = date_trunc('minute', now()) - interval '10 minutes'` en A para las pruebas de "Hoy"), `packages/db/src/database.types.ts`

**Interfaces:**
- Produces (SQL):
  - Enums: `group_status ('draft','active','completed','cancelled')`, `session_status ('scheduled','completed','cancelled')`, `session_kind ('regular','makeup','extra')`.
  - `groups(code text unique check ~ '^[A-Z0-9-]{3,30}$', name text not null ≤120, program_id fk, edition_id null, teacher_id uuid not null fk profiles, location_id fk locations not null, location_note text null ≤300, meeting_url text null check ~ '^https://', format lesson_format not null, capacity smallint not null, level_id null, status group_status default 'draft', is_public bool default false, …)`; FK `(edition_id, program_id)`; `check ((format = 'individual' and capacity = 1) or (format = 'own_group' and capacity between 1 and 2) or (format = 'local_group' and capacity between 1 and 20))`.
  - `schedule_rules(group_id fk on delete cascade, weekday smallint check 1..7 (ISO), start_time time not null, duration_minutes smallint check 15..240, interval_weeks smallint default 1 check 1..4, starts_on date not null, ends_on date null, active bool default true)`; `check (ends_on is null or ends_on >= starts_on)`.
  - `closures(starts_on date, ends_on date, location_id null fk, reason_es, reason_en text ≤200)`.
  - `sessions(group_id fk, rule_id null fk schedule_rules on delete set null, starts_at timestamptz, ends_at timestamptz, teacher_id uuid not null fk profiles, location_id null, meeting_url null, status session_status default 'scheduled', kind session_kind default 'regular', makeup_for_session_id null fk sessions, is_manual bool default false, cancel_reason text null ≤300, cancelled_by uuid null, cancelled_at timestamptz null, topic text null ≤200, teacher_notes text null ≤2000, …)`; `constraint sessions_group_starts_unique unique (group_id, starts_at)`; `check (ends_at > starts_at and ends_at <= starts_at + interval '6 hours')`; índices `(teacher_id, starts_at)`, `(starts_at)`.
  - `session_guests(session_id fk on delete cascade, student_id fk, reason text check in ('makeup','extra'), makeup_for_session_id null, unique (session_id, student_id))`.
  - Triggers `groups_guard()` y `sessions_guard()` (`security definer`): `teacher_id` debe tener rol `teacher` (`user_has_role`) o `teacher_required`.
  - `public.school_today() returns date` (`(now() at time zone 'Australia/Brisbane')::date`), `public.school_ts(p_date date, p_time time) returns timestamptz` (`(p_date + p_time) at time zone 'Australia/Brisbane'`, `immutable`).
  - `public.teaches_group(p_group_id uuid) returns boolean` (rol teacher y `groups.teacher_id = auth.uid()` o alguna sesión del grupo con `teacher_id = auth.uid()`), `public.teaches_session(p_session_id uuid) returns boolean` (sesión asignada o grupo propio).
  - `public.generate_sessions(p_group_id uuid, p_until date) returns integer` (admin; ver algoritmo).
  - `public.replan_sessions(p_group_id uuid, p_until date) returns table (removed integer, added integer)` (admin; borra sesiones futuras con `rule_id` no nulo, `status = 'scheduled'`, `kind = 'regular'`, `is_manual = false` y sin asistencia — la condición de asistencia se añade en Task 17 con `create or replace` —, y después genera).
  - Políticas: admin todo; docente lectura de grupos/reglas/sesiones/invitados vía `teaches_group`/`teaches_session`. Las de alumno y tutor llegan en Task 13.
- Algoritmo de `generate_sessions` (no lo fija la firma):
  1. Exige `has_role('admin')`; grupo en `draft` o `active` (si no, `group_closed`); `p_until <= school_today() + 366` (si no, `horizon_too_far`).
  2. Para cada regla activa: primer día `d >= greatest(rule.starts_on, school_today())` con `isodow(d) = weekday`; luego `d += 7 * interval_weeks` mientras `d <= least(p_until, coalesce(rule.ends_on, p_until), coalesce(edition.ends_on, p_until))`.
  3. Salta `d` si existe un cierre con `d between starts_on and ends_on` y (`location_id is null` o `= groups.location_id`).
  4. Inserta `(group_id, rule_id, school_ts(d, start_time), + duration, groups.teacher_id)` con `on conflict on constraint sessions_group_starts_unique do nothing`; devuelve el número insertado.

- [ ] **Step 1: Test** `admin generates weekly sessions until the edition end`, `a 18:00 Brisbane rule produces 08:00 UTC starts_at in July and in December`, `interval_weeks 2 generates every other week`, `generation skips a global closure and a closure of the group's location only`, `generation never creates sessions before today`, `running generate twice inserts nothing the second time`, `generate beyond one year raises horizon_too_far`, `generate on a cancelled group raises group_closed`, `teacher cannot execute generate_sessions (42501)`, `replan keeps manual and cancelled sessions`, `a group with a non-teacher teacher_id raises teacher_required`, `own_group with capacity 3 is rejected`, `teacher1 reads G1 and its sessions but not G2`, `a substitute teacher assigned to one G2 session reads that session and G2`, `student and guardian read no groups yet`, `anon reads nothing`.
- [ ] **Step 2:** Run `pnpm supabase test db` · Expected: FAIL.
- [ ] **Step 3:** Escribir `0010_groups_calendar.sql` y el seed (las llamadas a `generate_sessions` del seed van con claims de admin, como en Task 7).
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db && pnpm db:types` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): grupos, reglas de repetición, cierres y sesiones`.

### Task 13: Matrículas, cupo y lista de espera (0011)

**Files:**
- Create: `supabase/migrations/0011_enrollments.sql`, `supabase/tests/database/enrollments.test.sql`
- Modify: `supabase/seed.sql` ("Student Local" en A con `billing_mode = 'pack'`, "Kid Local" en A `upfront`, "Student Two" en B `payg`), `packages/db/src/database.types.ts`

**Interfaces:**
- Produces (SQL):
  - Enums: `enrollment_status ('pending','active','paused','completed','cancelled')`, `billing_mode ('upfront','pack','payg','free')`, `waitlist_status ('waiting','offered','enrolled','withdrawn')`.
  - `enrollments(student_id fk, group_id fk, status enrollment_status default 'active', billing_mode billing_mode not null, price_id null fk program_prices, agreed_amount_cents integer null check >= 0, starts_on date not null default public.school_today(), ends_on date null, cancelled_at timestamptz null, notes text null ≤1000, …)`; índice único `enrollments_seat_unique (student_id, group_id) where status in ('pending','active','paused')`; índices `(group_id)`, `(student_id)`.
  - `waitlist_entries(group_id fk, student_id uuid not null fk, status waitlist_status default 'waiting', offered_at timestamptz null, note text null ≤500, …)`; índice único `(group_id, student_id) where status in ('waiting','offered')`. (Task 22 añade `lead_id`.)
  - `public.enrollments_guard() returns trigger` (`security definer`, BEFORE INSERT OR UPDATE OF `status, group_id, student_id`): bloquea el grupo con `select … for update`; grupo `draft|active` o `group_closed`; alumno `active` o `student_inactive`; si la fila pasa a ocupar plaza (`pending|active|paused`) y las plazas ocupadas (excluida ella) ≥ `capacity` → `group_full`; si el alumno es menor: al menos un `student_guardians` (`guardian_required`) y `has_current_consent(student_id, 'minor_data')` (`consent_required`).
  - `public.taught_student_ids() returns setof uuid` (matrícula no cancelada en grupos con `teaches_group` + invitados de `teaches_session`), `public.my_group_ids() returns setof uuid` (grupos con matrícula no cancelada de `current_student_ids()` ∪ `guarded_student_ids()`).
  - `can_view_student` reemplazada: añade `p_student_id in (select taught_student_ids())`.
  - Políticas nuevas: `students` lectura docente; `groups`, `sessions`, `session_guests` lectura de alumno/tutor vía `my_group_ids()` y propias; `enrollments` y `waitlist_entries` según la matriz.

- [ ] **Step 1: Test** `admin enrolls S1 into G1`, `enrolling beyond capacity raises group_full`, `a paused enrollment still holds a seat`, `cancelling frees the seat for the next enrollment`, `a second active enrollment of the same student in the same group raises 23505 on enrollments_seat_unique`, `enrolling a minor without a current minor_data consent raises consent_required`, `enrolling a minor whose consent was revoked raises consent_required`, `enrolling into a completed group raises group_closed`, `enrolling an inactive student raises student_inactive`, `teacher1 reads S1 and K1 but not S2`, `teacher1 reads enrollments of G1 only`, `student1 reads own enrollment, G1 and its sessions but not G2`, `guardian1 reads K1's enrollment, G1 and its sessions`, `guardian1 cannot read S1`, `teacher cannot insert enrollments`, `waitlist: a student cannot be waiting twice in the same group`, `student reads own waitlist entry only`, `anon reads nothing`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Escribir `0011_enrollments.sql` y el seed.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db && pnpm db:types` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): matrículas con cupo, consentimiento de menores y lista de espera`.

### Task 14: Grupos y horarios en la app de administración

**Files:**
- Create: `apps/app/src/lib/schemas/groups.ts`, `apps/app/src/lib/schemas/groups.test.ts`, `apps/app/src/lib/data/groups.ts`, `apps/app/src/lib/data/sessions.ts`, `apps/app/src/components/SessionList.tsx`, `apps/app/src/app/[locale]/(shell)/admin/groups/{page.tsx,new/page.tsx,[groupId]/page.tsx,[groupId]/sessions/page.tsx,actions.ts}`, `apps/app/e2e/admin-groups.spec.ts`
- Modify: `apps/app/src/lib/nav.ts` (`groups`), mensajes (`groups.*`, `enums.groupStatus.*`, `enums.sessionStatus.*`, `enums.weekday.*`)

**Interfaces:**
- Consumes: `generate_sessions`, `replan_sessions` (Task 12); `formatSessionTime`, `schoolToday` (Task 4).
- Produces: `groupSchema` (`.superRefine`: capacidad según formato, `meetingUrl` https), `scheduleRuleSchema` (`weekday 1..7`, `startTime "HH:MM"`, `durationMinutes 15..240`, `intervalWeeks 1..4`, `startsOn`, `endsOn?`), `generateSchema = z.object({ groupId: z.uuid(), until: isoDate })`; `listGroups(supabase, q?: { status?: GroupStatus; teacherId?: string; programId?: string })`, `getGroup(supabase, id): Promise<GroupDetail | null>`, `listGroupSessions(supabase, groupId, range: { from: string; to: string })`; acciones `saveGroup`, `saveScheduleRule`, `deactivateScheduleRule`, `generateGroupSessions`, `replanGroupSessions`; `SessionList({ sessions, locale, hrefFor })` (agrupada por día de Brisbane).
- Rutas: `/admin/groups`, `/admin/groups/new`, `/admin/groups/[groupId]` (datos, horario, generar), `/admin/groups/[groupId]/sessions`.

- [ ] **Step 1: Test** `groupSchema forces capacity 1 for individual`, `groupSchema rejects own_group with capacity 3`, `groupSchema rejects an http meeting url`, `scheduleRuleSchema rejects '25:00'`. e2e: `admin creates a group with a weekly rule and generates sessions until the edition end`, `generated sessions show Brisbane times`, `generating twice reports 0 new sessions`, `changing the rule and replanning keeps sessions marked as manual`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): grupos, horarios y generación de sesiones`.

### Task 15: Matrículas y lista de espera en la app

**Files:**
- Create: `apps/app/src/lib/schemas/enrollments.ts`, `apps/app/src/lib/schemas/enrollments.test.ts`, `apps/app/src/lib/data/enrollments.ts`, `apps/app/src/app/[locale]/(shell)/admin/groups/[groupId]/enrollments/{page.tsx,actions.ts}`, `apps/app/e2e/admin-enrollments.spec.ts`
- Modify: `apps/app/src/app/[locale]/(shell)/admin/students/[studentId]/page.tsx` (sección "Matrículas"), mensajes (`enrollments.*`, `waitlist.*`, `enums.billingMode.*`, `enums.enrollmentStatus.*`)

**Interfaces:**
- Consumes: `resolvePrices` (Task 10), `toDomainError`.
- Produces: `enrollmentSchema = z.object({ groupId: z.uuid(), studentId: z.uuid(), billingMode: z.enum(["upfront","pack","payg","free"]), priceId: z.uuid().optional(), agreedAmount: audString.optional(), startsOn: isoDate })`; `waitlistSchema`; `listGroupEnrollments(supabase, groupId)`, `listGroupWaitlist(supabase, groupId)`; acciones `enrollStudent` (si el error es `group_full`, devuelve `{ status: "error", error: "group_full" }` y la UI ofrece "Añadir a la lista de espera"), `changeEnrollmentStatus`, `addToWaitlist`, `updateWaitlistEntry` (`offered`/`withdrawn`), `enrollFromWaitlist` (matricula y marca la entrada `enrolled`).
- UI: el precio por defecto es el de `resolvePrices` según edición y sede del grupo; la administradora puede cambiarlo (se guarda como `agreed_amount_cents`). Indicador "plazas: ocupadas/capacidad".

- [ ] **Step 1: Test** `enrollmentSchema requires a price or amount only for upfront and pack`, `enrollmentSchema rejects a negative amount`. e2e: `enrolling into a full group shows 'Grupo completo' and offers the waitlist`, `enrolling a minor without consent shows the consent message`, `admin enrolls the first waitlisted student after a seat is freed`, `the default price follows the group's location`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): matrículas y lista de espera`.

### Task 16: Calendario semanal y cierres

**Files:**
- Create: `apps/app/src/app/[locale]/(shell)/admin/calendar/{page.tsx,closures/page.tsx,closures/actions.ts}`, `apps/app/e2e/admin-calendar.spec.ts`
- Modify: `apps/app/src/lib/data/sessions.ts` (`listSessionsInRange`), `apps/app/src/lib/nav.ts` (`calendar`), `apps/app/src/components/LocaleSwitch.tsx` (conserva la query: `?week=` y filtros; pendiente de 1A), mensajes (`calendar.*`)

**Interfaces:**
- Consumes: `weekStart`, `addDays`, `schoolDayRange`, `SessionList`.
- Produces: `listSessionsInRange(supabase, range: { from: string; to: string }, filter?: { teacherId?: string; locationId?: string }): Promise<SessionWithGroup[]>`; `closureSchema`; acciones `saveClosure`, `deleteClosure`.
- Ruta: `/admin/calendar?week=YYYY-MM-DD&teacher=<uuid>&location=<uuid>` (agenda por días de lunes a domingo; sin librería de calendario), `/admin/calendar/closures`.

- [ ] **Step 1: Test** Vitest (LocaleSwitch): `LocaleSwitch keeps the query string`. e2e: `calendar week groups sessions by Brisbane day and navigates to the next week`, `filtering by teacher hides other teachers' sessions`, `a closure added before generating skips that date`, `switching locale keeps ?week`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): calendario semanal y cierres`. Abrir PR "1B-3".

---

## Fase 4. Clases y asistencia (PR "1B-4")

### Task 17: Asistencia y créditos (0012)

**Files:**
- Create: `supabase/migrations/0012_attendance_credits.sql`, `supabase/tests/database/attendance_credits.test.sql`
- Modify: `supabase/seed.sql` (pack de 10 clases para "Student Local"), `packages/db/src/database.types.ts`

**Interfaces:**
- Produces (SQL):
  - Enums: `attendance_status ('present','late','absent','excused')`, `credit_reason ('attendance','attendance_reversal','adjustment')`.
  - `attendance(session_id fk on delete cascade, student_id fk, status attendance_status not null, charge_status text not null default 'not_applicable' check in ('not_applicable','charged','uncovered'), credit_pack_id uuid null fk credit_packs, note text null ≤500, marked_by uuid default auth.uid(), marked_at timestamptz default now(), unique (session_id, student_id))`.
  - `credit_packs(student_id fk, program_id null fk, lessons_total smallint check 1..100, starts_on date default school_today(), expires_on date null, price_id null fk, amount_cents integer null check >= 0, note text null, voided_at timestamptz null, voided_reason text null, …)`; `check (expires_on is null or expires_on >= starts_on)`.
  - `credit_movements(pack_id fk, student_id fk, delta smallint not null check (delta <> 0 and delta between -100 and 100), reason credit_reason not null, attendance_id uuid null references attendance (id) on delete set null deferrable initially deferred, note text null ≤300, created_by uuid default auth.uid(), created_at)`; append-only (`reject_mutation`); política de insert admin solo con `reason = 'adjustment'`.
  - Vista `credit_pack_balances` (`security_invoker = true`): `pack_id, student_id, program_id, lessons_total, used, remaining, starts_on, expires_on, is_expired, voided_at`.
  - `public.student_credit_balance(p_student_id uuid) returns integer` (`security invoker`; suma `remaining` de packs no anulados ni caducados).
  - `public.attendance_before_write() returns trigger` (`security definer`, BEFORE INSERT OR UPDATE OF `status`): (a) sesión no `cancelled` o `session_not_editable`; (b) si quien llama no es admin (`current_user = 'authenticated'` y no `user_has_role(auth.uid(),'admin')`): `now()` entre `starts_at - 30 min` y `starts_at + 14 días` o `outside_attendance_window`; (c) el alumno está en la lista (`session_roster`) o `not_in_roster`; (d) cobro según la regla de abajo.
  - `public.attendance_after_write() returns trigger` (AFTER INSERT/UPDATE): sesión `scheduled` → `completed`. `public.attendance_after_delete()` (AFTER DELETE): si estaba `charged`, inserta `+1 attendance_reversal`.
  - `public.session_roster(p_session_id uuid) returns table (student_id uuid, full_name text, source text, attendance_id uuid, status attendance_status, charge_status text)` (`security invoker`): si la sesión tiene `session_guests` de tipo `makeup` y es `kind = 'makeup'`, solo esos invitados; si no, matrículas `pending|active|paused|completed` con `starts_on <= día` y (`ends_on` null o `>= día`) más invitados.
  - `public.mark_all_present(p_session_id uuid) returns integer` (`security invoker`; inserta `present` para la lista sin marca; devuelve cuántas).
  - `replan_sessions` reemplazada: no borra sesiones con asistencia.
- Regla de cobro (en `attendance_before_write`, no la fija la firma):
  - Cobrable = `status in ('present','late','absent')` y matrícula del alumno en el grupo con `billing_mode = 'pack'`; los invitados `makeup` nunca se cobran; los `extra` se cobran si el alumno tiene pack.
  - Pasa a cobrable sin cargo previo: busca con `for update` el pack del alumno no anulado, con `starts_on <= día`, no caducado en el día, `remaining > 0` y (`program_id` null o = programa del grupo), ordenado por `expires_on nulls last, created_at`; inserta `-1 attendance` y pone `charge_status = 'charged'`, `credit_pack_id`. Sin pack → `charge_status = 'uncovered'`, sin movimiento (no se bloquea la asistencia).
  - Deja de ser cobrable con cargo previo: inserta `+1 attendance_reversal` en `old.credit_pack_id`; `charge_status = 'not_applicable'`, `credit_pack_id = null`.
  - Cambia entre estados cobrables: no hace nada.

- [ ] **Step 1: Test** `teacher1 marks S1 present in G1's current session and one credit is used`, `present -> excused -> present leaves exactly one net charge`, `deleting a charged attendance reverses the credit`, `a student without a pack is marked uncovered and the attendance is saved`, `an expired pack is not used`, `the pack expiring first is used first`, `upfront and payg enrollments are never charged`, `a makeup guest is never charged`, `teacher cannot mark attendance 31 minutes before the start`, `teacher cannot mark attendance 15 days after the session`, `admin can mark attendance outside the window`, `marking a student who is not in the roster raises not_in_roster`, `marking a cancelled session raises session_not_editable`, `teacher2 cannot insert attendance in G1 (RLS)`, `marking attendance completes the session`, `mark_all_present marks only unmarked students`, `student1 reads own attendance and pack balance only`, `guardian1 reads K1's attendance`, `credit_movements cannot be updated or deleted`, `admin can insert an adjustment but not an attendance movement`, `replan keeps sessions with attendance`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Escribir `0012_attendance_credits.sql` y el seed.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db && pnpm db:types` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): asistencia y créditos de packs`.

### Task 18: Operaciones de sesión y solicitudes de cambio (0013)

**Files:**
- Create: `supabase/migrations/0013_session_ops_requests.sql`, `supabase/tests/database/session_ops.test.sql`
- Modify: `packages/db/src/database.types.ts`

**Interfaces:**
- Produces (SQL; todas `security definer`, autorizan con `has_role('admin') or teaches_session(...)`, si no `forbidden`):
  - `public.cancel_session(p_session_id uuid, p_reason text) returns void`: `scheduled` o `session_not_editable`; sin filas de asistencia o `session_has_attendance`; motivo 1..300 o `invalid_range`.
  - `public.reschedule_session(p_session_id uuid, p_starts_at timestamptz, p_ends_at timestamptz) returns void`: `scheduled`, sin asistencia; la docente solo a futuro (`p_starts_at > now()`); `is_manual = true`; choque → `slot_taken`.
  - `public.create_makeup_session(p_for_session_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_student_ids uuid[] default null) returns uuid`: misma grupo, `kind = 'makeup'`, `makeup_for_session_id`, `teacher_id` = quien llama si es docente, si no el de la original; con `p_student_ids`, crea `session_guests (reason 'makeup')` y cada alumno debe tener matrícula en el grupo (`not_in_roster`).
  - `public.set_session_notes(p_session_id uuid, p_topic text, p_notes text) returns void`.
  - Enums `change_request_kind ('cancel_attendance','reschedule','makeup','other')`, `request_status ('open','accepted','declined','done')`.
  - `change_requests(student_id fk, group_id fk, session_id null fk, kind change_request_kind, message text not null ≤1000, status request_status default 'open', created_by uuid default auth.uid(), created_via text check in ('portal','on_behalf'), resolved_by uuid null, resolved_at timestamptz null, response text null ≤1000, …)`; insert: alumno propio / tutor de menor (con `created_via = 'portal'`) o admin / docente del grupo (`on_behalf`), siempre `status = 'open'` y `created_by = auth.uid()`; update directo solo admin.
  - `public.resolve_change_request(p_request_id uuid, p_status request_status, p_response text) returns void` (admin o `teaches_group(group_id)`; solo desde `open`).

- [ ] **Step 1: Test** `teacher1 cancels a future G1 session with a reason`, `teacher1 cannot cancel a G2 session (forbidden)`, `cancelling a session with attendance raises session_has_attendance`, `cancelling an already cancelled session raises session_not_editable`, `teacher cannot reschedule into the past`, `rescheduling onto another session's start raises 23505 mapped as slot_taken`, `reschedule marks the session as manual`, `create_makeup_session for one student creates a makeup session with that guest only`, `a makeup for a student not enrolled in the group raises not_in_roster`, `student1 creates a change request for own G1 session`, `student1 cannot create a request for S2`, `guardian1 creates a request for K1`, `teacher1 resolves a G1 request and teacher2 cannot`, `a resolved request cannot be resolved again`, `anon cannot execute any session RPC`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Escribir `0013_session_ops_requests.sql`.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db && pnpm db:types` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): cancelar, mover y recuperar sesiones; solicitudes de cambio`.

### Task 19: Docente: "Hoy" y asistencia en un clic (móvil primero)

**Files:**
- Create: `apps/app/src/app/[locale]/(shell)/teacher/sessions/[sessionId]/{page.tsx,actions.ts,AttendanceList.tsx}`, `apps/app/src/components/SessionCard.tsx`, `apps/app/src/lib/schemas/attendance.ts`, `apps/app/src/lib/schemas/attendance.test.ts`, `apps/app/src/lib/data/attendance.ts`, `apps/app/src/components/attendance.test.tsx`, `apps/app/e2e/teacher-attendance.spec.ts`
- Modify: `apps/app/src/app/[locale]/(shell)/teacher/page.tsx` (deja `AreaPage`), `apps/app/src/lib/data/sessions.ts` (`listTeacherSessions`, `getSession`), mensajes (`teacher.*`, `enums.attendanceStatus.*`)

**Interfaces:**
- Consumes: `session_roster`, `mark_all_present` (Task 17), `schoolToday`, `schoolDayRange`, `formatSessionTime` (Task 4).
- Produces: `listTeacherSessions(supabase, teacherId: string, range: { from: string; to: string }): Promise<SessionWithGroup[]>`; `getSession(supabase, id): Promise<SessionDetail | null>`; `getRoster(supabase, sessionId): Promise<RosterRow[]>`; `markAttendanceSchema = z.object({ sessionId: z.uuid(), studentId: z.uuid(), status: z.enum(["present","late","absent","excused"]), note: z.string().max(500).optional() })`; acciones `markAttendance`, `clearAttendance`, `markAllPresent`; `AttendanceList({ roster, sessionId, locale })` (un `radiogroup` por alumno con 4 botones de 44px, estado optimista con `useOptimistic`, error por fila en `aria-live`); `SessionCard({ session, locale, href })`.
- Rutas: `/teacher` (Hoy: sesiones del día de Brisbane del usuario con `teacher_id = user.id`, y "Próximos 7 días"), `/teacher/sessions/[sessionId]` (datos, enlace de clase, lista y "Todos presentes").

- [ ] **Step 1: Test** Vitest: `markAttendanceSchema rejects an unknown status`, `AttendanceList renders one labelled radiogroup per student`, `each option is at least 44px tall (class h-11)`. e2e (viewport 375×812): `teacher sees today's seeded session with its Brisbane time`, `one tap marks a student present and it survives a reload`, `'All present' marks every unmarked student`, `a student without credit shows the 'sin saldo' badge`, `teacher opening another teacher's session gets 404`, `the attendance page has no axe violations on mobile`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Implementar; la página pide la sesión con RLS y llama `notFound()` si es `null` o si `user` no la imparte.
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): hoy de la docente y asistencia en un clic`.

### Task 20: Docente: grupos, cancelar/mover/recuperar y solicitudes (con bandeja de administración)

**Files:**
- Create: `apps/app/src/app/[locale]/(shell)/teacher/groups/{page.tsx,[groupId]/page.tsx}`, `apps/app/src/app/[locale]/(shell)/teacher/requests/{page.tsx,actions.ts}`, `apps/app/src/app/[locale]/(shell)/admin/requests/{page.tsx,actions.ts}`, `apps/app/src/components/requests/RequestList.tsx`, `apps/app/src/lib/schemas/requests.ts`, `apps/app/src/lib/schemas/requests.test.ts`, `apps/app/src/lib/data/requests.ts`, `apps/app/e2e/teacher-session-ops.spec.ts`
- Modify: `apps/app/src/app/[locale]/(shell)/teacher/sessions/[sessionId]/{page.tsx,actions.ts}` (secciones "Cancelar", "Mover", "Recuperación", "Tema y notas"), `apps/app/src/lib/nav.ts` (`groups`, `requests` en docente; `requests` en admin), mensajes (`sessionOps.*`, `requests.*`)

**Interfaces:**
- Consumes: RPC de Task 18.
- Produces: `cancelSessionSchema`, `rescheduleSchema` (`date`, `startTime`, `durationMinutes` → instantes con `schoolDayRange`/offset Brisbane), `makeupSchema` (`studentIds: z.array(z.uuid()).optional()`), `requestSchema`, `resolveRequestSchema`; acciones `cancelSession`, `rescheduleSession`, `createMakeupSession`, `saveSessionNotes`, `createRequestOnBehalf`, `resolveRequest`; `listRequests(supabase, q: { status?: RequestStatus; groupId?: string })`; `RequestList({ requests, canResolve, locale })`.
- Rutas: `/teacher/groups`, `/teacher/groups/[groupId]` (lista de alumnos con nombre, próximas sesiones, resumen de asistencia), `/teacher/requests`, `/admin/requests` (con "Registrar solicitud" en nombre de un alumno).

- [ ] **Step 1: Test** `rescheduleSchema builds 08:00Z for 18:00 Brisbane`, `requestSchema rejects an empty message`. e2e: `teacher cancels a future session with a reason and it shows as cancelled`, `cancel is refused once attendance exists`, `teacher reschedules a session to another day`, `teacher creates a makeup for one student and only that student is in its roster`, `admin registers a request for a student and the group's teacher accepts it`, `teacher2 does not see teacher1's requests`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): operaciones de sesión y solicitudes de cambio`.

### Task 21: Packs de clases en la ficha del alumno

**Files:**
- Create: `apps/app/src/lib/schemas/credits.ts`, `apps/app/src/lib/schemas/credits.test.ts`, `apps/app/src/lib/data/credits.ts`, `apps/app/src/app/[locale]/(shell)/admin/students/[studentId]/CreditsSection.tsx`, `apps/app/e2e/admin-credits.spec.ts`
- Modify: `apps/app/src/app/[locale]/(shell)/admin/students/{[studentId]/page.tsx,actions.ts}`, mensajes (`credits.*`)

**Interfaces:**
- Consumes: `credit_pack_balances`, `credit_movements` (Task 17), `formatAud`, `parseAudToCents`.
- Produces: `packSchema = z.object({ studentId: z.uuid(), lessonsTotal: z.coerce.number().int().min(1).max(100), programId: z.uuid().optional(), startsOn: isoDate, expiresOn: isoDate.optional(), amount: audString.optional(), note: z.string().max(300).optional() })`, `adjustmentSchema` (`delta` entero distinto de 0 entre -20 y 20, `note` obligatoria); `listPacks(supabase, studentId)`, `listMovements(supabase, packId)`; acciones `addPack`, `adjustPack`, `voidPack`.

- [ ] **Step 1: Test** `packSchema rejects 0 lessons`, `adjustmentSchema requires a note`, `expiresOn before startsOn is rejected`. e2e: `admin adds a 10-lesson pack and the balance drops to 9 after the teacher marks attendance`, `an adjustment of +1 with a note shows in the movements`, `a voided pack no longer counts in the balance`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): packs de clases y movimientos`. Abrir PR "1B-4".

---

## Fase 5. Solicitudes de la web (PR "1B-5")

**Decisión de integración (recomendada y planificada):** la web llama, desde su servidor, a `POST {SUPABASE_URL}/rest/v1/rpc/submit_lead` con la clave anon (cabeceras `apikey` y `Authorization: Bearer`) y un `LEADS_INTAKE_TOKEN` que solo conoce el servidor de la web; la base guarda el hash del token y la RPC rechaza (`42501`) sin él. `anon` no tiene privilegios sobre `leads`, solo EXECUTE de esa función. Sin SDK de Supabase en `apps/web` (mismo enfoque que el adaptador de Resend). El email a Maribel se sigue enviando (es el único aviso hasta el hito 2) e indica si la solicitud quedó guardada; si la base falla, el email solo basta. Alternativas descartadas: `service_role` en la web (salta toda la RLS desde la app más expuesta), insert anon con RLS (cualquiera con la clave anon pública salta el antispam de la web), endpoint en `apps/app` (acopla los despliegues y el proxy excluye `/api` del guard).

### Task 22: `leads` y `submit_lead` (0014)

**Files:**
- Create: `supabase/migrations/0014_leads.sql`, `supabase/tests/database/leads.test.sql`
- Modify: `supabase/seed.sql` (hash del token de desarrollo `dev-leads-intake-token`; dos solicitudes de ejemplo), `packages/db/src/database.types.ts`

**Interfaces:**
- Produces (SQL):
  - `create schema private;` sin privilegios para roles de la API; `private.intake_tokens(id uuid pk, label text not null, token_sha256 bytea not null unique, created_at, revoked_at timestamptz null)`.
  - Enums `lead_kind ('free_lesson','contact','phone','other')`, `lead_status ('new','contacted','trial_scheduled','converted','closed','spam','duplicate')`.
  - `leads(kind lead_kind, status lead_status default 'new', full_name text not null ≤100, email text not null ≤254 check (email = lower(email)), phone text null ≤30, audience text null check in ('adults','kids','mature'), place text null check in ('sunshineCoast','brisbane','online','notSure'), teaching_language text null check in ('es','en'), preferred_times text null ≤300, message text null ≤2000, locale text not null check in ('es','en'), consent_version text not null ≤40, consented_at timestamptz not null, source text not null default 'web' check in ('web','admin'), duplicate_of uuid null fk leads, trial_session_id uuid null fk sessions on delete set null, trial_at timestamptz null, converted_student_id uuid null fk students, assigned_to uuid null fk profiles, admin_notes text null ≤2000, …)`; índices `(email)`, `(status, created_at desc)`. RLS: solo admin (RW).
  - `public.submit_lead(p_token text, p_kind text, p_payload jsonb) returns text` (`security definer`; EXECUTE solo a `anon`): token válido no revocado (`extensions.digest(p_token, 'sha256')`) o `42501`; valida tipos y longitudes (mismos máximos que `apps/web/src/lib/booking.ts`/`contact.ts`) y `consent = true` → si no, devuelve `'invalid'`; ≥ 3 solicitudes del mismo email en 24 h o ≥ 200 en total en 24 h → `'rate_limited'` sin insertar; `free_lesson` con otra `free_lesson` previa del mismo email (estado distinto de `spam`) → inserta con `status = 'duplicate'` y `duplicate_of`; devuelve `'stored'`. Claves de `p_payload`: `name, email, phone, audience, place, language ('spanish'|'english'), times, message, locale, consent_version`.
  - `public.convert_lead_to_student(p_lead_id uuid, p_audience audience_segment, p_child_name text default null, p_consent_text_id text default null, p_consent_method consent_method default null) returns uuid` (admin; reutiliza la lógica de `create_student`: adulto → alumno con email/teléfono del lead; `kids` → alumno `p_child_name` con el contacto del lead como tutor nuevo y consentimiento `p_consent_text_id`, si falta → `consent_required`); marca el lead `converted` con `converted_student_id`; si ya estaba convertido → `lead_already_converted`.
  - `public.session_trial_guests(p_session_id uuid) returns table (first_name text)` (admin o `teaches_session`; primer nombre de leads con `trial_session_id = p_session_id`).
  - `alter table waitlist_entries` + `lead_id uuid null fk leads`, `student_id` pasa a nullable, `check (student_id is not null or lead_id is not null)`.

- [ ] **Step 1: Test** `anon with a valid token stores a free_lesson lead`, `anon with a wrong token gets 42501`, `a revoked token gets 42501`, `anon cannot select or insert leads directly`, `authenticated users cannot execute submit_lead`, `a second free_lesson from the same email is stored as duplicate pointing to the first`, `a contact message from the same email is not a duplicate`, `the 4th lead from one email in 24h returns rate_limited and is not stored`, `missing consent returns invalid`, `an over-long message returns invalid`, `'spanish' is stored as teaching_language 'es'`, `only admin reads leads`, `convert_lead_to_student for an adult creates the student and marks the lead converted`, `converting twice raises lead_already_converted`, `converting a kids lead without consent raises consent_required`, `teacher of the trial session sees only the first name via session_trial_guests`, `teacher2 gets no rows from session_trial_guests for G1`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Escribir `0014_leads.sql` y el seed.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db && pnpm db:types` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): solicitudes con admisión por token desde la web`.

### Task 23: `apps/web` guarda las solicitudes en la plataforma (email como respaldo)

**Files:**
- Create: `apps/web/src/lib/lead-store.ts`, `apps/web/src/lib/lead-store.test.ts`, `apps/web/src/lib/lead-intake.ts`, `apps/web/src/lib/lead-intake.test.ts`, `apps/web/src/lib/consent.ts`
- Modify: `apps/web/src/lib/leads.ts` (+ `leads.test.ts`), `apps/web/src/app/[locale]/bookings/actions.ts`, `apps/web/src/app/[locale]/contact-us/actions.ts`, `.env.example` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LEADS_INTAKE_TOKEN`: solo servidor, nunca `NEXT_PUBLIC_`)

**Interfaces:**
- Consumes: `BookingLead`, `ContactLead`, `deliverLead`, `DeliveryResult` (existentes); `submit_lead` (Task 22).
- Produces:
  - `PUBLIC_FORM_CONSENT_VERSION = "web-form-2026-11"` en `consent.ts` (se cambia cuando cambie el texto de consentimiento de los formularios).
  - `toLeadPayload(lead: BookingLead | ContactLead): { kind: "free_lesson" | "contact"; payload: Record<string, string> }` (nunca incluye `website` ni `startedAt`).
  - `storeLead(lead: BookingLead | ContactLead, env?: Env, fetchImpl?: typeof fetch): Promise<StoreResult>`; `type StoreResult = { ok: true } | { ok: false; reason: "not_configured" | "rate_limited" | "rejected" | "failed" }` (timeout 5 s; `'invalid'` → `rejected`).
  - `submitLead(lead: BookingLead | ContactLead, deps?: { store?: typeof storeLead; deliver?: typeof deliverLead }): Promise<DeliveryResult>`: primero `store`; si `rate_limited` → `{ ok: false, reason: "failed" }` sin email; si no, `deliver` con `{ stored: store.ok }`; resultado `ok` si `store.ok || email.ok`; si ambos fallan, la razón del email.
  - `leadEmailText(lead: Lead, opts?: { stored?: boolean }): string` añade "Saved in the platform: yes/no" cuando `opts` existe. `deliverLead(lead, env?, fetchImpl?, opts?)`.
  - Las acciones llaman `submitLead` en lugar de `deliverLead`. El pedido de la tienda (`kind: "order"`) no cambia (hito 3).

- [ ] **Step 1: Test** `storeLead posts to /rest/v1/rpc/submit_lead with apikey, bearer and p_token`, `storeLead returns not_configured without env and makes no request`, `storeLead maps 'rate_limited'`, `storeLead maps a network error to failed`, `toLeadPayload never includes the honeypot or startedAt`, `submitLead is ok when the store works and the email fails`, `submitLead is ok when the store is not configured and the email works`, `submitLead fails when both fail`, `submitLead sends no email when rate_limited`, `the email says whether the lead was saved in the platform`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/web test` · Expected: FAIL.
- [ ] **Step 3:** Implementar sin dependencias nuevas.
- [ ] **Step 4:** Run `pnpm --filter @spanglish/web test && pnpm --filter @spanglish/web e2e` · Expected: PASS (la e2e de la web sigue en modo `LEADS_LOG_ONLY` y sin Supabase: `not_configured` + log).
- [ ] **Step 5:** Commit `feat(web): las solicitudes se guardan en la plataforma con email de respaldo`.

### Task 24: Bandeja de solicitudes de la administradora

**Files:**
- Create: `apps/app/src/lib/schemas/leads.ts`, `apps/app/src/lib/schemas/leads.test.ts`, `apps/app/src/lib/data/leads.ts`, `apps/app/src/app/[locale]/(shell)/admin/leads/{page.tsx,new/page.tsx,[leadId]/page.tsx,actions.ts}`, `apps/app/e2e/admin-leads.spec.ts`
- Modify: `apps/app/src/lib/nav.ts` (`leads`), `apps/app/src/app/[locale]/(shell)/teacher/sessions/[sessionId]/page.tsx` ("Clase de prueba: <nombre>" con `session_trial_guests`), mensajes (`leads.*`, `enums.leadStatus.*`, `enums.leadKind.*`)

**Interfaces:**
- Consumes: `convert_lead_to_student`, `session_trial_guests` (Task 22), `listSessionsInRange` (Task 16).
- Produces: `leadUpdateSchema` (`status`, `adminNotes`, `assignedTo?`), `scheduleTrialSchema` (`sessionId` de una sesión futura o `trialAt`), `convertLeadSchema` (`audience`; si `kids`: `childName`, `consentTextId`, `consentMethod`), `manualLeadSchema` (solicitudes por teléfono, `source = 'admin'`); `listLeads(supabase, q?: { status?: LeadStatus; kind?: LeadKind })`, `getLead(supabase, id)`; acciones `updateLead`, `scheduleTrial`, `convertLead`, `createManualLead`, `addLeadToWaitlist`.
- Rutas: `/admin/leads?status=new`, `/admin/leads/new`, `/admin/leads/[leadId]`.

- [ ] **Step 1: Test** `convertLeadSchema requires a child name and consent for kids`, `scheduleTrialSchema rejects a past date`. e2e: `a lead sent through submit_lead appears in the inbox as new` (la prueba llama a la RPC con `fetch` y el token de desarrollo), `a repeated free lesson shows the 'Repetida' badge linking the original`, `admin schedules the trial in a session and the teacher sees the first name there`, `admin converts a kids lead into a minor with a guardian and consent`, `teacher cannot open /es/admin/leads`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): bandeja de solicitudes y conversión a alumno`. Abrir PR "1B-5".

---

## Fase 6. Panel y cierre (PR "1B-6")

### Task 25: Panel de la administradora

**Files:**
- Create: `supabase/migrations/0015_dashboard.sql`, `supabase/tests/database/dashboard.test.sql`, `apps/app/src/lib/data/dashboard.ts`, `apps/app/src/app/[locale]/(shell)/admin/AdminDashboard.tsx`, `apps/app/e2e/admin-dashboard.spec.ts`
- Modify: `apps/app/src/app/[locale]/(shell)/admin/page.tsx` (deja `AreaPage`), `apps/app/src/app/[locale]/(shell)/area-page.tsx` (solo alumno y tutor), mensajes (`dashboard.*`), `packages/db/src/database.types.ts`

**Interfaces:**
- Produces: `public.admin_dashboard_summary() returns table (active_students bigint, pending_enrollments bigint, new_leads bigint, open_requests bigint, sessions_today bigint, uncovered_attendance bigint, waitlist_waiting bigint, full_groups bigint)` (`security invoker`: lo que la RLS deja ver; el día en Brisbane); `getAdminDashboard(supabase): Promise<{ summary: DashboardSummary; today: SessionWithGroup[]; newLeads: LeadRow[]; openRequests: RequestRow[] }>`. UI sobria: fila de KPIs (cada uno enlaza a su lista filtrada), "Clases de hoy" de todas las docentes, colas "Solicitudes nuevas", "Cambios pedidos", "Asistencias sin saldo". Sin gráficos decorativos.

- [ ] **Step 1: Test** pgTAP `admin summary counts match the fixture`, `teacher calling the summary sees zero leads`, `sessions_today uses the Brisbane day`. e2e: `admin dashboard shows the seeded counts and each KPI links to its filtered list`, `dashboard has no axe violations (desktop and mobile)`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Implementar migración, datos y UI.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db && pnpm db:types && pnpm --filter @spanglish/app e2e admin-dashboard` · Expected: PASS.
- [ ] **Step 5:** Commit `feat: panel de la administradora`.

### Task 26: Aislamiento e2e, documentación y cierre del hito

**Files:**
- Create: `apps/app/e2e/isolation.spec.ts`
- Modify: `apps/app/e2e/shell.spec.ts` (axe de las páginas nuevas), `README.md` (token de admisión: generar, guardar el hash con `insert into private.intake_tokens (label, token_sha256) values ('web-prod', extensions.digest('<token>', 'sha256'))` en el editor SQL, variables de la web; alta de la primera admin por SQL; plantilla `recovery.html` también en el proyecto remoto; mención de que el e2e lee `supabase status`), `docs/superpowers/plans/2026-11-08-pendientes-tras-hito1a.md` (marcar lo hecho y mover lo diferido), `.github/workflows/ci.yml` (la e2e de `apps/web` no necesita Supabase; sin cambios si ya corre en `check`)

**Interfaces:** Consumes todo lo anterior.

- [ ] **Step 1: Test** e2e `teacher2 gets 404 on teacher1's group and session URLs`, `teacher2 posting attendance for a G1 session id gets the forbidden message`, `student and guardian visiting any /es/admin or /es/teacher URL are redirected to their area`, `a suspended teacher loses /es/teacher on the next request`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app e2e isolation` · Expected: PASS (si falla, corregir en la tarea dueña).
- [ ] **Step 3:** Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm supabase db reset && pnpm supabase test db && pnpm --filter @spanglish/app e2e` · Expected: todo verde.
- [ ] **Step 4:** Actualizar README y el documento de pendientes.
- [ ] **Step 5:** Commit `chore: aislamiento e2e y documentación del hito 1B`. Abrir PR "1B-6" y confirmar CI verde.

---

## Pendientes de 1A: dónde quedan

| Pendiente | Destino |
|---|---|
| Privilegios por defecto (`alter default privileges`, funciones) | Task 1 |
| Política única de grants de `service_role` | Task 1 (DML por defecto; `audit_logs` solo lectura) |
| Rol inicial vía `app_metadata` | Task 2 (BD) + Task 8 (alta) |
| Página `/reset-password` | Task 3 |
| Impedir quedarse sin admin | Task 2 |
| Sincronizar `auth.users.email` → `profiles.email` | Task 2 |
| Zona `Australia/Brisbane` en calendario y sesiones | Task 4, 12, 16, 19 |
| Auditoría: UPDATE sin cambios | Task 1 (`enable_audit` con `WHEN`) |
| `row_id` con clave compuesta | Resuelto por convención: toda tabla nueva tiene `id` |
| Nav deshabilitada con `role="link"` | Task 8 |
| `LocaleSwitch` pierde la query | Task 16 (los filtros viven en la query) |
| `service_role` no lee `audit_logs` | Task 1 (se concede `select`) |
| Límite de intentos por IP, `minimum_password_length` remoto, auth remoto, tiempos de login, coste del proxy, privacidad de PLAN/spec | **Diferido a hito 3** (lanzamiento): dependen del proyecto remoto y de Vercel. La app exige 10 caracteres en `/reset-password` (Task 3) mientras tanto. |
| Tests de `apps/web`, focus ring del Button, `audit.test.sql` débil, admin suspendido escribiendo catálogo | **Diferido** (calidad sin urgencia); `apps/web` gana tests en Task 23. |
| TypeScript 7 vs 6, `extends` relativo, `LOCALE_LIKE`, proxy duplicado, seed que depende de `jwt_secret` | **Diferido**: no bloquean 1B; tocar el proxy o el seed fuera de alcance aumenta el riesgo. |
| Menú móvil (foco, reinicio), etiqueta "Pronto" 11px, fuentes del portal, focus amarillo en sidebar | **Diferido** a una pasada de diseño (skill `impeccable`) tras 1B. |
| CI: `cancel-in-progress`, `db reset` redundante | **Diferido** (coste mínimo). |
| Versionar `.agents/`, `.claude/skills/`, `skills-lock.json` | Decisión del propietario; este plan no los toca. |

## Decisiones del planificador

1. **"Curso" del spec = `program_editions`; `groups` es la unidad operativa** (docente, sede, horario, cupo). Por qué: una edición puede tener dos grupos (martes en biblioteca, jueves online). Si es errónea: renombrar en UI; el modelo aguanta.
2. **Una docente titular por grupo (`groups.teacher_id`) y sustituta por sesión (`sessions.teacher_id`).** Por qué: RLS simple y caso real de una escuela pequeña. Coste si se necesitan co-docentes: tabla `group_teachers` y cambiar `teaches_group`.
3. **Alumno ≠ cuenta:** `students.profile_id` opcional; los menores nunca tienen cuenta; contacto, año de nacimiento y notas en `student_private`, invisible para docentes. Por qué: spec §11 y minimización. Coste: si las docentes necesitan el teléfono, una función que lo exponga por grupo.
4. **Tutores como tabla propia con cuenta opcional** (`guardians.profile_id`). Por qué: el portal de tutores es del hito 2, pero hay que guardar tutor y consentimiento ya. Coste bajo.
5. **Consentimientos append-only con `consent_texts` versionados; ningún texto legal en migraciones** (el seed trae uno de desarrollo; la administradora crea los reales). Coste: en producción no se puede matricular a menores hasta que exista un texto.
6. **Créditos:** packs + movimientos append-only; solo consumen matrículas `billing_mode = 'pack'`; cobran `present`, `late` y `absent`, no `excused`; el pack que caduca antes se usa primero; sin saldo se marca `uncovered` y no se bloquea la asistencia. Coste si Maribel no cobra ausencias: quitar `absent` de la regla (una línea + tests).
7. **Las sesiones se generan solo en SQL, a mano y con horizonte ≤ 1 año; sin cron.** `replan` nunca toca sesiones manuales, canceladas o con asistencia. Coste: grupos abiertos sin fin necesitan "Generar más" periódicamente (añadir `pg_cron` después).
8. **Invariantes en triggers `security definer`; operaciones de docente sobre sesiones por RPC; CRUD de administración directo con RLS.** Por qué: cualquier camino (UI, `service_role`, SQL) respeta cupo, consentimiento y créditos.
9. **Admisión de solicitudes por RPC `submit_lead` con clave anon + token hasheado**, sin SDK ni `service_role` en la web; email como aviso y respaldo. Coste: una variable más por entorno y una fila en `private.intake_tokens`.
10. **`/reset-password` con `token_hash` en un formulario** (no se consume al abrir el enlace). Coste: la plantilla `recovery.html` hay que subirla también al proyecto remoto.
11. **Alta de cuentas con `service_role` solo en `apps/app/src/lib/supabase/admin.ts`** tras `requireArea('admin')`, rol por `app_metadata.initial_role`.
12. **Sin librería de calendario:** agenda semanal por días. Por qué: accesible, ligera y móvil primero. Coste: si se quiere arrastrar y soltar, añadir una librería después.
13. **Formularios con `useActionState` + zod en servidor**, sin react-hook-form (PLAN.md lo proponía). Por qué: es el patrón ya usado en login y funciona sin JS.
14. **Paquete `@spanglish/db`** con tipos generados y control de deriva en CI (el spec §5 prevé "tipos de BD" compartidos).
15. **Solicitudes de cambio:** tabla, RLS y bandeja de docente/administración en 1B; el formulario del alumno/tutor llega con su portal (hito 2); mientras, la administradora o la docente las registran "en nombre de".
16. **Sedes sin direcciones privadas:** la dirección de una clase a domicilio va en `groups.location_note`, visible solo a quien ve el grupo.
17. **Una sesión con asistencia no se puede cancelar ni mover** (`session_has_attendance`); primero se borra la asistencia (lo que revierte el crédito).
18. **Auditoría también en `leads` y personas**, aunque guarde copias de datos personales: un borrado por petición de privacidad tendrá que purgar `audit_logs` con un procedimiento de propietario (hito 3).
19. **Solicitudes de la web dentro de 1B** aunque el spec §7 las pone en el hito 3, por indicación del controlador; los pedidos de la tienda siguen solo por email hasta el hito 3.
20. **Menor = segmento `kids`** (`is_minor` generada): los de 14–17 son `adults` con cuenta propia (ver pregunta 7).

## Preguntas abiertas para la dueña/desarrollador
1. **Tamaño máximo de un grupo local** (el plan permite 1–20 por grupo y propone 8 por defecto en el formulario) y si el "grupo propio" es siempre de 2 como máximo.
2. **Ausencia sin aviso: ¿consume clase del pack?** ¿Con cuántas horas de aviso se considera justificada (24 h)?
3. **Caducidad de packs:** el spec dice "sin caducidad salvo que la ponga la administradora"; ¿quiere un valor por defecto (p. ej. 6 meses) y los packs valen para cualquier programa o solo para uno?
4. **Lista de espera:** ¿se ofrece la plaza en orden de llegada y la decide ella a mano (plan actual), o quiere un plazo automático para aceptar?
5. **¿Pueden las docentes crear grupos o cambiar horarios?** (el plan: solo la administradora; las docentes cancelan, mueven y recuperan sesiones).
6. **¿Deben las docentes ver teléfono/email de sus alumnos o de los tutores?** (el plan: no).
7. **Menores de 14 a 17:** el spec pone el corte en 13 (cuenta del tutor), pero el formulario de la web pide que a los menores de 18 los inscriba un adulto. ¿Los de 14–17 tienen cuenta propia y necesitan consentimiento de un tutor?
8. **"Una clase gratuita por persona":** ¿se identifica por email, por teléfono o por familia (hermanos)?
9. **¿Una matrícula en pausa conserva la plaza?** (el plan: sí).

## Fuera de este plan
- **Hito 2:** portal de alumno y tutor (próxima clase, solicitudes desde el portal), biblioteca, grabaciones, lecciones interactivas, tareas, progreso, notificaciones por email (Resend), recursos con `access_level` (`apps/web/src/lib/resources.ts` seguirá estático hasta entonces).
- **Hito 3:** Stripe y pagos externos con conciliación (marcar matrícula pagada), pedidos de la tienda en BD, horario público generado desde grupos `is_public`, CMS, migración y 301, límites de intentos y endurecimiento del Auth remoto, procedimiento de borrado por privacidad.

## Autorrevisión (hecha al escribir)
- **Cobertura del spec:** programas y ediciones (T6, T9), precio por sede (T6, T10), packs con saldo y caducidad opcional (T17, T21), lista de espera (T13, T15), modelo de tutores y consentimiento con fecha y versión (T7, T11), leads con clase gratis única (T22–T24), reglas de repetición → sesiones (T12, T14), cancelaciones/recuperaciones por docente o admin y solicitudes del alumno (T18, T20), asistencia en un clic (T19), auditoría por triggers (T1 y cada migración), RLS por rol con pgTAP (cada tarea de BD), zod e i18n (T4 y cada tarea UI), móvil primero para docente (T19, T20), paneles (T19, T25), zona Brisbane (T4). Pendientes de 1A asignados o diferidos con motivo.
- **Tipos y nombres:** `ActionState`, `DomainError`, `toDomainError`, `parseForm`, `schoolDayRange`, `formatSessionTime`, `resolvePrices`, `provisionAccount`, `listSessionsInRange`, `session_roster`, `teaches_group`/`teaches_session`, `can_view_student`, `submit_lead`/`storeLead`/`submitLead` usados con la misma firma en todas las tareas.
- **Review Focus:** cada línea tiene su prueba en la tarea dueña (T4/T19, T17, T13, T18/T26, T22/T23).
- **Proporción:** el plan fija tablas, firmas, reglas no deducibles (generación, cobro, admisión) y nombres de pruebas; no incluye cuerpos de funciones.
