# Hito Demo: Recursos y Aprende ahora gestionados, web conectada y entorno de demostración Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la administradora cree, edite, ordene y publique recursos (videos, documentos, enlaces, fichas…) y lecciones de "Aprende ahora" desde el portal, que la web pública los muestre (con los niveles bloqueados enlazando al login), que un alumno vea en el portal lo que su nivel de acceso desbloquea, y que todo esto esté en internet, sin indexar, para enseñárselo a Maribel.

**Architecture:** Igual que 1A/1B: la seguridad vive en Postgres. Tres tablas nuevas (`resources`, `lessons`, `lesson_blocks`) con RLS por rol probada con pgTAP y un orden de acceso `public < account < enrolled` calculado por `content_tier()`. La web pública no tiene ningún privilegio de tabla: lee, desde su servidor y con la clave anon, cuatro RPC `security definer` que solo devuelven filas publicadas y, para lo bloqueado, solo el "teaser" (título, resumen, nivel); si la base no responde o no está configurada, usa los datos estáticos actuales como respaldo. Los archivos privados se sirven con URL firmadas de vida corta; la política de Storage reutiliza la misma regla de nivel. Las lecciones nuevas son "artículos" con bloques ordenados (texto, imagen, video, pregunta); las dos interactivas existentes siguen siendo componentes de código referenciados por una clave estable. El entorno demo es un proyecto Supabase en Sídney y dos proyectos Vercel, con `noindex` por defecto.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`), TypeScript, Tailwind v4, next-intl, `@supabase/ssr` + `@supabase/supabase-js` (solo `apps/app`), zod 4, Supabase CLI (Postgres 17, Storage), pgTAP, Vitest, Playwright + axe, GitHub Actions, Vercel. Paquete nuevo `@spanglish/content` (tipos, constantes y esquemas compartidos por las dos apps, sin React).

**Spec:** `docs/superpowers/specs/2026-11-08-spanglish-platform-design.md` (§5 lecciones y materiales, §6 web pública, §7 hitos 2 y 3, §11 contenido web, archivos, infraestructura y lecciones, §12). Contexto: `docs/PLAN.md`, `docs/DESIGN.md`, `docs/superpowers/plans/2026-11-08-hito1b-nucleo-operativo.md` (Fases 1–2, "Contratos comunes", "Decisiones del planificador", "Respuestas aprobadas"), que este plan da por cumplidas.

## Global Constraints
- Idiomas de interfaz `es` (por defecto) y `en`; todo texto nuevo de UI va en `apps/app/messages/{es,en}.json` o `apps/web/messages/{es,en}.json` con las mismas claves. Contenido editable bilingüe por campo (`*_es`, `*_en`), los dos obligatorios en títulos.
- Roles `admin`, `teacher`, `student`, `guardian`; toda política exige cuenta activa (`is_active()`/`has_role()`); fallo cerrado.
- Niveles de acceso, los mismos que ya publica la web: `public` (sin cuenta), `account` (con cuenta), `enrolled` (alumnos). Orden estricto `public < account < enrolled`.
- Niveles A1–C2 de la tabla `levels` existente (idioma `es` por defecto).
- Ningún dato personal en recursos, lecciones ni nombres de archivo (spec §2 antiobjetivo "fugas de datos de menores"; §11 "grabaciones que muestren niños solo con consentimiento": en este hito no se suben grabaciones con alumnos, solo enlaces de video de Maribel).
- La `SUPABASE_SERVICE_ROLE_KEY` nunca llega a `apps/web` ni al navegador; `apps/web` no instala `@supabase/*` (mismo criterio que 1B Task 23). Sin imports entre apps; lo compartido va en `packages/*`.
- Archivos de alumnos y materiales privados en bucket privado con tipos y tamaño limitados (spec §11); URL firmadas de vida corta.
- Migraciones `0010_` y `0011_` (y `0012_` solo si se ejecuta la Fase 6). `supabase/seed.sql` sigue siendo solo local (su guarda no se toca); los datos de demo van por un script aparte.
- Contratos de 1B vigentes: plantilla de migración (`id uuid`, `touch_updated_at`, RLS, grants explícitos, `enable_audit`), errores de dominio (`P0001`/`42501`), convenciones de `apps/app` (`lib/data/*`, `actions.ts` con `requireArea → parseForm → createClient() → toDomainError → revalidatePath`), `pnpm db:types` tras cada migración.
- Diseño: `apps/app` con los tokens de `packages/ui` (administradora sobria, alumno expresivo; spec §8); páginas públicas con el aspecto actual. WCAG 2.2 AA, foco `3px solid #592F85`, móvil primero (375px).
- Supabase en región Sídney (spec §11 "Infraestructura").

## Review Focus
1. **Recurso publicado que cambia de nivel** (de `public` a `enrolled`, o se despublica): desde ese momento la clave anon ya no puede firmar su archivo ni la RPC lo devuelve desbloqueado; la web deja de enlazarlo en la siguiente revalidación. Pruebas en Task 3 y Task 4 (pgTAP) y Task 19 (e2e "unpublishing removes it…").
2. **Base de datos caída, lenta o sin variables en la web:** `/resources`, `/learn` y el sitemap responden 200 con los datos estáticos de respaldo, nunca 500 ni página vacía; una lección artículo que no se puede leer da 404. Pruebas en Task 12, 13 y 14.
3. **Texto de un bloque con HTML o Markdown inesperado** (`<script>`, `<img onerror>`, `[x](javascript:…)`): se muestra como texto literal; ningún componente usa `dangerouslySetInnerHTML`. Pruebas en Task 1 (`parseTextBlock`) y Task 14 (e2e).
4. **Persona con cuenta pero sin ficha de alumno, alumno inactivo o cuenta suspendida:** la primera ve `public` + `account` y lo `enrolled` bloqueado; el alumno inactivo baja a `account`; la suspendida no ve nada por RLS (y la RPC la trata como anónima). Pruebas en Task 2 (pgTAP) y Task 19.
5. **Subida rechazada o abandonada** (tipo no permitido, más de 25 MB, la pestaña se cierra entre "pedir URL" y "adjuntar"): mensaje legible; el recurso nunca queda apuntando a un objeto que no existe. Pruebas en Task 7.

---

## Fases y PRs

Cada fase es software funcionando, con su propio PR hacia `develop` y CI verde. La rama de cada fase sale de `develop` tras fusionar la anterior (`feat/demo-fase1` … `feat/demo-fase6`).

| Fase | Contenido | Tareas | Migraciones |
|---|---|---|---|
| 1. Contenido en la base | paquete `@spanglish/content`, tablas, RLS, RPC, Storage | 1–4 | 0010, 0011 |
| 2. Gestión en el portal | recursos, subidas, lecciones, editor de bloques, vista previa | 5–9 | — |
| 3. Portal del alumno | Recursos y Aprende del alumno con niveles | 10–11 | — |
| 4. Web pública conectada | cliente de plataforma con respaldo, Recursos, Aprende, revalidación | 12–15 | — |
| 5. Entorno demo (solo código) | variables, `vercel.json`/Turbo, `noindex`, salud, datos de demo, e2e, guía de despliegue y checklists | 16–20 | — |
| 6. Productos de la tienda (opcional, diferible) | productos en BD y pago construido desde la BD | 21–23 | 0012 |
| Checklists manuales (al final) | M0 ramas · M1 Supabase · M2 Vercel · M3 salida a demo · M4 salida a producción | — | — |

**Para enseñar a Maribel bastan las Fases 1–5 más las Checklists M0–M3.** Las fases de código no dependen de ninguna cuenta: las cuentas de Supabase cloud y Vercel llegan después y solo se necesitan en M1–M3. La Fase 6 se puede hacer después o dejar para el hito 3.

## Dependencias de 1B (Fase 2 "Catálogo y personas")

El hito empieza cuando el PR "1B-2" esté fusionado. Usa solo lo que el plan 1B promete; si algo cambia en su implementación, se ajusta aquí antes de empezar:
- SQL: `public.touch_updated_at()`, `public.enable_audit(regclass)`, `public.user_has_role(uuid, app_role)`, privilegios por defecto de 0006 (anon sin nada), `public.audience_segment` (0008), `public.students(profile_id, status)` y `public.guarded_student_ids()` (0009, Task 7 de 1B).
- App: `parseForm`, `ActionState<F>`, `FieldErrors`, `toDomainError`, `DomainError`, `DOMAIN_ERRORS` (`lib/forms.ts`, `lib/db-errors.ts`), `Field`, `FormStatus`, `SubmitButton` (`components/forms/*`), `createClient(): SupabaseClient<Database>`, `requireArea`, `@spanglish/db` (`Tables`, `Enums`), `NavIcon` ampliado y `Sidebar` con ítems `aria-disabled` (Task 8 de 1B), fixtures e2e `USERS`, `adminClient()`.
- Seed local: `student@spanglish.test` enlazado a la ficha activa "Student Local" (Task 7 de 1B).

**Numeración:** este hito ocupa `0010_content.sql` y `0011_content_storage.sql` (y `0012_shop_products.sql` si se hace la Fase 6). Las Fases 3–6 de 1B pasan a usar el siguiente número libre (su 0010 será 0012 o 0013). Hay que corregir la tabla de fases de 1B antes de empezar su Fase 3; `supabase db push` rechaza migraciones con número menor que la última aplicada en remoto.

## Contratos de este hito (valen para todas las tareas)

**Matriz de RLS** (R = leer, W = insertar/actualizar/borrar):

| Objeto | admin | teacher | student / guardian | anon |
|---|---|---|---|---|
| `resources`, `lessons` | RW (incluye borradores) | R: publicadas de cualquier nivel | R: publicadas con `access_level <= content_tier()` | — (solo RPC) |
| `lesson_blocks` | RW | R: de lecciones artículo publicadas | R: de lecciones artículo publicadas y accesibles | — (solo RPC) |
| Storage `content-media` (público) | RW | lectura pública por URL | lectura pública por URL | lectura pública por URL |
| Storage `resource-files` (privado) | RW | R (firmar) de recursos publicados | R (firmar) si `can_read_resource_object(name)` | R (firmar) solo de recursos `public` publicados |

**`content_tier()`** (devuelve `public.access_level`): anónimo, sin perfil o suspendido → `public`; `admin` o `teacher` → `enrolled`; `has_enrolled_access()` → `enrolled`; cualquier otra cuenta activa → `account`.

**`has_enrolled_access()` (sustituto etiquetado):** en este hito = existe una fila de `students` con `profile_id = auth.uid()` y `status = 'active'`, o el usuario es tutor de un alumno activo (`guarded_student_ids()`). **1B Task 13 (matrículas) debe reemplazarla** con `create or replace` para exigir una matrícula `active|paused` (y, si la dueña lo pide, limitarla por nivel; ver pregunta 3). El comentario SQL de la función lo dice.

**Errores de dominio nuevos** (se añaden a `DomainError` y a los mensajes): `content_incomplete` (publicar un recurso sin origen o una lección artículo sin bloques), `slug_taken` (`23505` sobre `lessons_slug_key`). Lo que no es editable (clave y slug de una lección interactiva) devuelve `forbidden`.

**Revalidación de la web:** las páginas públicas cachean las lecturas 300 s con la etiqueta `web-content`. Después de cada escritura que afecte a contenido publicado, la acción del portal llama a `pingWebRevalidate()` (mejor esfuerzo, 3 s, nunca rompe la acción), que hace `POST {WEB_REVALIDATE_URL}` con `Authorization: Bearer {WEB_REVALIDATE_SECRET}`. Sin esas variables, la web se pone al día en ≤ 5 minutos.

**Cabeceras hacia Supabase desde la web:** `apikey: <clave anon>` siempre; `Authorization: Bearer <clave>` solo si la clave es un JWT (empieza por `eyJ`). Las claves nuevas `sb_publishable_…` no son JWT y no deben ir como Bearer.

**Variables de entorno** (nombres exactos; los valores nunca en git):

| Variable | web | app | Notas |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | sí | sí | URL pública de cada app (en app: base de los enlaces de recuperación) |
| `NEXT_PUBLIC_APP_URL` | sí | — | portal, para "Entrar" y los candados |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | sí | |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | sí (solo servidor) | — | mismos nombres que 1B Task 23; sin ellas, respaldo estático |
| `SUPABASE_SERVICE_ROLE_KEY` | **prohibida** | sí | alta de cuentas (1B Task 8) |
| `WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET` | — | opcional (par) | `https://<web>/api/revalidate` |
| `NEXT_PUBLIC_WEB_URL` | — | opcional | web pública: lecciones interactivas y "clase gratis" desde el portal |
| `REVALIDATE_SECRET` | opcional | — | mismo valor que `WEB_REVALIDATE_SECRET`, ≥ 32 caracteres |
| `SITE_INDEXING` | sí | — | solo `on` indexa (y solo en `VERCEL_ENV=production`); cualquier otro valor → `noindex` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | opcional (par) | — | claves `sk_test_`/`whsec_` en demo |
| `RESEND_API_KEY`, `LEAD_TO_EMAIL`, `LEAD_FROM_EMAIL` | opcional (las tres) | — | sin ellas y sin `LEADS_LOG_ONLY`, el formulario avisa de que no está disponible |
| `LEADS_LOG_ONLY` | opcional | — | prohibida si `SITE_INDEXING=on` |
| `LEADS_INTAKE_TOKEN` | cuando llegue 1B Fase 5 | — | |
| `ENABLE_EXPERIMENTAL_COREPACK=1` | Vercel | Vercel | para que Vercel use `pnpm@9.7.0` de `packageManager` |
| `DEMO_SEED_PROJECT_REF`, `DEMO_PASSWORD_ADMIN`, `DEMO_PASSWORD_TEACHER`, `DEMO_PASSWORD_STUDENT`, `DEMO_PASSWORD_VISITOR` | — | solo en la máquina del desarrollador (`apps/app/.env.demo.local`) | script de datos de demo |

**Personas de prueba pgTAP** (UUID fijos, prefijo propio por archivo, como en 1B): `admin` (A), `teacher1` (T1), `student1` (S1, con ficha `students` activa), `visitor` (V, rol `student` sin ficha), `inactive` (I, ficha `students` con `status = 'inactive'`), `guardian1` (GU1, tutor de un menor activo), `suspended` (admin suspendido), `anon`.

---

## Antes de empezar

El hito parte de `develop` con 1B Fase 2 fusionada. Si los PR apilados aún no están en `develop`, seguir primero la **Checklist M0** (al final del plan; solo necesita GitHub). Ninguna tarea de código de las Fases 1–6 necesita cuentas de Supabase cloud ni de Vercel: todo se prueba contra el Supabase local y la CI.

---

## Fase 1. Contenido en la base (PR "Demo-1")

### Task 1: Paquete `@spanglish/content`

**Files:**
- Create: `packages/content/package.json` (`"name": "@spanglish/content"`, dep `zod@4.6.7`, scripts `test`, `typecheck`, `lint`), `packages/content/tsconfig.json`, `packages/content/vitest.config.ts`, `packages/content/src/{index.ts,constants.ts,youtube.ts,text-block.ts,published.ts}`, `packages/content/src/{youtube.test.ts,text-block.test.ts,published.test.ts}`
- Modify: `apps/app/package.json` y `apps/web/package.json` (dep `@spanglish/content: workspace:*`), `apps/app/next.config.ts` y `apps/web/next.config.ts` (`transpilePackages: ["@spanglish/ui", "@spanglish/content"]`)

**Interfaces:**
- Produces:
  - `ACCESS_LEVELS = ["public","account","enrolled"] as const`, `type AccessLevel`; `CONTENT_STATUSES = ["draft","published"]`; `RESOURCE_KINDS = ["video","document","link","worksheet","vocabulary","recording","coursework"]`, `type ResourceKind`; `LEARN_CATEGORY_KEYS = ["foundations","kids","adults","stories","games"]`, `type LearnCategoryKey`; `LESSON_KINDS = ["interactive","article"]`; `INTERACTIVE_KEYS = ["alphabet","nouns"]`, `type InteractiveKey`; `BLOCK_KINDS = ["text","image","video","quiz"]`, `type BlockKind`; `LEVEL_CODES = ["A1","A2","B1","B2","C1","C2"]`.
  - `UPLOAD_RULES = { resourceFile: { bucket: "resource-files", maxBytes: 26_214_400, mimeTypes: ["application/pdf","image/png","image/jpeg","audio/mpeg","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.presentationml.presentation"] }, contentImage: { bucket: "content-media", maxBytes: 2_097_152, mimeTypes: ["image/png","image/jpeg","image/webp"] } } as const` (deben coincidir con 0011; lo comprueba pgTAP en Task 4). `extensionFor(mime: string): string | null` (`pdf`, `png`, `jpg`, `mp3`, `docx`, `pptx`, `webp`).
  - `parseYouTubeId(input: string): string | null`: acepta un id de 11 caracteres `[A-Za-z0-9_-]` o URL `https://` de `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/embed/`, `youtube-nocookie.com/embed/`; cualquier otro host → `null`.
  - `type InlinePart = { text: string; bold: boolean }`; `type TextNode = { type: "p"; parts: InlinePart[] } | { type: "ul"; items: InlinePart[][] }`; `parseTextBlock(text: string): TextNode[]`: párrafos separados por línea en blanco; líneas seguidas que empiezan por `- ` forman una lista; `**negrita**` es la única marca en línea; todo lo demás es texto literal (sin enlaces, sin HTML).
  - Esquemas zod de lo que devuelven las RPC (Task 3) y tipos inferidos: `publishedResourceSchema` → `PublishedResource`, `publishedLessonSummarySchema` → `PublishedLessonSummary`, `lessonBlockSchema` (unión discriminada por `kind`) → `LessonBlock`, `publishedLessonDetailSchema` → `PublishedLessonDetail = { lesson: Omit<PublishedLessonSummary, "locked">; blocks: LessonBlock[] }`. Campos en camelCase; `parsePublishedResources(rows: unknown): PublishedResource[]`, `parsePublishedLessons(rows: unknown): PublishedLessonSummary[]` y `parsePublishedLessonDetail(value: unknown): PublishedLessonDetail | null` convierten de snake_case y descartan filas inválidas (nunca lanzan).
  - `pick(row: Record<string, unknown>, base: string, locale: "es" | "en"): string` (devuelve `row[base + "Es"|"En"]`, o el otro idioma si viene vacío).

- [ ] **Step 1: Test** `parseYouTubeId accepts a bare id and the four URL shapes`, `parseYouTubeId rejects http, other hosts and 10-char ids`, `parseTextBlock splits paragraphs on blank lines`, `parseTextBlock groups '- ' lines into one list`, `parseTextBlock marks **bold** and leaves unmatched ** literal`, `parseTextBlock keeps '<script>alert(1)</script>' and '[x](javascript:alert(1))' as literal text`, `parsePublishedResources maps snake_case to camelCase and drops a row with an unknown kind`, `lessonBlockSchema rejects a quiz whose correctOption is out of range`, `pick falls back to the other locale when empty`, `extensionFor maps every allowed mime`.
- [ ] **Step 2:** Run `pnpm install && pnpm --filter @spanglish/content test` · Expected: FAIL.
- [ ] **Step 3:** Implementar los módulos (sin React; sin dependencias salvo zod).
- [ ] **Step 4:** Run `pnpm --filter @spanglish/content test && pnpm typecheck && pnpm build` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(content): paquete compartido de tipos y utilidades de contenido`.

### Task 2: Tablas de contenido, niveles de acceso y RLS (0010, parte 1)

**Files:**
- Create: `supabase/migrations/0010_content.sql`, `supabase/tests/database/content.test.sql`
- Modify: `supabase/seed.sql` (usuario `visitor@spanglish.test` con rol `student` y SIN ficha; contenido local de ejemplo con UUID fijos `c0000000-0000-4000-8000-0000000000NN`: un recurso publicado por nivel —`public` enlace, `account` enlace, `enrolled` video— y una ficha `worksheet` `public` en borrador sin archivo (las e2e le suben el archivo y la publican), una lección artículo publicada por nivel con slugs `colores-local`, `saludos-local`, `preterito-local` y un bloque de texto y uno de pregunta en cada una, y una lección en borrador), `apps/app/e2e/fixtures.ts` (`USERS.visitor`, `SEED_CONTENT`), `packages/db/src/database.types.ts`

**Interfaces:**
- Produces (SQL):
  - Enums: `access_level ('public','account','enrolled')` (el orden de declaración ES el orden de acceso), `content_status ('draft','published')`, `resource_kind ('video','document','link','worksheet','vocabulary','recording','coursework')`, `learn_category ('foundations','kids','adults','stories','games')`, `lesson_kind ('interactive','article')`, `lesson_block_kind ('text','image','video','quiz')`.
  - `resources(id, kind resource_kind not null, access_level access_level not null default 'public', status content_status not null default 'draft', title_es, title_en text not null check 1..120, title_lang text null check in ('es','en'), description_es, description_en text null ≤500, language_code text not null default 'es' fk languages, level_id uuid null fk levels, audience audience_segment null, sort_order integer not null, external_url text null check (~ '^https://' and ≤500), youtube_id text null check ~ '^[A-Za-z0-9_-]{11}$', file_path text null check ~ '^resources/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]{2,5}$', file_mime text null, file_size_bytes integer null check > 0, thumbnail_path text null check ~ '^thumbnails/[0-9a-f-]{36}\.(png|jpg|webp)$', teaser_public boolean not null default true, published_at timestamptz null, created_by uuid null default auth.uid() fk profiles on delete set null, created_at, updated_at)`; checks `resources_one_source (num_nonnulls(external_url, youtube_id, file_path) <= 1)`, `resources_video_source (kind <> 'video' or file_path is null)`, `resources_link_source (kind <> 'link' or (youtube_id is null and file_path is null))`, `resources_file_meta ((file_path is null) = (file_mime is null) and (file_path is null) = (file_size_bytes is null))`; índices `(status, access_level, sort_order)`, `(level_id)`, `(created_by)`.
  - `lessons(id, slug text not null unique (constraint lessons_slug_key) check (~ '^[a-z0-9]+(-[a-z0-9]+)*$' and ≤80), kind lesson_kind not null default 'article', component_key text null unique check in ('alphabet','nouns'), category learn_category not null, level_id null fk levels, language_code default 'es' fk languages, title_es, title_en ≤120 not null, summary_es, summary_en null ≤300, access_level default 'public', status default 'draft', teaser_public bool default true, sort_order integer not null, published_at, created_by, created_at, updated_at)`; checks `lessons_interactive_key ((kind = 'interactive') = (component_key is not null))`, `lessons_interactive_public (kind <> 'interactive' or access_level = 'public')`, `lessons_level_by_category (category = 'foundations' or level_id is not null)`; índices `(status, category, level_id, sort_order)`, `(level_id)`.
  - `lesson_blocks(id, lesson_id uuid not null fk lessons on delete cascade, position integer not null, kind lesson_block_kind not null, body_es, body_en text null ≤5000, image_path text null check ~ '^lessons/[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$', image_width, image_height smallint null check 1..4000, alt_es, alt_en text null ≤200, youtube_id text null (mismo check), options_es, options_en text[] null, correct_option smallint null, explanation_es, explanation_en text null ≤500, created_at, updated_at)`; `constraint lesson_blocks_position_unique unique (lesson_id, position) deferrable initially deferred`; un check por tipo: `text` → `body_es` y `body_en` no nulos y el resto nulo; `image` → `image_path`, `alt_es`, `alt_en`, `image_width`, `image_height` no nulos; `video` → `youtube_id` no nulo; `quiz` → `body_es`/`body_en` (enunciado) no nulos, `cardinality(options_es) between 2 and 4`, `cardinality(options_en) = cardinality(options_es)`, `correct_option between 0 and cardinality(options_es) - 1`, `public.text_items_within(options_es, 1, 120) and public.text_items_within(options_en, 1, 120)`.
  - `public.text_items_within(p_items text[], p_min int, p_max int) returns boolean` (`immutable`, sin EXECUTE para roles de la API).
  - `public.has_enrolled_access() returns boolean` (`security definer stable`, interna; ver "Contratos").
  - `public.content_tier() returns public.access_level` (`security definer stable`; EXECUTE a `anon`, `authenticated`).
  - `public.content_assign_order() returns trigger` (BEFORE INSERT cuando `sort_order`/`position` es null: `coalesce(max, 0) + 10` dentro del grupo: recursos por `access_level`, lecciones por `(category, level_id)`, bloques por `lesson_id`).
  - `public.resources_guard()`, `public.lessons_guard()`, `public.lesson_blocks_guard()` (BEFORE INSERT/UPDATE/DELETE, `security definer`): al pasar a `published` fija `published_at` si es null; recurso publicado sin exactamente un origen → `content_incomplete`; lección artículo publicada sin bloques → `content_incomplete`; lección interactiva: `kind`, `component_key` y `slug` inmutables, no se borra y no admite bloques → `forbidden`; borrar el último bloque de una lección publicada → `content_incomplete`.
  - Políticas: `resources_select`/`lessons_select` `to authenticated using ((select public.is_active()) and ((select public.has_role('admin')) or (status = 'published' and access_level <= (select public.content_tier()))))`; `lesson_blocks_select` con `exists` sobre la lección (artículo, publicada, accesible) o admin; insert/update/delete solo admin. `grant select, insert, update, delete` a `authenticated` en las tres; `anon` nada.
  - Datos reales en la migración (antes de `enable_audit`, como 0003): las dos lecciones interactivas publicadas y públicas (`slug` `alphabet` → `component_key` `alphabet`, categoría `foundations`; `nouns-and-articles` → `nouns`, `foundations`), títulos copiados de `apps/web/messages/{es,en}.json` (`page.learn.items.alphabet`/`nouns`); los tres videos de `apps/web/src/lib/videos.ts` como recursos `video` publicados `public` con `title_es = title_en =` título publicado y `title_lang = 'en'`.
  - `select public.enable_audit('public.resources'); … ('public.lessons'); … ('public.lesson_blocks');`

- [ ] **Step 1: Test** `anon has no table privilege on resources, lessons or lesson_blocks`, `content_tier is public for anon, account for visitor, enrolled for student1, teacher1 and admin`, `content_tier is account for a student whose students row is inactive`, `content_tier is enrolled for guardian1 of an active minor`, `content_tier is public for a suspended account`, `visitor reads public and account published resources but not enrolled ones`, `student1 reads enrolled published resources`, `nobody but admin reads drafts`, `suspended admin reads nothing`, `teacher1 cannot insert a resource (42501)`, `publishing a resource without a source raises content_incomplete`, `a resource with a youtube_id and a file_path is rejected (23514)`, `publishing an article lesson without blocks raises content_incomplete`, `changing the slug of an interactive lesson raises forbidden`, `an interactive lesson with access_level account is rejected`, `a kids lesson without level is rejected`, `deleting the last block of a published lesson raises content_incomplete`, `a quiz block with 5 options or mismatched es/en options is rejected`, `a quiz option longer than 120 chars is rejected`, `lesson_blocks of an enrolled lesson are invisible to visitor`, `new rows get sort_order max + 10 in their group`, `published_at is set on first publish and kept on later edits`, `the migration ships two interactive lessons and three public videos`, `admin update of a resource writes an audit row`.
- [ ] **Step 2:** Run `pnpm supabase db reset && pnpm supabase test db` · Expected: FAIL en `content.test.sql`.
- [ ] **Step 3:** Escribir la parte de tablas, funciones y políticas de `0010_content.sql` y el seed local.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db && pnpm db:types` · Expected: PASS (también los archivos anteriores).
- [ ] **Step 5:** Commit `feat(db): recursos, lecciones y bloques con niveles de acceso`.

### Task 3: RPC de lectura pública, orden y salud (0010, parte 2)

**Files:**
- Modify: `supabase/migrations/0010_content.sql` (mismo archivo, sección final; la migración aún no está en ningún remoto), `supabase/tests/database/content.test.sql`, `packages/db/src/database.types.ts`, `packages/content/src/published.test.ts` (fixture con la forma exacta que devuelve PostgREST)

**Interfaces:**
- Produces (SQL; todas `set search_path = ''`):
  - `public.list_published_resources() returns table (id uuid, kind public.resource_kind, access_level public.access_level, locked boolean, title_es text, title_en text, title_lang text, description_es text, description_en text, level_code text, audience public.audience_segment, sort_order integer, thumbnail_path text, youtube_id text, external_url text, has_file boolean)` — `security definer stable`; solo `status = 'published'`; `locked = access_level > content_tier()`; las filas bloqueadas solo salen si `teaser_public` y con `youtube_id`, `external_url` nulos y `has_file = false`; orden `access_level, sort_order, id`. EXECUTE a `anon`, `authenticated`.
  - `public.list_published_lessons() returns table (id uuid, slug text, kind public.lesson_kind, component_key text, category public.learn_category, level_code text, access_level public.access_level, locked boolean, title_es text, title_en text, summary_es text, summary_en text, sort_order integer)` — mismas reglas; orden `category, level_code nulls first, sort_order`.
  - `public.get_published_lesson(p_slug text) returns jsonb` — `{ "lesson": {…columnas de la lista sin locked}, "blocks": [ {id, position, kind, body_es, body_en, image_path, image_width, image_height, alt_es, alt_en, youtube_id, options_es, options_en, correct_option, explanation_es, explanation_en} ] }` ordenado por `position`; `null` si no existe, no está publicada, es interactiva o está bloqueada para quien llama.
  - `public.resource_file_path(p_resource_id uuid) returns text` — `file_path` si el recurso está publicado, tiene archivo y `access_level <= content_tier()`; si no, `null`.
  - `public.move_resource(p_resource_id uuid, p_direction text) returns void`, `public.move_lesson(p_lesson_id uuid, p_direction text) returns void`, `public.move_lesson_block(p_block_id uuid, p_direction text) returns void` — `security invoker` (la RLS de admin decide la escritura); primera sentencia: sin `has_role('admin')` → `42501 'forbidden'`; intercambian `sort_order`/`position` con el vecino del mismo grupo; en el extremo no hacen nada; `p_direction` fuera de `('up','down')` → `22023`; id inexistente o invisible → `P0001 'not_found'`. EXECUTE solo a `authenticated`.
  - `public.health_ping() returns boolean` (`select true`; EXECUTE a `anon`, `authenticated`).
- Consumes: `content_tier()` y tablas de Task 2.

- [ ] **Step 1: Test** `anon gets public rows unlocked and account/enrolled rows locked without sources`, `a locked row with teaser_public false is not returned`, `visitor gets account rows unlocked and enrolled rows locked`, `drafts never appear in list_published_resources or list_published_lessons`, `get_published_lesson returns blocks in position order for anon on a public lesson`, `get_published_lesson returns null for anon on an account lesson and for an interactive lesson`, `resource_file_path is null for anon on an account resource and set for visitor`, `move_resource swaps with the neighbour in the same access level`, `move_lesson_block at the top with 'up' changes nothing`, `teacher1 calling move_resource raises forbidden (42501) and changes nothing`, `admin calling move_resource with an unknown id raises not_found`, `move_resource with 'left' raises 22023`, `anon cannot execute move_resource`, `anon can execute health_ping`.
- [ ] **Step 2:** Run `pnpm supabase test db` · Expected: FAIL.
- [ ] **Step 3:** Escribir las funciones; actualizar el fixture de `published.test.ts` con una fila real (`select * from list_published_resources()` en local).
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db && pnpm db:types && pnpm --filter @spanglish/content test` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): lecturas públicas de contenido, orden y salud`.

### Task 4: Storage: buckets y políticas (0011)

**Files:**
- Create: `supabase/migrations/0011_content_storage.sql`, `supabase/tests/database/content_storage.test.sql`
- Modify: `packages/db/src/database.types.ts`

**Interfaces:**
- Produces (SQL):
  - `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('content-media', 'content-media', true, 2097152, array['image/png','image/jpeg','image/webp']), ('resource-files', 'resource-files', false, 26214400, array[<los 6 tipos de UPLOAD_RULES.resourceFile>]) on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;` (los buckets se crean igual en local y en remoto con `db push`; no se configuran en `config.toml`).
  - `public.can_read_resource_object(p_name text) returns boolean` (`security definer stable`): existe recurso publicado con `file_path = p_name` y `access_level <= content_tier()`. EXECUTE a `anon`, `authenticated`.
  - Políticas en `storage.objects`: `content_media_admin_insert|update|delete` (`to authenticated`, `bucket_id = 'content-media' and (select public.has_role('admin'))`); `resource_files_admin_all` (select/insert/update/delete, admin); `resource_files_read_by_tier` (`for select to anon, authenticated using (bucket_id = 'resource-files' and public.can_read_resource_object(name))`).
- Rutas de objeto (las fija la app): `resources/<resource_id>/<uuid>.<ext>`, `thumbnails/<uuid>.<ext>`, `lessons/<lesson_id>/<uuid>.<ext>`.

- [ ] **Step 1: Test** `buckets have the exact limits and mime types of UPLOAD_RULES`, `content-media is public and resource-files is private`, `admin can insert an object in resource-files and content-media`, `student1 cannot insert into resource-files or content-media`, `anon selects the object of a published public resource`, `anon cannot select the object once the resource becomes enrolled`, `anon cannot select the object of a draft resource`, `visitor cannot select an enrolled object and student1 can`, `suspended admin selects nothing`, `an object not referenced by any resource is invisible to everyone but admin`.
- [ ] **Step 2:** Run `pnpm supabase test db` · Expected: FAIL.
- [ ] **Step 3:** Escribir `0011_content_storage.sql`. Las pruebas insertan filas en `storage.objects` (`bucket_id`, `name`, `owner_id`) con el rol y los claims de cada persona; no hace falta el servicio de Storage.
- [ ] **Step 4:** Run `pnpm supabase db reset && pnpm supabase test db && pnpm db:types` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): buckets de contenido y lectura por nivel de acceso`. Abrir PR "Demo-1" a `develop`.

---

## Fase 2. Gestión en el portal (PR "Demo-2")

### Task 5: Base de la gestión: datos, esquemas, errores, navegación y aviso a la web

**Files:**
- Create: `apps/app/src/lib/data/content.ts`, `apps/app/src/lib/schemas/content.ts`, `apps/app/src/lib/schemas/content.test.ts`, `apps/app/src/lib/web-revalidate.ts`, `apps/app/src/lib/web-revalidate.test.ts`, `apps/app/src/components/forms/BilingualField.tsx`, `apps/app/src/components/content/{AccessBadge.tsx,MoveButtons.tsx}`, `apps/app/src/components/content/content.test.tsx`
- Modify: `apps/app/src/lib/db-errors.ts` (+ test: `content_incomplete`, `slug_taken`), `apps/app/src/lib/nav.ts` (+ test), `apps/app/src/components/nav-icons.tsx`, `apps/app/messages/{es,en}.json` (`content.*`, `enums.accessLevel.*`, `enums.resourceKind.*`, `enums.learnCategory.*`, `enums.blockKind.*`, `enums.contentStatus.*`, `errors.domain.content_incomplete`, `errors.domain.slug_taken`), `.env.example` (`WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET`, `NEXT_PUBLIC_WEB_URL`)

**Interfaces:**
- Consumes: `parseForm`, `ActionState`, `toDomainError` (1B Task 4); constantes y tipos de `@spanglish/content` (Task 1); RPC de Task 3.
- Produces:
  - `resourceSchema = z.object({ id: z.uuid().optional(), kind: z.enum(RESOURCE_KINDS), accessLevel: z.enum(ACCESS_LEVELS), titleEs, titleEn: z.string().trim().min(1).max(120), titleLang: z.enum(["es","en"]).optional(), descriptionEs, descriptionEn: z.string().trim().max(500).optional(), levelId: z.uuid().optional(), audience: z.enum(["kids","adults","mature"]).optional(), externalUrl: z.url({ protocol: /^https$/ }).max(500).optional(), video: z.string().trim().max(200).optional(), teaserPublic: z.enum(["on"]).optional() })` con `.superRefine`: `video` debe dar `parseYouTubeId` no nulo (error `invalid` en `video`); `kind = 'link'` exige `externalUrl`; `video` y `externalUrl` a la vez → `invalid`. Salida transformada: `youtubeId: string | null`.
  - `lessonSchema = z.object({ id?, slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80), category: z.enum(LEARN_CATEGORY_KEYS), levelId?: z.uuid(), accessLevel, titleEs, titleEn, summaryEs?, summaryEn? (≤300), teaserPublic? })` con `levelId` obligatorio salvo `foundations`.
  - `blockSchema = z.discriminatedUnion("kind", [textBlock, imageBlock, videoBlock, quizBlock])` con `lessonId: z.uuid()`, `id?: z.uuid()`; `quizBlock` recibe `optionsEs`/`optionsEn` como textarea de una opción por línea (2–4 líneas, ≤120 cada una) y `correctOption: z.coerce.number().int().min(0).max(3)` menor que el número de opciones.
  - `moveSchema = z.object({ id: z.uuid(), direction: z.enum(["up","down"]) })`, `publishSchema = z.object({ id: z.uuid(), publish: z.enum(["true","false"]) })`.
  - Datos (`server-only`): `listAdminResources(supabase, q?: { status?: ContentStatus; kind?: ResourceKind }): Promise<AdminResourceRow[]>` (fila + `levelCode`), `getAdminResource(supabase, id): Promise<Tables<"resources"> | null>`, `listAdminLessons(supabase): Promise<AdminLessonRow[]>`, `getAdminLesson(supabase, id): Promise<{ lesson: Tables<"lessons">; blocks: LessonBlock[] } | null>`, `toLessonBlock(row: Tables<"lesson_blocks">): LessonBlock`, `listLevels(supabase, languageCode?: string): Promise<{ id: string; code: string }[]>`, `listPortalResources(supabase): Promise<PublishedResource[]>`, `listPortalLessons(supabase): Promise<PublishedLessonSummary[]>`, `getPortalLesson(supabase, slug): Promise<PublishedLessonDetail | null>`.
  - `pingWebRevalidate(env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch): Promise<"ok" | "not_configured" | "failed">` (POST, `Authorization: Bearer`, timeout 3 s, nunca lanza).
  - `BilingualField({ name, label, hint?, errors, defaultValues, multiline?, maxLength })`: pinta `<name>Es` y `<name>En` lado a lado desde `md` y apilados en móvil, cada uno con `lang="es"`/`lang="en"`, etiqueta "Español"/"English" y el patrón de `Field` (`aria-describedby`, `aria-invalid`).
  - `AccessBadge({ level })` (público amarillo, con cuenta morado, alumnos burdeos: los mismos colores que la web), `MoveButtons({ id, action, labelUp, labelDown, first, last })` (dos `<button>` de 44px con nombre accesible "Subir <título>").
  - Nav admin: `resources` → `/[locale]/admin/resources`, `lessons` → `/[locale]/admin/lessons`; alumno: `library` → `/[locale]/student/resources`, nuevo `learn` → `/[locale]/student/learn`. `NavIcon` + `resources`, `lessons`, `learn`.

- [ ] **Step 1: Test** `resourceSchema turns a youtu.be URL into youtubeId`, `resourceSchema rejects a link without URL`, `resourceSchema rejects http:// URLs`, `resourceSchema rejects both video and externalUrl`, `lessonSchema requires a level outside foundations`, `lessonSchema rejects slug 'Los Colores'`, `quiz block rejects a correctOption beyond the options`, `quiz block rejects 5 options`; `toDomainError maps 23505 on lessons_slug_key to slug_taken`, `maps P0001 content_incomplete`; `pingWebRevalidate returns not_configured without env and makes no request`, `sends the bearer secret`, `returns failed on timeout without throwing`; `BilingualField renders two inputs with lang es and en and links errors`; `MoveButtons disables up on the first row`; nav: `admin has resources and lessons routes`, `student library points to /student/resources`; `es and en messages have identical keys`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app test` · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run `pnpm --filter @spanglish/app test && pnpm typecheck` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): base de la gestión de contenido`.

### Task 6: Recursos en la administración: lista, alta, edición, publicación y orden

**Files:**
- Create: `apps/app/src/app/[locale]/(shell)/admin/resources/{page.tsx,new/page.tsx,[resourceId]/page.tsx,ResourceForm.tsx,actions.ts}`, `apps/app/e2e/admin-resources.spec.ts`
- Modify: `apps/app/messages/{es,en}.json` (`content.resources.*`)

**Interfaces:**
- Consumes: Task 5 (esquemas, datos, `BilingualField`, `AccessBadge`, `MoveButtons`, `pingWebRevalidate`); `move_resource` (Task 3).
- Produces: acciones `saveResource(prev: ActionState<ResourceField>, formData)` (sin `id` inserta y hace `redirect` a `/[locale]/admin/resources/<id>?saved=1`; con `id` actualiza), `setResourcePublished(prev, formData)`, `moveResource(formData: FormData): Promise<void>`, `deleteResource(prev, formData)` (borra la fila y, con mejor esfuerzo, sus objetos de Storage). Todas: `requireArea(locale, "admin")` primero; tras escribir, `revalidatePath` de la lista y `pingWebRevalidate()` si la fila está o estaba publicada.
- Rutas: `/[locale]/admin/resources?status=&kind=` (secciones por nivel de acceso; cada fila: miniatura o icono, título en el idioma de la interfaz, tipo, nivel, estado, `MoveButtons`, botón Publicar/Despublicar; tabla en escritorio y lista en móvil), `/admin/resources/new`, `/admin/resources/[resourceId]` (formulario + "Archivo" de Task 7 + vista de cómo se verá la tarjeta bloqueada si `access_level <> 'public'`).

- [ ] **Step 1: Test** e2e `admin creates a link resource in both languages and sees it in the account section`, `publishing a video without a video id shows the content_incomplete message`, `pasting a YouTube URL stores the id and shows the thumbnail-free preview`, `moving a resource down changes the visible order after reload`, `admin unpublishes a resource and its badge shows Borrador`, `a resource id that does not exist returns 404`, `teacher cannot open /es/admin/resources`, `resources pages have no axe violations (desktop and 375px)`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app e2e admin-resources` · Expected: FAIL.
- [ ] **Step 3:** Implementar páginas y acciones (sin estado optimista; cada acción recarga desde el servidor).
- [ ] **Step 4:** Run el e2e y `pnpm --filter @spanglish/app test` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): gestión de recursos`.

### Task 7: Subida de archivos y miniaturas a Storage

**Files:**
- Create: `apps/app/src/app/[locale]/(shell)/admin/resources/upload-actions.ts`, `apps/app/src/lib/uploads.ts`, `apps/app/src/lib/uploads.test.ts`, `apps/app/src/components/content/FileUpload.tsx`
- Modify: `apps/app/src/app/[locale]/(shell)/admin/resources/[resourceId]/page.tsx`, `apps/app/e2e/admin-resources.spec.ts`, mensajes (`content.upload.*`)

**Interfaces:**
- Consumes: `UPLOAD_RULES`, `extensionFor` (Task 1); políticas de Task 4.
- Produces:
  - `uploadRequestSchema = z.object({ ownerId: z.uuid(), target: z.enum(["resourceFile","thumbnail","lessonImage"]), fileName: z.string().min(1).max(200), mime: z.string().max(120), size: z.number().int().positive() })` + `checkUpload(input): { ok: true; bucket: string; path: string } | { ok: false; error: UploadError }` en `lib/uploads.ts` (ruta según "Rutas de objeto" de Task 4 con `crypto.randomUUID()`; `thumbnail` y `lessonImage` usan `UPLOAD_RULES.contentImage`). `type UploadError = "type" | "size" | "forbidden" | "missing" | "unavailable"`.
  - Acciones: `requestUpload(input: UploadRequest): Promise<{ ok: true; bucket: string; path: string; token: string } | { ok: false; error: UploadError }>` (admin; `createSignedUploadUrl(path)` con el JWT de la admin) y `attachUpload(input: { ownerId: string; target: UploadTarget; path: string; mime: string; size: number; width?: number; height?: number }): Promise<ActionState>` (comprueba que el objeto existe con `storage.from(bucket).list(dir, { search: file })` → si no, `missing`; guarda `file_path`/`file_mime`/`file_size_bytes` o `thumbnail_path`; borra con mejor esfuerzo el objeto anterior; `pingWebRevalidate()`), `removeResourceFile(prev, formData)`.
  - `FileUpload({ ownerId, target, accept, maxBytes, currentLabel })` (cliente): valida tipo y tamaño antes de pedir la URL (mismo mensaje que el servidor), sube con `createClient().storage.from(bucket).uploadToSignedUrl(path, token, file)`, lee ancho/alto con `createImageBitmap` para imágenes y llama a `attachUpload`; estado en una región `aria-live="polite"`; sin JS el resto del formulario sigue funcionando (la subida exige JS y lo dice).

- [ ] **Step 1: Test** Vitest `checkUpload rejects application/zip with 'type'`, `rejects 26 MB with 'size'`, `accepts a 2 MB webp thumbnail and builds thumbnails/<uuid>.webp`, `builds resources/<resourceId>/<uuid>.pdf for a resource file`, `lessonImage over 2 MB is rejected`. e2e `admin uploads a PDF to a worksheet, publishes it and the list shows the file size`, `uploading a .zip shows the type message and nothing is attached`, `attachUpload with a path that was never uploaded returns missing and the resource keeps no file`, `replacing the file removes the previous object`.
- [ ] **Step 2:** Run tests · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run `pnpm --filter @spanglish/app test && pnpm --filter @spanglish/app e2e admin-resources` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): subida firmada de archivos y miniaturas`.

### Task 8: Lecciones en la administración: lista por categoría y nivel, alta, edición y orden

**Files:**
- Create: `apps/app/src/app/[locale]/(shell)/admin/lessons/{page.tsx,new/page.tsx,[lessonId]/page.tsx,LessonForm.tsx,actions.ts}`, `apps/app/e2e/admin-lessons.spec.ts`
- Modify: mensajes (`content.lessons.*`)

**Interfaces:**
- Consumes: Task 5; `move_lesson` (Task 3).
- Produces: acciones `saveLesson(prev, formData)` (crea artículos; para interactivas solo cambia títulos, resumen, estado y `teaser_public`: el formulario muestra `slug`, categoría y tipo como texto, no como campos), `setLessonPublished(prev, formData)`, `moveLesson(formData): Promise<void>`, `deleteLesson(prev, formData)` (solo artículos; borra con mejor esfuerzo sus imágenes de `content-media`).
- Rutas: `/[locale]/admin/lessons` (una sección por categoría en el orden del menú público —Fundamentos, Niños, Adultos, Historias, Juegos— y dentro, por nivel A1–C2; cada nivel sin lecciones muestra "Sin lecciones" y un enlace "Añadir" con `?category=&level=`), `/admin/lessons/new?category=kids&level=A1`, `/admin/lessons/[lessonId]` (metadatos arriba, bloques de Task 9 debajo).

- [ ] **Step 1: Test** e2e `admin creates a kids A1 article lesson and it appears under Niños > A1 as Borrador`, `a duplicate slug shows the slug_taken message on the slug field`, `publishing a lesson without blocks shows content_incomplete`, `the interactive alphabet lesson shows its slug as text and has no delete button`, `moving a lesson up within adults A1 changes the order`, `/en/admin/lessons shows English category names`, `lessons pages have no axe violations`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app e2e admin-lessons` · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): gestión de lecciones por categoría y nivel`.

### Task 9: Editor de bloques de una lección y vista previa

**Files:**
- Create: `apps/app/src/app/[locale]/(shell)/admin/lessons/[lessonId]/{BlocksEditor.tsx,BlockForm.tsx,block-actions.ts}`, `apps/app/src/app/[locale]/(shell)/admin/lessons/[lessonId]/preview/page.tsx`, `apps/app/src/components/content/{LessonBlocks.tsx,TextBlock.tsx,QuizBlock.tsx,YouTubeFacade.tsx}`, `apps/app/src/components/content/blocks.test.tsx`
- Modify: `apps/app/e2e/admin-lessons.spec.ts`, mensajes (`content.blocks.*`, `content.quiz.*`)

**Interfaces:**
- Consumes: `blockSchema`, `toLessonBlock` (Task 5), `parseTextBlock`, `LessonBlock` (Task 1), `FileUpload` con `target = "lessonImage"` (Task 7), `move_lesson_block` (Task 3).
- Produces:
  - Acciones: `saveBlock(prev, formData)` (sin `id` inserta al final; con `id` actualiza), `moveBlock(formData): Promise<void>`, `deleteBlock(prev, formData)`. "Añadir bloque" es un enlace `?add=text|image|video|quiz` que abre un `BlockForm` vacío; la fila solo se crea al guardar (los checks por tipo no admiten un bloque vacío). Todas llaman `pingWebRevalidate()` si la lección está publicada.
  - `LessonBlocks({ blocks, locale })` (servidor): `text` → `TextBlock` (`parseTextBlock` a `<p>`, `<ul>`, `<strong>`, sin `dangerouslySetInnerHTML`); `image` → `next/image` con `unoptimized`, `width`/`height` guardados y `alt` del idioma; `video` → `YouTubeFacade`; `quiz` → `QuizBlock`.
  - `QuizBlock({ prompt, options, correctOption, explanation })` (cliente): `fieldset` + `legend` + radios + "Comprobar"; resultado en `role="status"`; sin puntuación guardada.
  - `YouTubeFacade({ youtubeId, title, thumbnailUrl?, playLabel })` (cliente): antes de pulsar no carga nada de YouTube (fondo de marca o miniatura propia de `content-media`); al pulsar, `iframe` de `youtube-nocookie.com` (misma URL que `apps/web/src/lib/videos.ts` `youtubeEmbedUrl`, copiada, no importada); sin JS, enlace a `youtube.com/watch`.
  - Editor: lista de bloques en orden, cada uno plegado con su tipo y primeras palabras; "Editar" despliega `BlockForm` con `BilingualField` (texto: `textarea` con ayuda "Deja una línea en blanco entre párrafos. Empieza una línea con «- » para una lista. **así** para negrita."); `MoveButtons`; "Eliminar" con confirmación de dos pasos (botón → "¿Seguro?" → botón), sin `window.confirm`.
  - Ruta `/[locale]/admin/lessons/[lessonId]/preview?lang=es|en`: renderiza la lección (incluidos borradores) con `LessonBlocks` en el idioma pedido y una banda "Vista previa · Borrador".

- [ ] **Step 1: Test** Vitest `TextBlock renders '<script>' as text and **bold** as strong`, `QuizBlock announces correct and incorrect answers in a status region`, `YouTubeFacade renders no iframe until play is pressed`, `LessonBlocks uses the English alt text for locale en`. e2e `admin adds text, video and quiz blocks, reorders them and publishes the lesson`, `the preview in English shows the English texts and the quiz gives feedback`, `a quiz with the correct option out of range shows the field error`, `deleting a block asks for confirmation`, `deleting the only block of a published lesson shows content_incomplete`, `admin adds an image block with alt texts and it renders in the preview`.
- [ ] **Step 2:** Run tests · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run `pnpm --filter @spanglish/app test && pnpm --filter @spanglish/app e2e admin-lessons` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): editor de bloques y vista previa de lecciones`. Abrir PR "Demo-2".

---

## Fase 3. Portal del alumno (PR "Demo-3")

### Task 10: Recursos del alumno con niveles y apertura firmada

**Files:**
- Create: `apps/app/src/app/[locale]/(shell)/student/resources/page.tsx`, `apps/app/src/app/[locale]/(shell)/student/resources/[resourceId]/open/route.ts`, `apps/app/src/components/content/ResourceCard.tsx`, `apps/app/e2e/student-resources.spec.ts`
- Modify: mensajes (`studentContent.resources.*`)

**Interfaces:**
- Consumes: `listPortalResources` (Task 5), `resource_file_path` (Task 3), `YouTubeFacade`, `AccessBadge`.
- Produces:
  - Página: cabecera "Tu acceso: Con cuenta" o "Alumno" (de `content_tier()` vía `supabase.rpc("content_tier")`); tres secciones (Libre, Con cuenta, Alumnos) con `ResourceCard`; las tarjetas bloqueadas muestran candado, título, resumen y "Disponible para alumnos matriculados", con enlace a `${NEXT_PUBLIC_WEB_URL}/<locale>/bookings` (clase gratis) si existe la variable; si no, texto sin enlace. Estilo expresivo del alumno (tarjetas de color de los tokens).
  - `ResourceCard({ resource, locale })`: video → `YouTubeFacade` dentro de la tarjeta; enlace → `<a href=external_url target="_blank" rel="noopener noreferrer">` con aviso de ventana nueva; archivo → enlace a `…/open`.
  - `GET /[locale]/student/resources/[resourceId]/open` (bajo el proxy, así que pasa el guard de `/student`): `requireArea(locale, "student")`; id no UUID → 404; `rpc("resource_file_path")` null → 404; `createSignedUrl(path, 300, { download: <nombre con extensión> })` → `303` a la URL firmada con `Cache-Control: private, no-store`.
- Nota: una admin entra a `/student` (lo permite `canAccess`) y ve todo como `enrolled`; sirve para la demo.

- [ ] **Step 1: Test** e2e `visitor sees public and account resources unlocked and enrolled ones locked`, `student sees enrolled resources unlocked`, `student opens an uploaded worksheet and gets a 303 to a signed storage URL`, `visitor requesting /open of an enrolled resource gets 404`, `an anonymous request to /open is redirected to login`, `a locked card has no link to the resource`, `student resources page has no axe violations at 375px`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app e2e student-resources` · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): recursos del alumno por nivel de acceso`.

### Task 11: Aprende ahora en el portal

**Files:**
- Create: `apps/app/src/app/[locale]/(shell)/student/learn/{page.tsx,[slug]/page.tsx}`, `apps/app/e2e/student-learn.spec.ts`
- Modify: mensajes (`studentContent.learn.*`)

**Interfaces:**
- Consumes: `listPortalLessons`, `getPortalLesson` (Task 5), `LessonBlocks` (Task 9).
- Produces: `/[locale]/student/learn` (mismas categorías y niveles que la web; artículos accesibles enlazan a `/student/learn/<slug>`; interactivas enlazan a `${NEXT_PUBLIC_WEB_URL}/<locale>/learn/<slug>` en pestaña nueva o, sin la variable, se listan sin enlace; bloqueadas con candado); `/[locale]/student/learn/[slug]` (`getPortalLesson` null → `notFound()`; título, resumen y `LessonBlocks`).

- [ ] **Step 1: Test** e2e `visitor opens an account lesson and sees its blocks`, `visitor gets 404 on an enrolled lesson URL`, `student opens the enrolled lesson`, `the interactive alphabet lesson links to the public site`, `learn pages have no axe violations`.
- [ ] **Step 2:** Run · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run · Expected: PASS.
- [ ] **Step 5:** Commit `feat(app): Aprende ahora en el portal del alumno`. Abrir PR "Demo-3".

---

## Fase 4. Web pública conectada (PR "Demo-4")

### Task 12: Cliente de plataforma con respaldo estático

**Files:**
- Create: `apps/web/src/lib/platform.ts`, `apps/web/src/lib/platform.test.ts`, `apps/web/src/lib/content-source.ts`, `apps/web/src/lib/content-source.test.ts`
- Modify: `apps/web/src/lib/resources.ts` (+ test), `apps/web/src/lib/learn/catalog.ts` (+ `catalog.test.ts`), `apps/web/src/lib/site.ts` (+ test), `.env.example` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`: solo servidor de la web, nunca `NEXT_PUBLIC_`)

**Interfaces:**
- Consumes: `parsePublishedResources`, `parsePublishedLessons`, `publishedLessonDetailSchema` (Task 1); RPC de Task 3.
- Produces:
  - `WEB_CONTENT_TAG = "web-content"`, `CONTENT_REVALIDATE_SECONDS = 300`.
  - `platformEnv(env?: NodeJS.ProcessEnv): { url: string; anonKey: string } | null`; `supabaseHeaders(anonKey: string): Record<string, string>` (regla de "Cabeceras hacia Supabase").
  - `getRpc<T>(fn: string, args: Record<string, string>, deps?: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch; cache?: "default" | "no-store" }): Promise<{ ok: true; data: T } | { ok: false; reason: "not_configured" | "failed" }>`: `GET {url}/rest/v1/rpc/<fn>?<args>` (las RPC son `stable`, PostgREST las admite por GET y así el caché de datos de Next las guarda), `next: { revalidate: CONTENT_REVALIDATE_SECONDS, tags: [WEB_CONTENT_TAG] }`, timeout 4 s con `AbortSignal.timeout`; cualquier error → `failed` y `console.error("[platform] …")` sin datos.
  - `ResourceCard` ampliado (compatible con lo actual): `+ title?: Record<Locale, string>; meta?: Record<Locale, string>; titleLang?: "es" | "en"; href?: string; external?: boolean`. Las tarjetas estáticas actuales pasan a llamarse `FALLBACK_RESOURCE_CARDS` (mismo contenido; `RESOURCE_CARDS` se mantiene como alias para no romper la home).
  - `getPublicResourceCards(deps?): Promise<{ source: "db" | "fallback"; cards: ResourceCard[] }>`: con datos, una tarjeta por fila; desbloqueadas: video del array `VIDEOS` → `target: "videos"` (ancla `#video-<id>` como hoy), otro video → `href` de `youtubeWatchUrl` con `external`, enlace → `external_url` con `external`, archivo → `/api/resource-file/<id>`; bloqueadas → `state: "locked"` (el componente enlaza al login); tipo de icono: `video→video, document→worksheets, worksheet→worksheets, vocabulary→vocabulary, recording→recordings, coursework→coursework, link→lessons`; **un nivel sin filas usa las tarjetas de respaldo de ese nivel** (la página nunca pierde su forma). Error o sin configurar → todo respaldo.
  - `LearnItem` ampliado: `+ title?: Record<Locale, string>; slug?: string; locked?: boolean; external?: false`. `getLearnCategories(deps?): Promise<{ source: "db" | "fallback"; categories: LearnCategory[] }>`: el esqueleto (5 categorías, tonos, niveles A1–C2) sigue siendo el de `catalog.ts`; con datos, Fundamentos = sus lecciones en orden; las categorías por nivel muestran para cada nivel sus lecciones o un hueco "Nivel X · Próximamente"; `component_key` `alphabet`/`nouns` → `lesson: "learnAlphabet" | "learnNouns"` (rutas actuales); artículo desbloqueado → `slug`; bloqueado → `slug` + `locked`. Respaldo = `LEARN_CATEGORIES` actual.
  - `getPublicLesson(slug: string, deps?): Promise<PublishedLessonDetail | null>` (null también si falla).
  - `appLoginUrl(locale, next?: string): string` (añade `?next=` solo si `next` empieza por `/${locale}/student/`).

- [ ] **Step 1: Test** `getRpc returns not_configured without env and makes no request`, `getRpc uses GET with the tag and revalidate`, `supabaseHeaders sends Bearer only for JWT keys`, `getRpc maps a 500 and a timeout to failed`, `getPublicResourceCards falls back entirely when the DB fails`, `a tier with no DB rows keeps its fallback cards`, `a locked DB row has no href and state locked`, `a DB video that is in VIDEOS targets the videos section`, `a DB file resource links to /api/resource-file/<id>`, `getLearnCategories maps component keys to the existing routes`, `an empty level shows a coming-soon slot`, `a locked article keeps its slug and is marked locked`, `appLoginUrl ignores a next outside /<locale>/student/`. Los tests existentes de `resources.test.ts` y `catalog.test.ts` siguen pasando sobre el respaldo.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/web test` · Expected: FAIL.
- [ ] **Step 3:** Implementar sin dependencias nuevas salvo `@spanglish/content`.
- [ ] **Step 4:** Run `pnpm --filter @spanglish/web test && pnpm typecheck` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(web): lectura de contenido publicado con respaldo estático`.

### Task 13: Página Recursos desde la base y descarga pública firmada

**Files:**
- Create: `apps/web/src/app/api/resource-file/[id]/route.ts`, `apps/web/src/lib/resource-file.ts`, `apps/web/src/lib/resource-file.test.ts`
- Modify: `apps/web/src/app/[locale]/resources/page.tsx`, `apps/web/src/components/resources/ResourcesPage.tsx` (recibe `cards: ResourceCard[]` por props; `ResourceTile` usa `title`/`meta`/`titleLang`/`href`/`external` cuando vienen de la base; los candados enlazan a `appLoginUrl(locale, "/<locale>/student/resources")`), `apps/web/messages/{es,en}.json` (`page.resources.access.external`: "se abre en una pestaña nueva")

**Interfaces:**
- Consumes: `getPublicResourceCards`, `platformEnv`, `supabaseHeaders`, `getRpc` (Task 12).
- Produces: `signPublicResourceFile(id: string, deps?): Promise<{ ok: true; url: string } | { ok: false; status: 404 | 503 }>` (`id` no UUID → 404; `getRpc("resource_file_path", { p_resource_id }, { cache: "no-store" })` null → 404; `POST {url}/storage/v1/object/sign/resource-files/<path>` con `{ expiresIn: 120 }` y las cabeceras anon → URL absoluta); `GET /api/resource-file/[id]` → `302` a la URL firmada con `Cache-Control: no-store`, 404 o 503.
- Qué se enseña de lo bloqueado (recomendado): título, resumen, nivel y tipo; nunca enlace, miniatura privada ni archivo; la administradora puede ocultar del todo una tarjeta bloqueada desmarcando "Mostrar en la web aunque esté bloqueado" (`teaser_public`).

- [ ] **Step 1: Test** `signPublicResourceFile returns 404 for a non-uuid`, `returns 404 when resource_file_path is null`, `returns 503 when the platform is not configured`, `posts to the sign endpoint of resource-files with expiresIn 120`; `getPublicResourceCards gives a locked DB card the login href with next=/es/student/resources`; el render real (enlace externo con `rel="noopener noreferrer"` y aviso de pestaña nueva, candado al login) lo prueba la e2e de plataforma de Task 19. La e2e actual de la web (`pages.spec.ts`, sin Supabase) sigue verde con el respaldo.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/web test` · Expected: FAIL.
- [ ] **Step 3:** Implementar. La página `/resources` pasa a ser `async` y llama a `getPublicResourceCards()`; JSON-LD sin cambios.
- [ ] **Step 4:** Run `pnpm --filter @spanglish/web test && pnpm --filter @spanglish/web e2e` · Expected: PASS.
- [ ] **Step 5:** Commit `feat(web): recursos desde la plataforma y descarga pública firmada`.

### Task 14: Aprende ahora desde la base, lecciones artículo y sitemap

**Files:**
- Create: `apps/web/src/app/[locale]/learn/[slug]/page.tsx`, `apps/web/src/components/learn/{ArticleLesson.tsx,ArticleBlocks.tsx,QuizBlock.tsx}`, `apps/web/src/components/learn/article.test.tsx`
- Modify: `apps/web/src/app/[locale]/learn/page.tsx` (usa `getLearnCategories()`; los elementos bloqueados enlazan a `appLoginUrl(locale, "/<locale>/student/learn/<slug>")` con candado y "Entra para verla"; los artículos abiertos a `/<locale>/learn/<slug>`), `apps/web/src/lib/routes.ts` (+ `learnLessonPath(locale: Locale, slug: string): string`), `apps/web/src/lib/seo.ts` (+ `articleLessonMetadata(locale: Locale, lesson: PublishedLessonDetail["lesson"]): Metadata` con canonical y `alternates.languages` es/en), `apps/web/src/app/sitemap.ts` (async: entradas actuales + artículos públicos publicados; si falla, solo las actuales), `apps/web/messages/{es,en}.json` (`page.learn.locked`, `page.learn.article.*`, `page.learn.quiz.*`)

**Interfaces:**
- Consumes: `getLearnCategories`, `getPublicLesson` (Task 12), `parseTextBlock`, `pick` (Task 1), `VideoCard` existente para los bloques de video.
- Produces:
  - `/[locale]/learn/[slug]`: `generateStaticParams() → []`, `dynamicParams = true`, `revalidate = 300`; `getPublicLesson(slug)` null → `notFound()`; las rutas estáticas `learn/alphabet` y `learn/nouns-and-articles` ganan a la dinámica (Next prioriza segmentos estáticos). Migas en JSON-LD (Inicio › Recursos › Aprende ahora › lección), nada más.
  - `ArticleLesson({ locale, lesson })` (estilo de las lecciones actuales: `PageHero` morado, contenedor y tipografía de `LessonPage`), `ArticleBlocks({ blocks, locale })` (mismo mapeo que `LessonBlocks` del portal pero con componentes de la web; imagen con `next/image` `unoptimized` y URL pública de `content-media`; video con `VideoCard` sin miniatura local: fondo de marca), `QuizBlock` (cliente; mismo comportamiento accesible que en el portal).
  - `contentMediaUrl(path: string): string | null` en `platform.ts` (`{SUPABASE_URL}/storage/v1/object/public/content-media/<path>`).

- [ ] **Step 1: Test** Vitest `ArticleBlocks renders '<img src=x onerror=alert(1)>' in a text block as literal text`, `QuizBlock marks the right answer and explains`, `articleLessonMetadata sets canonical /es/learn/<slug> and both alternates`, `sitemap keeps the static entries when the platform fails`. La e2e actual `shop-learn.spec.ts` (sin Supabase) sigue verde: el hub muestra las mismas lecciones del respaldo.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/web test` · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run `pnpm --filter @spanglish/web test && pnpm --filter @spanglish/web e2e && pnpm build` · Expected: PASS (el build sin variables usa el respaldo).
- [ ] **Step 5:** Commit `feat(web): Aprende ahora desde la plataforma y lecciones artículo`.

### Task 15: Revalidación a demanda

**Files:**
- Create: `apps/web/src/app/api/revalidate/route.ts`, `apps/web/src/lib/revalidate.ts`, `apps/web/src/lib/revalidate.test.ts`
- Modify: `.env.example` (`REVALIDATE_SECRET` en la web; recordar que es el mismo valor que `WEB_REVALIDATE_SECRET` del portal)

**Interfaces:**
- Consumes: `WEB_CONTENT_TAG` (Task 12); `pingWebRevalidate` (Task 5) es quien llama.
- Produces: `isAuthorizedRevalidate(header: string | null, secret: string | undefined): boolean` (`Bearer <secret>`, comparación en tiempo constante con `crypto.timingSafeEqual` sobre buffers de igual longitud; secreto ausente o de menos de 32 caracteres → false); `POST /api/revalidate` → sin secreto configurado `503`; no autorizado `401`; si no, `revalidateTag(WEB_CONTENT_TAG, { expire: 0 })` y `204`. (Next 16 exige el segundo argumento de `revalidateTag`; comprobar la firma en `node_modules/next/dist/docs` antes de implementar. `/api` queda fuera del proxy de la web, que solo gestiona idiomas.) `GET` → `405`.

- [ ] **Step 1: Test** `isAuthorizedRevalidate accepts the exact bearer`, `rejects a wrong secret of the same length`, `rejects when the secret is shorter than 32 chars`, `rejects a missing header`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/web test` · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run · Expected: PASS. (La prueba de punta a punta "publicar en el portal → visible en la web" está en Task 19.)
- [ ] **Step 5:** Commit `feat(web): revalidación del contenido a demanda`. Abrir PR "Demo-4".

---

## Fase 5. Entorno demo (PR "Demo-5")

### Task 16: Validación de variables, configuración de Vercel y caché de Turbo

**Files:**
- Create: `apps/web/src/lib/env.ts`, `apps/web/src/lib/env.test.ts`, `apps/app/src/lib/env.ts`, `apps/app/src/lib/env.test.ts`, `apps/web/vercel.json`, `apps/app/vercel.json`
- Modify: `apps/web/next.config.ts`, `apps/app/next.config.ts`, `turbo.json`, `.env.example` (tabla de "Contratos": cada variable con app y comentario)

**Interfaces:**
- Produces:
  - `type EnvCheck = { ok: true; warnings: string[] } | { ok: false; problems: string[]; warnings: string[] }`.
  - `checkWebEnv(env: Record<string, string | undefined>): EnvCheck`: problemas (en español, una línea por variable, nunca con su valor): `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_APP_URL` ausentes o no `https://` (en Vercel); `SUPABASE_URL`/`SUPABASE_ANON_KEY` solo una de las dos; `SUPABASE_SERVICE_ROLE_KEY` presente ("la clave de servicio no puede estar en la web"); `SUPABASE_ANON_KEY` que sea de servicio (JWT con `role = service_role` o prefijo `sb_secret_`); par de Stripe incompleto o `STRIPE_SECRET_KEY` que empiece por `sk_live_` con `SITE_INDEXING` distinto de `on`; trío de Resend incompleto; `REVALIDATE_SECRET` de menos de 32; `LEADS_LOG_ONLY=1` con `SITE_INDEXING=on`. Avisos: sin Supabase (se usa el respaldo), sin Resend, sin Stripe.
  - `checkAppEnv(env): EnvCheck`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` obligatorias; `SUPABASE_SERVICE_ROLE_KEY` obligatoria en Vercel; la clave pública no puede ser de servicio; par `WEB_REVALIDATE_URL` (`https://…/api/revalidate`) + `WEB_REVALIDATE_SECRET` (≥ 32) completo o ausente.
  - `WEB_ENV_NAMES: readonly string[]` y `APP_ENV_NAMES: readonly string[]` (todas las variables que lee cada comprobación; las usa Task 20 para verificar la documentación).
  - `assertEnv(check: EnvCheck, app: "web" | "app"): void` (lanza `Error` con "Variables de entorno de <app> inválidas:\n- …"; imprime los avisos con `console.warn`).
  - `next.config.ts` de cada app: `if (process.env.VERCEL === "1") assertEnv(check…Env(process.env), …)` → el build de Vercel falla con el mensaje legible; en local y CI no se valida (los builds sin variables siguen funcionando con el respaldo).
  - `vercel.json` de cada app: `{ "$schema": "https://openapi.vercel.sh/vercel.json", "installCommand": "pnpm install --frozen-lockfile", "ignoreCommand": "npx turbo-ignore --fallback=HEAD^1" }`.
  - `turbo.json`: `tasks.build.env = ["NEXT_PUBLIC_*", "SITE_INDEXING", "VERCEL", "VERCEL_ENV"]` (las variables que entran en el resultado del build; sin esto Turbo reutiliza un build hecho con otra URL).

- [ ] **Step 1: Test** `checkWebEnv rejects the service role key`, `rejects an anon key whose JWT role is service_role`, `rejects SUPABASE_URL without SUPABASE_ANON_KEY`, `rejects LEADS_LOG_ONLY with indexing on`, `accepts a minimal demo env and warns about missing Resend`, `problems never include variable values`; `checkAppEnv requires the service key on Vercel`, `rejects half of the revalidate pair`; `turbo build env includes NEXT_PUBLIC_* and SITE_INDEXING` (lee `turbo.json`).
- [ ] **Step 2:** Run `pnpm test` · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run `pnpm test && pnpm build` · Expected: PASS; `VERCEL=1 pnpm --filter @spanglish/web build` sin variables · Expected: FAIL con la lista legible.
- [ ] **Step 5:** Commit `chore: validación de variables y configuración de Vercel`.

### Task 17: Interruptor de indexación y comprobación de salud

**Files:**
- Create: `apps/web/src/lib/indexing.ts`, `apps/web/src/lib/indexing.test.ts`, `apps/web/src/app/api/health/route.ts`, `apps/app/src/app/robots.ts`, `apps/app/src/app/api/health/route.ts`, `apps/app/src/lib/health.ts`, `apps/app/src/lib/health.test.ts`
- Modify: `apps/web/src/app/robots.ts`, `apps/web/next.config.ts` (`headers()`), `apps/app/next.config.ts` (`headers()`), `apps/web/src/lib/seo.test.ts`

**Interfaces:**
- Produces:
  - `indexingEnabled(env?: NodeJS.ProcessEnv): boolean` = `env.VERCEL_ENV === "production" && env.SITE_INDEXING === "on"` (en local `next start` y en preview: nunca indexa).
  - Web: `robots()` con indexación → lo actual; sin ella → `{ rules: { userAgent: "*", disallow: "/" } }` sin `sitemap`. `headers()` sin indexación → `[{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]`.
  - App: `robots()` siempre `disallow: "/"`; `headers()` siempre `X-Robots-Tag: noindex, nofollow` (el portal es privado).
  - `GET /api/health` (web y app): `{ status: "ok" | "degraded", app: "web" | "app", commit: string | null (VERCEL_GIT_COMMIT_SHA, 7 caracteres), indexing: boolean, db: "ok" | "not_configured" | "unreachable" }` con `Cache-Control: no-store`; `db` con `health_ping` (web: `getRpc(..., { cache: "no-store" })`; app: cliente anon de `@supabase/supabase-js` sin cookies, en `lib/health.ts` `checkDatabase(client): Promise<"ok" | "unreachable">`). HTTP 200 siempre (es un informe, no un guard); no devuelve datos ni variables. La ruta de la app vive bajo `/api`, fuera del guard del proxy, a propósito y sin datos.

- [ ] **Step 1: Test** `indexingEnabled is false without VERCEL_ENV production`, `is false in production when SITE_INDEXING is not 'on'`, `robots disallows everything and drops the sitemap when indexing is off`, `web headers add X-Robots-Tag when indexing is off`, `app robots always disallows`, `checkDatabase returns unreachable when the rpc errors`.
- [ ] **Step 2:** Run `pnpm test` · Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run `pnpm test && pnpm build && pnpm --filter @spanglish/web e2e` · Expected: PASS (`seo.test.ts` ajustado: el `robots` con indexación se prueba pasando el env).
- [ ] **Step 5:** Commit `feat: noindex por entorno y comprobación de salud`.

### Task 18: Script de datos de demo

**Files:**
- Create: `apps/app/scripts/demo-seed.ts`, `apps/app/src/lib/demo/demo-data.ts`, `apps/app/src/lib/demo/demo-data.test.ts`
- Modify: `apps/app/package.json` (devDep `tsx`; script `"demo:seed": "tsx --env-file=.env.demo.local scripts/demo-seed.ts"`), `.env.example` (bloque comentado `DEMO_*`, recordando que va en `apps/app/.env.demo.local`, ignorado por `.gitignore` `.env.*`)

**Interfaces:**
- Produces:
  - `DEMO_ID(n: number): string` → `de000000-0000-4000-8000-<n en 12 dígitos>`; todo lo que crea el script usa estos ids (idempotente con `upsert`) y títulos que empiezan por `DEMO · `.
  - `assertDemoTarget(env): { url: string; serviceKey: string; projectRef: string }`: exige `NEXT_PUBLIC_SUPABASE_URL` `https://<ref>.supabase.co`, `SUPABASE_SERVICE_ROLE_KEY` y `DEMO_SEED_PROJECT_REF === <ref>` (evita sembrar en el proyecto equivocado); rechaza `127.0.0.1`/`localhost` (en local está `seed.sql`).
  - `demoUsers(env): DemoUser[]` (dominio `DEMO_EMAIL_DOMAIN`, por defecto `demo.spanglish.test`; si el Auth remoto rechaza ese dominio, usar uno propio sin buzón): `admin.demo@demo.spanglish.test` (roles `admin`), `teacher.demo@…` (`teacher`), `student.demo@…` (`student` + ficha `students` adulta activa "DEMO · Alumna"), `visitor.demo@…` (`student` sin ficha: nivel "con cuenta"); contraseñas de `DEMO_PASSWORD_ADMIN|TEACHER|STUDENT|VISITOR` (≥ 12 caracteres; si falta alguna, error que las lista). `type DemoUser = { key: "admin" | "teacher" | "student" | "visitor"; email: string; password: string; fullName: string; initialRole: "teacher" | "student"; extraRoles: ("admin")[]; studentRow: boolean }`.
  - `buildDemoContent(): { resources: TablesInsert<"resources">[]; lessons: TablesInsert<"lessons">[]; blocks: TablesInsert<"lesson_blocks">[]; files: { resourceId: string; path: string; bytes: Uint8Array; mime: string }[]; locations: TablesInsert<"locations">[]; programs: TablesInsert<"programs">[] }`: recursos —ficha pública PDF "DEMO · Saludos básicos", enlace con cuenta, video de alumnos (id de uno de los videos de Maribel), ficha de alumnos PDF "DEMO · Deberes semana 1"— y lecciones —artículo público "DEMO · Los colores" (Fundamentos; texto, video, pregunta), artículo con cuenta "DEMO · Presentarse" (Adultos A1), artículo de alumnos "DEMO · El pretérito" (Adultos B1)—; dos sedes (biblioteca de Sunshine Coast, online) y un programa con edición, solo si existen esas tablas (1B Task 6).
  - `minimalPdf(title: string): Uint8Array` (PDF de una página válido, sin dependencias).
  - `parseArgs(argv: string[]): { command: "seed" | "remove"; dryRun: boolean }` (lanza con un uso legible ante cualquier otro argumento).
  - Script: `seed` (por defecto) → crea o actualiza usuarios con `auth.admin.createUser({ email_confirm: true, app_metadata: { initial_role } })` o `updateUserById` (contraseña), inserta `user_roles` admin con `service_role` (no pasa por `initial_role`, que nunca da admin), ficha `students` + `student_private` sin email ni teléfono, contenido con `upsert`, archivos con `storage.upload(..., { upsert: true })`, la miniatura y una imagen de bloque desde `brand/logo-spanglish.png`; `remove` → borra exactamente los `DEMO_ID` y los cuatro usuarios; `--dry-run` (con `seed` o `remove`) valida el destino y las variables e imprime lo que haría sin escribir. Imprime un resumen sin contraseñas. Las guardas no tocan ni se parecen a la de `seed.sql`: `seed.sql` solo corre en local (`db reset`) y este script solo contra un proyecto `*.supabase.co` cuyo ref coincida.

- [ ] **Step 1: Test** `assertDemoTarget rejects a ref that does not match the URL`, `rejects localhost`, `demoUsers lists every missing password variable`, `buildDemoContent ids all start with de000000`, `every demo title starts with 'DEMO · '`, `demo lessons satisfy blockSchema and lessonSchema`, `demo content has one resource per access level and one lesson per access level`, `minimalPdf starts with %PDF- and ends with %%EOF`, `parseArgs accepts seed, remove and --dry-run and rejects anything else`, `no demo text contains an email or phone pattern`.
- [ ] **Step 2:** Run `pnpm --filter @spanglish/app test` · Expected: FAIL.
- [ ] **Step 3:** Implementar `demo-data.ts` (puro) y el script (fino: lee env, llama a lo puro, escribe con `@supabase/supabase-js`).
- [ ] **Step 4:** Run `pnpm --filter @spanglish/app test && pnpm typecheck` · Expected: PASS.
- [ ] **Step 5:** Commit `chore(app): script de datos de demo`.

### Task 19: e2e del flujo de la demo (portal y web contra Supabase local) y CI

**Files:**
- Create: `apps/app/e2e/demo-flow.spec.ts`, `apps/web/playwright.platform.config.ts`, `apps/web/e2e-platform/content.spec.ts`, `apps/web/e2e-platform/helpers.ts`
- Modify: `apps/web/package.json` (script `"e2e:platform": "playwright test -c playwright.platform.config.ts"`), `.github/workflows/ci.yml` (job `e2e`: instalar Chromium también para `@spanglish/web`; tras la e2e del portal, `pnpm --filter @spanglish/web e2e` y `pnpm --filter @spanglish/web e2e:platform`)

**Interfaces:**
- Consumes: todo lo anterior; seed local de Task 2.
- Produces: `playwright.platform.config.ts` arranca la web en el puerto 3102 con `SUPABASE_URL`/`SUPABASE_ANON_KEY` leídos de `supabase status -o env` (como el `playwright.config.ts` del portal), `REVALIDATE_SECRET` de prueba y `LEADS_LOG_ONLY=1`; los helpers usan la clave de servicio local SOLO en el código de prueba para subir un archivo y publicar filas.

- [ ] **Step 1: Test** portal (`demo-flow.spec.ts`): `admin publishes an account-level link resource and the visitor sees it unlocked`, `an enrolled resource is locked for the visitor and unlocked for the student`, `admin builds an article lesson with text, video and quiz blocks, previews it in English and publishes it`, `the published public lesson is returned to anon by list_published_lessons`, `student opens an uploaded worksheet through a signed URL`, `unpublishing removes it from the visitor's list`. Web (`content.spec.ts`): `learn hub lists colores-local and links saludos-local to the portal login with next`, `an article lesson renders literal text and the quiz gives feedback`, `resources page shows DB cards per tier and the public worksheet redirects to a signed URL`, `POST /api/revalidate with the secret makes a newly published lesson visible on the next request`, `GET /api/health reports db ok and indexing false`, `every response carries X-Robots-Tag noindex`.
- [ ] **Step 2:** Run `pnpm supabase db reset && pnpm --filter @spanglish/app e2e demo-flow && pnpm --filter @spanglish/web e2e:platform` · Expected: PASS (si algo falla, se corrige en la tarea dueña).
- [ ] **Step 3:** Actualizar `ci.yml` y comprobar en el PR que el job `e2e` ejecuta las tres suites.
- [ ] **Step 4:** Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` · Expected: verde.
- [ ] **Step 5:** Commit `test: e2e del flujo de la demo y web contra la plataforma en CI`.

### Task 20: Guía de despliegue, referencia de variables, comandos y checklist de salida

Deja todo listo para configurar y desplegar en cuanto existan las cuentas. Nada de esta tarea necesita cuentas.

**Files:**
- Create: `docs/despliegue.md`, `packages/content/src/env-reference.ts` (+ export en `index.ts`), `apps/web/src/lib/env-reference.test.ts`, `apps/app/src/lib/env-reference.test.ts` (cada app comprueba sus propias variables leyendo `../../docs/despliegue.md` y `../../.env.example` con `fs`; sin imports entre apps)
- Modify: `package.json` raíz (scripts de abajo), `README.md` (sección corta "Entorno demo" que enlaza a `docs/despliegue.md`), `.env.example` (cabecera: "la referencia completa está en docs/despliegue.md"), `docs/superpowers/plans/2026-11-08-hito1b-nucleo-operativo.md` (nota en la tabla de fases: migraciones de Fase 3+ con el siguiente número libre; nota en Task 13: reemplazar `has_enrolled_access()`)

**Interfaces:**
- Produces:
  - Scripts raíz (envoltorios finos de la CLI, para no teclear mal): `"db:link": "supabase link --project-ref"` (uso: `pnpm db:link <ref>`), `"db:push:dry": "supabase db push --dry-run"`, `"db:push": "supabase db push"`, `"db:remote:types": "supabase gen types typescript --linked --schema public"` (solo para comparar con `packages/db`; nunca sobrescribe). **No** se añaden scripts para `db reset --linked`, `--include-seed` ni `config push`. Los buckets no tienen comando propio: los crea la migración 0011 al hacer `db push`.
  - `apps/app` `demo:seed` (Task 18) admite `--dry-run` (imprime qué crearía, sin escribir) y `remove`.
  - `docs/despliegue.md` con estas secciones, en este orden:
    1. **Arquitectura en 5 líneas** (dos proyectos Vercel, un Supabase en Sídney, quién habla con quién, qué ve anon).
    2. **Referencia de variables:** una tabla con TODAS las variables de "Contratos" (columnas: variable, app(s), dónde se usa —archivo—, ¿secreta?, ¿`NEXT_PUBLIC_` (va al navegador)?, obligatoria en demo / en producción, valor de ejemplo con forma pero no real —p. ej. `https://abcdefghijklmnop.supabase.co`, `eyJ…` / `sb_publishable_…`, `openssl rand -hex 32`—, qué pasa si falta).
    3. **Comandos paso a paso** (bloques copiables): enlazar y subir migraciones (`pnpm supabase login`, `pnpm db:link <ref>`, `pnpm db:push:dry`, `pnpm db:push`), verificar buckets (consulta SQL `select id, public, file_size_limit, allowed_mime_types from storage.buckets;`), primera admin por SQL, crear `apps/app/.env.demo.local` y `pnpm --filter @spanglish/app demo:seed --dry-run` → `demo:seed`, `demo:seed remove`, generar secretos, comprobar salud y `noindex` con `curl`. Advertencias en negrita: nunca `db reset --linked`, `db push --include-seed`, `config push`, Branching ni `seed.sql` contra remoto (su guarda aborta, pero no se intenta).
    4. **Checklist de salida a demo** y **Checklist de salida a producción** (las Checklists M1–M4 del final del plan, copiadas y mantenidas aquí como fuente única).
    5. **Guion de la demo** (el de abajo).
    6. **Pasar de demo a producción:** proyecto Supabase nuevo, `SITE_INDEXING=on`, claves `live`, dominio real, Supabase de pago, borrar datos `DEMO`.
  - `missingFromReference(docText: string, names: readonly string[]): string[]` y `envExampleNames(text: string): string[]` en `packages/content/src/env-reference.ts` (puras): devuelven las variables de `names` que no aparecen como `` `NOMBRE` `` en la tabla de `docs/despliegue.md`, y los nombres definidos en `.env.example`. La web comprueba `WEB_ENV_NAMES`, el portal `APP_ENV_NAMES` (Task 16) y los dos `.env.example`.

- [ ] **Step 1: Test** `every variable read by checkWebEnv and checkAppEnv is documented in docs/despliegue.md`, `every variable in .env.example is documented`, `the doc never contains a value that looks like a real key (eyJ… longer than 40 chars, sk_live_, sk_test_ with 20+ chars, sb_secret_)`.
- [ ] **Step 2:** Run el test · Expected: FAIL (el documento no existe).
- [ ] **Step 3:** Escribir `docs/despliegue.md`, los scripts y las notas en el plan 1B. Añadir `WEB_ENV_NAMES`/`APP_ENV_NAMES` a los módulos de Task 16 si no estaban.
- [ ] **Step 4:** Run el test, `pnpm typecheck && pnpm lint && pnpm test && pnpm build` · Expected: verde. Run `pnpm db:push:dry` sin proyecto enlazado · Expected: error de la CLI "no linked project" (el script existe y no hace nada peligroso).
- [ ] **Step 5:** Commit `docs: guía de despliegue, referencia de variables y checklists`. Abrir PR "Demo-5".

#### Guion de la demo (con Maribel)
1. **Web pública (3 min)** en `https://<web>/es`: Inicio → Lecciones → Precios → Recursos (videos, tres niveles de acceso con candados) → Aprende ahora (Fundamentos con El alfabeto, Sustantivos y "DEMO · Los colores"; niveles de Niños y Adultos con "Próximamente" y una lección con candado) → abrir El alfabeto y hacer un ejercicio → cambiar a English.
2. **Entrar como administradora (1 min):** botón "Entrar" del menú → login con `admin.demo@demo.spanglish.test` → panel.
3. **Crear un recurso (2 min):** Recursos → Nuevo → tipo "Ficha", nivel "Libre", títulos en español e inglés → guardar → subir un PDF → Publicar.
4. **Crear una lección (3 min):** Lecciones → Adultos › A1 → Añadir → título y slug → bloques: texto, video (pegar una URL de YouTube de Maribel), pregunta de 3 opciones → Vista previa en inglés → Publicar.
5. **Verlo en la web (1 min):** recargar Recursos y Aprende ahora de la web: aparecen la ficha (descarga) y la lección (abrirla y responder la pregunta).
6. **Niveles de acceso (3 min):** cerrar sesión; entrar como `visitor.demo@…` → Recursos: lo "Con cuenta" abierto, lo de alumnos con candado; entrar como `student.demo@…` → todo abierto, abrir la ficha de alumnos y la lección "El pretérito".
7. **Qué viene después (2 min):** grupos, calendario, asistencia y pagos (plan 1B), y las preguntas abiertas de este plan.

---

## Fase 6 (opcional, diferible). Productos de la tienda (PR "Demo-6")

Se puede ejecutar después de la demo o dejar para el hito 3. Mantiene Stripe Checkout con las líneas construidas EN EL SERVIDOR, ahora desde la base; la entrega de archivos sigue siendo manual.

### Task 21: Productos en la base (0012)

**Files:**
- Create: `supabase/migrations/0012_shop_products.sql`, `supabase/tests/database/shop_products.test.sql`
- Modify: `packages/db/src/database.types.ts`

**Interfaces:**
- Produces (SQL): `products(id, slug text unique check ~ '^[a-z0-9]+(-[a-z0-9]+)*$' ≤80, name_es, name_en text not null ≤120, name_lang text null check in ('es','en'), summary_es, summary_en text null ≤500, price_cents integer not null check between 0 and 100000, compare_at_cents integer null check (compare_at_cents > price_cents), currency text not null default 'AUD' check (currency = 'AUD'), image_path text null check ~ '^products/', image_width, image_height smallint null, file_path text null, status content_status default 'draft', sort_order integer not null, created_at, updated_at)`; la oferta es `compare_at_cents is not null` (sin columna aparte). Bucket privado `product-files` (25 MB, PDF/PNG/JPEG/DOCX/PPTX) solo admin, sin lectura para nadie más (la entrega sigue siendo manual). RLS: solo admin. `public.list_published_products() returns table (slug, name_es, name_en, name_lang, summary_es, summary_en, price_cents, compare_at_cents, image_path, sort_order)` (anon, sin `file_path`); `public.checkout_lines(p_slugs text[]) returns table (slug text, name_es text, name_en text, price_cents integer)` (anon; solo publicados; ignora repetidos; más de 10 → `22023`). Datos en la migración: los tres productos actuales de `apps/web/src/lib/shop.ts` (mismos slugs, precios y precios anteriores), publicados, `image_path` null (la web usa su imagen local por slug). `enable_audit`.

- [ ] **Step 1: Test** `anon reads published products without file_path`, `anon cannot select products directly`, `checkout_lines ignores drafts and unknown slugs`, `checkout_lines with 11 slugs raises 22023`, `compare_at below price is rejected`, `only admin writes products and product-files`, `the migration ships the three current products with their prices`.
- [ ] **Step 2–4:** Run `pnpm supabase test db` (FAIL) → escribir → `pnpm supabase db reset && pnpm supabase test db && pnpm db:types` (PASS).
- [ ] **Step 5:** Commit `feat(db): productos de la tienda`.

### Task 22: Gestión de productos en el portal

**Files:**
- Create: `apps/app/src/app/[locale]/(shell)/admin/products/{page.tsx,new/page.tsx,[productId]/page.tsx,ProductForm.tsx,actions.ts}`, `apps/app/src/lib/schemas/products.ts`, `apps/app/src/lib/schemas/products.test.ts`, `apps/app/e2e/admin-products.spec.ts`
- Modify: `apps/app/src/lib/nav.ts` (`products`), `apps/app/src/lib/uploads.ts` (+ objetivos `productImage`, `productFile`), mensajes

**Interfaces:**
- Consumes: `parseAudToCents`, `formatAud` (1B Task 4), `FileUpload`, `BilingualField`, `MoveButtons`, `pingWebRevalidate`.
- Produces: `productSchema` (precio y precio anterior con `parseAudToCents`; anterior > precio), acciones `saveProduct`, `setProductPublished`, `moveProduct` (RPC `move_product` análoga a `move_resource`, añadida en 0012), `deleteProduct`.

- [ ] **Step 1: Test** `productSchema rejects a compare-at price lower than the price`, `parses '2.00' to 200`; e2e `admin edits the price of a product, marks it on sale and the list shows the struck price`, `admin uploads the downloadable file and it is not publicly reachable`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(app): gestión de productos de la tienda`.

### Task 23: La tienda de la web lee la base y el pago se construye desde ella

**Files:**
- Modify: `apps/web/src/lib/shop.ts` (`PRODUCTS` queda como respaldo), `apps/web/src/lib/content-source.ts` (+ `getShopProducts()`), `apps/web/src/lib/checkout.ts` (+ test), `apps/web/src/app/[locale]/shop/page.tsx`, `apps/web/src/components/shop/{ProductCard.tsx,ProductPreviews.tsx}`

**Interfaces:**
- Produces: `getShopProducts(deps?): Promise<{ source: "db" | "fallback"; products: Product[] }>` (imagen de `content-media` si `image_path`, si no la local por slug); `createCheckoutSession(ids, locale, deps?: { lines?: (slugs: string[]) => Promise<CheckoutLine[] | null> })`: con plataforma configurada usa `checkout_lines` (sin caché) y si falla responde `unavailable` (nunca cobra con precios del respaldo cuando la base está configurada pero no responde); sin plataforma, el comportamiento actual.

- [ ] **Step 1: Test** `checkout builds Stripe line items from checkout_lines prices`, `an unknown or draft slug is dropped`, `checkout returns unavailable when the platform is configured but fails`, `without platform env checkout keeps using PRODUCTS`, `the shop page falls back to PRODUCTS when the DB fails`.
- [ ] **Step 2–4:** FAIL → implementar → `pnpm --filter @spanglish/web test && pnpm --filter @spanglish/web e2e` PASS.
- [ ] **Step 5:** Commit `feat(web): tienda desde la plataforma con pago construido en el servidor`. Abrir PR "Demo-6".

---

## Decisiones del planificador

1. **Hito Demo entre 1B Fase 2 y Fase 3, con migraciones 0010–0011** (0012 si hay tienda). Por qué: lo pide el controlador y Supabase aplica en orden de número. Coste si es erróneo: renumerar es fácil SOLO antes de `db push` al remoto; después, hay que crear migraciones nuevas, nunca renombrar.
2. **La web no recibe ningún privilegio de tabla: lee por cuatro RPC `security definer`** (`list_published_resources`, `list_published_lessons`, `get_published_lesson`, `resource_file_path`) que fijan columnas y filas. Por qué: mantiene la regla de 0006 ("anon no tiene nada"), controla exactamente qué se filtra de lo bloqueado y es el mismo patrón que `submit_lead` (1B). Las tablas tienen RLS para `authenticated` (portal y escritura). Coste: cada campo nuevo que deba ver la web se añade a la RPC.
3. **Orden de acceso como enum ordenado** (`public < account < enrolled`) y `content_tier()` central. Por qué: una sola comparación en políticas, RPC y Storage. Coste: un cuarto nivel exige reordenar con cuidado (los enum se pueden ampliar, no reordenar).
4. **"Alumno" = ficha `students` activa (o tutor de una)** como sustituto hasta las matrículas de 1B Fase 3, en `has_enrolled_access()` con comentario. Por qué: tras 1B Fase 2 existen fichas pero no matrículas; `has_role('student')` no sirve porque todas las cuentas nuevas reciben `student`. Coste: hasta 1B Task 13, una ficha activa sin grupo ve lo de alumnos.
5. **Docentes: leen todo lo publicado de cualquier nivel; no crean ni editan** (sin UI propia en este hito). Por qué: enseñan con ese material y el spec deja el editor de docentes para el hito 2; `created_by` ya se guarda para darles borradores propios después. Coste: Maribel crea todo el contenido de la demo.
6. **Lecciones nuevas = artículos con bloques en tabla propia** (`text`, `image`, `video`, `quiz`), no JSON. Por qué: cada bloque se edita, ordena y audita por separado con formularios simples, y los checks por tipo viven en la base. Texto con marcado mínimo (párrafos, listas `- `, `**negrita**`), nunca HTML. Diferido: arrastrar y soltar, ejercicios de escribir/arrastrar/emparejar, audio y pronunciación, puntuación y progreso del alumno, migración de las ~60 lecciones de WordPress (hito 2).
7. **Las dos lecciones interactivas siguen siendo código** y en la base son filas `kind = 'interactive'` con `component_key` (`alphabet`, `nouns`), siempre públicas, sin bloques, con slug inmutable. Por qué: no se pierde el trabajo hecho y la web conserva sus URL. Coste: una lección interactiva nueva necesita código.
8. **Una categoría por lección:** "Sustantivos y artículos" queda solo en Fundamentos (hoy aparece también en Adultos › A1). Por qué: evita una tabla de ubicaciones para un único caso. Coste: si Maribel la quiere en los dos sitios, tabla `lesson_placements` (ver pregunta 6).
9. **Respaldo estático en la web solo si la plataforma falla o no está configurada;** si responde, manda la base, pero un nivel de recursos sin filas conserva sus tarjetas estáticas y el esqueleto de Aprende (categorías y niveles) es fijo. Por qué: la web nunca se rompe ni se queda vacía. Coste: un nivel "vacío a propósito" no se puede mostrar vacío.
10. **Revalidación: caché de 300 s + aviso a demanda desde el portal** (`POST /api/revalidate` con secreto). Por qué: inmediato para la demo y para Maribel, y si el aviso falla el retraso máximo es 5 minutos; no se añade `pg_net` ni webhooks de base, que habría que mantener en local y en remoto. Coste: el portal conoce una URL de la web (contrato HTTP con dos variables, sin imports).
11. **Lectura por GET a PostgREST** para que el caché de datos de Next guarde las respuestas. Coste: argumentos solo de texto (las RPC usan `text` y `uuid`).
12. **Archivos privados en un único bucket `resource-files` con lectura por política según el nivel**, también para los recursos públicos (la web los firma con la clave anon). Por qué: al cambiar el nivel de un recurso no hay que mover archivos ni existe una URL pública permanente. Imágenes de contenido y miniaturas en `content-media` público. Coste: los PDF públicos no tienen URL estable (la tiene `/api/resource-file/<id>`).
13. **Lo que se enseña de lo bloqueado en la web:** título, resumen, nivel y tipo, con interruptor por elemento (`teaser_public`). Por qué: vende la matrícula sin filtrar contenido. Coste: si la dueña no quiere teasers, se desmarca por elemento o se cambia el valor por defecto.
14. **`@spanglish/content` (con zod) compartido por las dos apps** para constantes, tipos, `parseYouTubeId` y `parseTextBlock`; cada app pinta con sus propios componentes. Por qué: un solo contrato de datos sin imports entre apps. Coste: zod entra en el grafo de la web (antes no estaba).
15. **Entorno demo = rama `main` en dos proyectos Vercel de producción, con `noindex` salvo `SITE_INDEXING=on` en producción.** Por qué: Maribel lo abre sin cuenta de Vercel; las previews quedan protegidas; nada se indexa por accidente. Coste: al lanzar hay que poner `SITE_INDEXING=on` o la web no se indexará (va en el checklist de lanzamiento del hito 3 y lo recuerda `/api/health`).
16. **Proyecto Supabase de demo desechable**, distinto del de producción. Por qué: los datos y cuentas de demo no llegan a producción; `seed.sql` sigue siendo solo local. Coste: repetir la Checklist M1 para producción (ver pregunta 5).
17. **Datos de demo por script con `service_role` en la máquina del desarrollador**, ids `de000000-…`, títulos `DEMO · `, contraseñas en un `.env.demo.local` ignorado. Por qué: idempotente y borrable sin tocar nada real. Coste: un `tsx` más en `devDependencies`.
18. **Validación de variables en `next.config.ts` solo cuando `VERCEL=1`**: el build de Vercel falla con una lista legible; local y CI siguen construyendo sin variables. Coste: un error de variables se ve en el build, no en el arranque.
19. **Fusionar los PR apilados en `develop` en orden** (Checklist M0) en lugar de una rama de integración. Coste: hay que resolver `pnpm-lock.yaml` una vez.
20. **Videos en el portal sin miniatura de YouTube antes de pulsar** (fondo de marca o miniatura subida). Por qué: el mismo criterio de privacidad y rendimiento que la web. Coste: tarjetas menos vistosas si no se sube miniatura.

## Preguntas abiertas para la dueña/desarrollador
1. **¿Qué se ve en la web de lo que está bloqueado?** Propuesta: título, resumen y nivel con candado (desmarcable por elemento). Alternativa: solo el número ("3 recursos para alumnos"). Cambia Task 3 y Task 13.
2. **¿Las docentes deben poder crear borradores de recursos o lecciones ya?** Propuesta: no hasta el hito 2. Si sí: políticas de insert/update de borradores propios (`created_by`) y acceso a `/admin/lessons` desde el área docente.
3. **Cuando existan matrículas (1B Fase 3), ¿lo "de alumnos" se limita al nivel del grupo del alumno** (un alumno A2 no ve material de B1) o ve todo lo de alumnos? Cambia `has_enrolled_access()` y probablemente añade `content_tier` por nivel.
4. **Dominio de la demo:** `*.vercel.app` (gratis, inmediato) o `demo.spanglish.com.au` / `app-demo.spanglish.com.au` (necesita acceso al DNS). Cambia la Checklist M2 (paso de dominio) y las URL de Auth.
5. **¿El proyecto Supabase de demo se convierte en el de producción** (borrando los datos `DEMO`) o se crea otro al lanzar? Propuesta: otro.
6. **"Sustantivos y artículos" en Fundamentos y también en Adultos › A1** (como la web anterior), o solo en Fundamentos.
7. **¿Se enseña la tienda gestionada en la demo** (Fase 6) o basta con la tienda actual y pago de prueba?

## Fuera de este plan
- **Hito 2:** editor de docentes, ejercicios ricos (arrastrar, escribir, emparejar, audio), progreso y puntuación del alumno, grabaciones de clase con consentimiento, tareas de alumnos (bucket propio), migración de las ~60 lecciones, portal del tutor (los tutores ya cuentan como "alumnos" en `content_tier()` pero no tienen página).
- **1B Fases 3–6** sin cambios de alcance (solo numeración de migraciones y el reemplazo de `has_enrolled_access()` en Task 13).
- **Hito 3:** entrega automática de archivos de la tienda (enlace firmado por email desde el webhook), pedidos en BD, CMS del resto de la web, lanzamiento (`SITE_INDEXING=on`, Supabase de pago y de producción, claves `live`, 301 desde WordPress), limpieza de objetos huérfanos de Storage.

## Checklists manuales (cuando existan las cuentas)

Separadas del código a propósito: ninguna tarea de las Fases 1–6 espera por ellas. Se siguen en orden. La copia viva está en `docs/despliegue.md` (Task 20); si cambian, se cambian allí.

### Checklist M0 — Ramas (solo GitHub; antes de empezar el hito)
1. `gh pr merge 2 --merge` (#2 `chore/project-foundation` → `develop`).
2. Para #3, #5 y #6 en orden: `gh pr edit <n> --base develop`, CI verde, `gh pr merge <n> --merge`.
3. `feat/1b-fase1`: `git fetch && git rebase origin/develop`; conflictos esperados en `pnpm-lock.yaml` (regenerar con `pnpm install`, nunca a mano), `.env.example`, `README.md`, `ci.yml` (unión). `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm build` verde → `gh pr edit 7 --base develop` → fusionar.
4. Igual con el PR de `feat/1b-fase2` cuando esté terminado.
5. #4 (ImgBot): fusionar solo si sus imágenes siguen existiendo tras #6; si no, cerrar. #1 (Renovate): cuando se quiera.
6. `git checkout develop && git pull && git checkout -b feat/demo-fase1`; `supabase/migrations` debe terminar en `0009_people.sql`.

### Checklist M1 — Supabase cloud (necesita: cuenta de Supabase, gestor de contraseñas)
1. New project `spanglish-demo`, región **Sydney (ap-southeast-2)**, plan gratuito; contraseña de BD generada y guardada en el gestor. Anotar el `project-ref`.
2. En `develop` actualizado: `pnpm supabase login` → `pnpm db:link <ref>` → `pnpm db:push:dry` (debe listar 0001…0011 y nada más) → `pnpm db:push`. Nunca `db reset --linked`, `--include-seed`, `config push` ni Branching.
3. SQL Editor: `select id, public, file_size_limit from storage.buckets;` → `content-media` (público, 2097152) y `resource-files` (privado, 26214400).
4. Authentication → Providers: Email activado; **"Allow new users to sign up" desactivado**; confirmación de email desactivada; contraseña mínima 10.
5. Authentication → Emails → "Reset password": pegar `supabase/templates/recovery.html` (1B Task 3). El SMTP por defecto basta para la demo.
6. Project Settings → API Keys: guardar en el gestor URL, clave pública (anon o `sb_publishable_…`) y clave de servicio (`service_role` o `sb_secret_…`). Advisors → Security sin "RLS disabled".
7. Crear `apps/app/.env.demo.local` (ignorado por git) con `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_SEED_PROJECT_REF=<ref>`, las cuatro `DEMO_PASSWORD_*` (≥ 12, guardadas en el gestor) y, si hace falta, `DEMO_EMAIL_DOMAIN`. `git status` no debe mostrarlo.
8. `pnpm --filter @spanglish/app demo:seed --dry-run` → revisar → `pnpm --filter @spanglish/app demo:seed` (resumen: 4 usuarios, 4 recursos, 3 lecciones, más 3 videos y 2 lecciones interactivas de la migración).
9. Primera admin real (cuando Maribel tenga cuenta): Authentication → Users → Add user (auto-confirm) y `insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where email = '<email>' on conflict do nothing;`.

### Checklist M2 — Vercel (necesita: cuenta de Vercel con acceso a `JaimeTR/spanghish`; opcional Stripe test, Resend, DNS)
1. `develop` → `main` (el dominio real sigue en WordPress: `main` en Vercel es la demo hasta el lanzamiento).
2. Importar el repo dos veces: `spanglish-web` (Root Directory `apps/web`) y `spanglish-app` (Root Directory `apps/app`); Next.js; "Include files outside the root directory" activado; Production Branch `main`. El `vercel.json` de cada app ya fija install e ignore.
3. Variables de Production según `docs/despliegue.md` (web: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `REVALIDATE_SECRET`, `SITE_INDEXING=off`, `ENABLE_EXPERIMENTAL_COREPACK=1`, y Resend o `LEADS_LOG_ONLY=1`, Stripe test opcional; app: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` marcada Sensitive, `NEXT_PUBLIC_WEB_URL`, `WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET` = `REVALIDATE_SECRET`, `ENABLE_EXPERIMENTAL_COREPACK=1`). Si falta algo, el build falla con la lista (Task 16).
4. Deployment Protection: "Vercel Authentication" en **Only Preview Deployments** (producción abierta para Maribel; la indexación la impiden `noindex` y `robots`).
5. Deploy de los dos; volver a Supabase → Authentication → URL Configuration: Site URL = URL del portal, Redirect URLs = `https://<portal>/**`.
6. (Opcional) Stripe test: webhook `https://<web>/api/stripe/webhook` con `checkout.session.completed` y `checkout.session.async_payment_succeeded`; `whsec_…` a `STRIPE_WEBHOOK_SECRET`; redeploy.
7. (Opcional) Dominios `demo.spanglish.com.au` / `app-demo.spanglish.com.au`: `CNAME` a `cname.vercel-dns.com`; actualizar `NEXT_PUBLIC_*_URL`, `WEB_REVALIDATE_URL` y URL de Auth; redeploy. No tocar registros del dominio principal ni del correo.

### Checklist M3 — Salida a demo (verificación, en orden)
1. `curl -s https://<web>/api/health` → `db: "ok"`, `indexing: false`; `curl -s https://<app>/api/health` → `db: "ok"`.
2. `curl -sI https://<web>/es | grep -i x-robots-tag` → `noindex, nofollow`; `https://<web>/robots.txt` → `Disallow: /`; lo mismo en el portal.
3. Login con las cuatro cuentas de demo; publicar algo como admin y verlo en la web en menos de 1 minuto (revalidación a demanda).
4. Ensayar el guion completo en móvil (375px) y escritorio, cronometrado (≤ 15 min); cualquier fallo vuelve a su tarea dueña.
5. `git status` en local: ningún `.env*` salvo `.env.example`.

### Checklist M4 — Salida a producción (hito 3; aquí solo para no olvidarla)
1. Proyecto Supabase nuevo de producción (M1 completo, sin `demo:seed`); plan de pago; primera admin real por SQL.
2. Vercel: `SITE_INDEXING=on`, claves `live` de Stripe, Resend con dominio verificado, sin `LEADS_LOG_ONLY`, dominios reales.
3. Redirecciones 301 desde WordPress y DNS (fuera de este plan).
4. M3 de nuevo, esperando `indexing: true` y sin `X-Robots-Tag`.

## Autorrevisión (hecha al escribir)
- **Cobertura del encargo:** A modelo y RLS (T2–T4, pgTAP por rol, auditoría con `enable_audit`), buckets y políticas (T4), lecciones con interactivas por clave y artículos por bloques (T2, T8, T9); B gestión con subidas firmadas, ayuda de YouTube, orden, vista previa y campos es/en lado a lado (T5–T9); C portal del alumno con niveles y URL firmadas (T10–T11); D web con RPC anon, respaldo, candados al login, revalidación, i18n, JSON-LD sin cambios y sitemap (T12–T15); E entorno demo 100% preparado en código (`vercel.json`, Turbo, validación de variables, `noindex`, salud, script de demo con guardas, guía `docs/despliegue.md` con referencia de variables y comandos: T16–T18, T20) y la parte que necesita cuentas aislada en las Checklists M0–M4 al final; F guion y e2e (T19, T20); tienda como fase aparte (T21–T23). Spec §11 "Archivos" (bucket privado con tipos y tamaño) en T4/T7; §11 "Infraestructura" (Sídney) en M1.
- **Sin bloqueos por cuentas:** ninguna tarea numerada usa Supabase cloud ni Vercel; todas se verifican con Supabase local y CI.
- **Tipos y nombres:** `content_tier`, `has_enrolled_access`, `list_published_resources`, `list_published_lessons`, `get_published_lesson`, `resource_file_path`, `can_read_resource_object`, `move_resource|lesson|lesson_block`, `health_ping`, `UPLOAD_RULES`, `parseYouTubeId`, `parseTextBlock`, `PublishedResource`, `PublishedLessonSummary`, `PublishedLessonDetail`, `LessonBlock`, `pingWebRevalidate`, `getRpc`, `WEB_CONTENT_TAG`, `getPublicResourceCards`, `getLearnCategories`, `getPublicLesson`, `appLoginUrl(locale, next?)` usados con la misma firma en todas las tareas.
- **Review Focus:** cada línea tiene prueba en su tarea dueña (T3/T4/T19, T12–T14, T1/T14, T2/T19, T7).
- **Proporción:** el plan fija tablas, checks, políticas, firmas, reglas no deducibles (orden de acceso, teasers, respaldo por nivel, cabeceras, revalidación) y nombres de pruebas; no incluye cuerpos de funciones.
