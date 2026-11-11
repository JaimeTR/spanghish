# Traspaso del proyecto (para continuar desde otra sesión o cuenta)

Última actualización: 2026-11-09. Repositorio: `JaimeTR/spanghish` (público). Cliente: Maribel Mayhua (profesora de español, Australia). Producto: web pública bilingüe (es/en) + plataforma educativa privada. Stack: pnpm + Turborepo, Next.js 16, Tailwind v4, next-intl, Supabase (Postgres/Auth/Storage/RLS), Stripe.

## 0. Estado de ramas (actualizado 2026-11-10, integración directa sin PRs)
- **Política:** solo dos ramas importantes. **`develop` = trabajo** y **`main` = producción** (última versión estable). Se integra directo (sin PRs) tras verificar; `main` se actualiza desde `develop` cuando todo está verde. Carpeta de trabajo local: `spanghish-int` (rama `develop`). La carpeta `spanghish` es la original (contiene el `.git`); no se usa.
- `develop` y `main` contienen: cimientos 1A, web pública completa, 1B fases 1-2, Contenido fases 0-2 (gestión de recursos y lecciones, e2e en verde), menú lateral agrupado/minimizable + menú de perfil + `/account`, páginas de docentes (índice y perfiles de Maribel y Pamela) leídas de la plataforma con respaldo estático, `/api/revalidate`, y la migración 0012 (`teacher_profiles`).
- Verificado en el árbol integrado: lint, typecheck, tests (web 94, app 186, content 13, ui 4), pgTAP 311, build, e2e app 89 y e2e web 244 (2 pruebas de la web son intermitentes bajo carga y pasan solas: `conversion.spec.ts:182`, `home.spec.ts:173`). El CI de GitHub no se ha comprobado.
- **Admin de perfiles públicos de docentes: hecho** (`/admin/teachers/profiles`: crear/editar es/en, foto, publicar, orden; la web lo lee con respaldo estático). e2e app 97 en verde.
- **Contenido fase 4: hecha** (la web lee recursos y lecciones de la plataforma; ver §5.2). Verificado: web vitest 123, lint, typecheck, build, e2e web 250 (con respaldo estático) y comprobación manual contra Supabase local.
- **Contenido fase 5: hecha** (entorno demo preparado en código; ver §5.2 y `docs/despliegue.md`).
- Convención: ramas `feat/*` desde `develop`; al terminar y verificar, merge directo a `develop` y luego `main`; borrar la rama.


## 0.1 Sistema de matrícula (2026-11-11, rama `feat/matricula`)
Hecho y verificado en local (pgTAP 348, vitest web 185 y app 264, build de ambas apps, comprobado en el navegador):
- **Migración 0035** (grupos, matrículas, prematrículas con reserva de plaza, pagos de matrícula) y **0036** (horarios, sesiones, asistencia). Las dos están SOLO en la base local: aplicarlas a Supabase real con `pnpm db:push` (no se hizo).
- **Web:** `/enrol` (grupos con plazas) → formulario → `/enrol/pay/<token>` (tarjeta con Stripe dentro de la web, o transferencia) → `/enrol/success`. El importe sale de `program_prices` en la base, nunca del navegador. El webhook de Stripe (`checkout.session.completed` con `metadata.kind=enrollment`) avisa al portal.
- **Portal:** `POST /api/enrollments/confirm` (secreto compartido) crea ficha, matrícula, pago y cuenta del alumno adulto, de forma idempotente; los reembolsos de Stripe también se anotan en pagos de matrícula. Admin: Grupos (con Horario y Generar clases), Matrículas (+ Prematrículas), Calendario, Asistencia y Pagos (matrículas y tienda). Docente: Hoy y Asistencia. Alumno: Mi horario, Mis cursos y Mis pagos.
- **Para producción:** el portal necesita `SUPABASE_SERVICE_ROLE_KEY`, `WEB_REVALIDATE_SECRET` y `NEXT_PUBLIC_WEB_URL`; la web, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (el endpoint del webhook ya existe), `WEB_REVALIDATE_SECRET` y `NEXT_PUBLIC_APP_URL`. Los datos bancarios de la transferencia se envían a mano por correo (la prematrícula avisa a `LEAD_TO_EMAIL` si Resend está configurado).
- **Pendiente (no hecho):** packs de clases con saldo, recuperaciones y clases sueltas, cierres/festivos, solicitudes de cambio de clase del alumno, vistas del tutor, correos automáticos al alumno. Las e2e `admin-students` (botón "Filtrar") y `student-resources` ya estaban desactualizadas antes de este trabajo.

## 1. Cadena de ramas y PRs (fusionar EN ESTE ORDEN)

| Orden | Rama | PR | Contenido |
|---|---|---|---|
| 1 | `chore/project-foundation` | #2 → `develop` | Hito 1A: cimientos de la plataforma (auth, roles, RLS, idiomas, shell). |
| 2 | `feat/web-home` | #3 | Home pública. |
| 3 | `feat/web-inner-pages` | #5 | Páginas interiores. |
| 4 | `feat/web-conversion-pages` | #6 | Formularios (clase gratis por pasos + contacto), FAQ, precios, legales (borrador), 404, menú con submenús, Recursos, Conversación online, Aprende ahora (`/learn`), tienda con carrito y Stripe Checkout, redes. |
| 5 | `feat/1b-fase1` | #7 | 1B fase 1: deudas de 1A, `/reset-password`, utilidades, `@spanglish/db`. |
| 6 | `feat/1b-fase2` | #8 | 1B fase 2: catálogo, personas, consentimientos, alta de docentes. |
| 7 | `feat/contenido-fase0` | #9 | Hito Contenido fases 0 y 1: menú completo con "En desarrollo", contenido en BD (migraciones 0010–0011). |

Dos cadenas parten de `chore/project-foundation`: la web (#3, #5, #6) y la plataforma (#7, #8, #9). Habrá conflictos en `pnpm-lock.yaml`, `.env.example`, README y `ci.yml` al unirlas: regenerar el lock con `pnpm install`. Tras fusionar #2, crear `main`, fijarla como rama por defecto y reapuntar las bases. No existe `main` aún.

## 2. Checkouts locales
- `spanghish/` = rama de la web (`feat/web-conversion-pages`).
- `spanghish-1b/` = worktree de la plataforma (`git worktree add ../spanghish-1b <rama>`), hoy en `feat/contenido-fase0`.
- No versionados a propósito: `.agents/`, `.claude/`, `skills-lock.json`. `.superpowers/` y `apps/web/.design-preview/` están en `.gitignore`.

## 3. Puesta en marcha
```bash
pnpm install
pnpm exec supabase start            # requiere Docker Desktop
pnpm exec supabase db reset         # SOLO local; la semilla tiene guarda de jwt_secret
pnpm dev                            # ver README "Cómo correr en local"
```
Variables: copiar `.env.example`; nunca subir secretos. Stripe y Resend se configuran con claves de prueba (ver README de `apps/web` "Tienda y pagos").

## 4. Estado verificado (línea base al 2026-11-09)
- Plataforma (`feat/contenido-fase0`): pgTAP 285, vitest app 158, paquete `@spanglish/content` 13, e2e app 57 pasadas / 3 omitidas, lint/typecheck/build/`pnpm db:types` sin diff.
- Web (`feat/web-conversion-pages`): vitest 80, e2e ~235 pasadas (82 omitidas = capturas), lint/typecheck/build en verde.
- El CI de GitHub aún NO se ha comprobado en ninguna rama.

## 5. Planes (leer antes de tocar nada; cada tarea trae rutas, firmas y pruebas)
- `docs/superpowers/specs/2026-11-08-spanglish-platform-design.md` (diseño aprobado).
- `docs/superpowers/plans/2026-11-08-hito1b-nucleo-operativo.md` (6 fases; **fases 1 y 2 hechas**; incluye "Respuestas aprobadas").
- `docs/superpowers/plans/2026-11-08-hito-contenido-recursos-y-aprende.md` (fases 0 y 1 **hechas**; fases 2–6 pendientes; incluye "Respuestas aprobadas").
- `docs/superpowers/plans/2026-11-08-pendientes-tras-hito1a.md` (deudas de 1A; cubiertas por 1B fase 1).

## 5.1 Siguiente trabajo, en orden
1. **Contenido fase 2 (T5–T9) — código escrito, faltan 12 e2e (ver 5.2):** gestión en el portal de recursos y lecciones (CRUD, publicar, ordenar, subida de archivos con URL firmada, editor de lecciones por bloques con vista previa). Al terminar, cambiar `status` de `content` a `ready` en `apps/app/src/lib/nav.ts`.
2. **Contenido fase 3 (T10–T11) — HECHA:** `/student/resources` (con `/open` firmado) y `/student/learn` del alumno por nivel de acceso.
3. **Contenido fase 4 (T12–T15) — HECHA:** la web lee recursos y lecciones publicados (RPC con clave anónima, caché 300 s, respaldo estático, `/api/revalidate`).
4. **Contenido fase 5 (T16–T20) — HECHA:** configuración de despliegue, validación de variables, noindex por entorno, `/api/health`, semilla de datos de ejemplo, `docs/despliegue.md`. **T20 debe renumerar** las migraciones de 1B fases 3–6 (reservadas 0010–0015 → pasan a 0012+) en el plan 1B.
5. Contenido fase 6 (tienda gestionable): opcional.
6. **1B fases 3–6:** grupos/calendario/matrículas, asistencia/packs/"Hoy" del docente, solicitudes web → panel, panel de la administradora. Sustituir `has_enrolled_access()` (marcador temporal) en la tarea 13 de 1B.
7. Hito 2 (alumno completo) y hito 3 (Stripe de matrículas, CMS, lanzamiento): sin plan escrito aún.

## 5.2 Punto exacto donde se quedó el trabajo (2026-11-10)
Ver §0. **Siguiente: 1B fases 3–6** (o Contenido fase 6, tienda gestionable, que es opcional). Para montar la demo real solo faltan cuentas: seguir las checklists M1–M3 de `docs/despliegue.md`.

Contenido fase 5, lo que hay que saber:
- **Guía única: `docs/despliegue.md`** (arquitectura, tabla de todas las variables, comandos, checklists M1–M4, guion de la demo). Dos pruebas (`env-reference.test.ts` en cada app) fallan si una variable que lee el código o que está en `.env.example` no está documentada ahí.
- **Validación de variables al compilar en Vercel** (`apps/*/src/lib/env.ts`, llamada desde `next.config.ts` solo si `VERCEL=1`). Web: lo que falta solo se avisa (decisión de Jaime: el despliegue actual no tiene variables); falla ante clave de servicio en la web, pares a medias, secreto de menos de 32 o URL sin https. Portal: faltan Supabase, `NEXT_PUBLIC_SITE_URL` o la clave de servicio → falla.
- **Indexación: se mantiene `SITE_NOINDEX=1` = fuera de buscadores** (decisión de Jaime; el plan proponía `SITE_INDEXING=on`, no se hizo). El portal nunca se indexa (`robots.txt` + `X-Robots-Tag` siempre).
- Nombres reales de variables (difieren de la tabla del plan): la web usa `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` y `WEB_REVALIDATE_SECRET`.
- `GET /api/health` en las dos apps (informe sin datos; `db` con el RPC `health_ping`).
- `apps/*/vercel.json` (instalación con lockfile congelado y `turbo-ignore`), `turbo.json` con `env`/`passThroughEnv` del build.
- **Datos de demo:** `pnpm --filter @spanglish/app demo:seed [--dry-run | remove]` (`apps/app/scripts/demo-seed.ts`, lógica en `src/lib/demo/`). Solo escribe en `https://<ref>.supabase.co` con `DEMO_SEED_PROJECT_REF` igual al ref. Probado de verdad contra Supabase local con un arnés temporal (siembra dos veces, login de las 4 cuentas con su nivel, borrado limpio); **no se ha ejecutado contra ningún proyecto remoto** (no existe aún). No crea edición del programa (el plan la mencionaba).
- **e2e nuevas:** `apps/app/e2e/demo-flow.spec.ts` (recorrido de la demo) y `pnpm --filter @spanglish/web e2e:platform` (web contra Supabase local, puerto 3102, `apps/web/e2e-platform/`). El CI ejecuta las tres suites en el job `e2e` (sin comprobar aún en GitHub).
- Scripts raíz: `db:link`, `db:push:dry`, `db:push`, `db:remote:types`.
- Plan 1B anotado: las migraciones de sus fases 3–6 toman el siguiente número libre (la primera, `0013`) y la tarea 13 debe reemplazar `has_enrolled_access()`.
- Reparto: el script de demo lo escribió Codex y lo corrigió Claude (publicaba lecciones antes de crear sus bloques, ocultaba los errores y borraba en mal orden); el resto, Claude.

Contenido fase 4, lo que hay que saber:
- `apps/web/src/lib/content-source.ts` es la única puerta: `getPublicResourceCards`, `getLearnCategories`, `loadPublicLesson`/`getPublicLesson`, `getPublicArticleSlugs`. Lee con la clave anónima los RPC `list_published_resources`, `list_published_lessons` y `get_published_lesson` (caché 300 s, etiqueta `web-content`). Sin variables, con la base caída o sin nada publicado, `/resources`, `/learn` y el sitemap usan el respaldo estático (un nivel de acceso o una categoría sin nada publicado conserva su respaldo).
- Lo restringido llega sin origen y enlaza al login del portal con `?next=` (solo rutas `/<locale>/student/…`). Lecciones artículo abiertas: `/[locale]/learn/[slug]` (bloques como texto, nunca HTML). Descarga de archivos públicos: `/api/resource-file/<id>` → RPC `resource_file_path` + URL firmada de 120 s (la web nunca usa la clave de servicio).
- **Desviación del plan, a propósito:** si la plataforma está configurada pero no responde, la lección artículo lanza un error (500 sin caché) en vez de 404. Con 404, Next guardaba en caché "no existe" de una lección real (con `noindex`) y tardaba dos ciclos en recuperarse; ahora una lección ya servida se sigue viendo durante la caída. La web no tiene `error.tsx` propio: una lección nunca visitada pedida durante una caída muestra la página de error genérica de Next.
- `/api/revalidate` exige ahora un `WEB_REVALIDATE_SECRET` de **32 caracteres o más** (uno más corto = no configurado, 503).
- La e2e de la web (`pnpm --filter @spanglish/web e2e`) fuerza el respaldo (vacía las dos variables de Supabase en `playwright.config.ts`), haya o no `.env.local`. La e2e de la web contra la plataforma es la tarea 19 (fase 5): `playwright.platform.config.ts` + `e2e-platform/`.
- Vitest de la web ya admite pruebas `.test.tsx` (`oxc.jsx` automático en `vitest.config.ts`; render con `react-dom/server`).

Pendiente de configuración (Vercel; hoy la web desplegada usa el respaldo): en la web `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `WEB_REVALIDATE_SECRET`; en la app `WEB_REVALIDATE_URL` (`https://<web>/api/revalidate`) y el mismo `WEB_REVALIDATE_SECRET`. Documentado en `.env.example`.

Otros avisos vigentes: en la web "Entrar" es un icono a la derecha de "Clase gratis" y solo en home, Recursos y Aprende (`showsPortalLogin`); `SITE_NOINDEX=1` saca la web de buscadores (no está puesto en Vercel `spanglish-web`, por decisión de Jaime). En el portal no existe `text-white` (el tema reinicia los colores): usar `text-on-structure`/`text-on-primary`.

## 5.3 Datos de prueba en la base real (2026-11-10)
Cargados a petición de Jaime en el proyecto Supabase `eolcrcqyblkfcxtqfssi` para ver las listas con contenido:
- **14 alumnos** con nombre `Prueba · …` (9 con contacto `prueba.*@example.test`, 5 menores sin tutor ni consentimiento). Para borrarlos todos: `delete from public.students where full_name like 'Prueba · %';` (arrastra sus datos privados y notas).
- **2 cuentas de docente** con correos provisionales `maribel@spanglish.test` y `pamela@spanglish.test` (sin contraseña, sin correo enviado), enlazadas a sus perfiles públicos (`teacher_profiles.profile_id`). Para poner su correo real: `update auth.users set email = '<correo>' where email = 'maribel@spanglish.test';` (un trigger sincroniza `profiles.email`); después se pueden invitar desde "Invitar docente".
- Nada de esto es contenido de demostración: es dato de prueba marcado y fácil de retirar.

## 6. Cómo delegar sin gastar tokens de Claude
- **Codex** (cuenta ChatGPT ya iniciada): `codex exec -C <worktree> -s workspace-write "<prompt autocontenido que cite el archivo del plan y la tarea>"`. Su sandbox NO puede ejecutar `pnpm` (EPERM): que solo escriba archivos y ejecutar las comprobaciones fuera. Nunca `danger-full-access`, nunca pasar secretos. Un solo escritor por archivo.
- **OpenCode** (modelos gratuitos `opencode/*-free`): `opencode run --dir <worktree> -m opencode/<modelo>-free "<prompt>"`. Los modelos probados (`deepseek-v4.1-flash-free`, `glm-5.3-flash-free`) agotaron el tiempo; probar otro de `opencode models`. Solo texto no sensible: traducciones, documentación, relleno mecánico.
- **Verificación sin LLM** (barata): desde el worktree de la plataforma:
  `pnpm lint && pnpm typecheck && pnpm test`, luego `pnpm exec supabase db reset && pnpm exec supabase test db`, `pnpm db:types` (sin diff), `pnpm build`, y una sola ejecución de e2e (`pnpm --filter @spanglish/app e2e`). No lanzar dos Playwright a la vez.
- Lo que SIEMPRE debe revisar una persona o Claude: RLS, políticas de Storage, funciones `security definer` (`search_path=''`), manejo de la clave de servicio, datos de menores.
- Flujo por tarea: leer la tarea del plan → test que falle → implementar → verificar → commit en español con la línea `Co-Authored-By` → PR apilado.

## 7. Reglas del proyecto
- Idiomas es/en en toda la UI; AUD; hora `Australia/Brisbane`; menores = segmento niños (6–13).
- Acceso fail-closed, `getUser()` para verificar, `requireArea` en cada layout por rol; la clave de servicio solo en `apps/app/src/lib/supabase/admin.ts`.
- Migraciones: nunca renombrar tras `db push` al remoto; la semilla es solo local.
- Web: un único nodo raíz en `PageShell` (evita saltos de scroll); animaciones respetan `prefers-reduced-motion`; accesibilidad axe sin violaciones en es/en a 375 y 1280.

## 8. Pendiente de la dueña (Maribel) / del desarrollador
- Aprobar textos y su foto (permiso de publicación); edad de niños (4–13 vs 6–13); precios reales (el spec dice $25–$45 por clase, `lib/prices.ts` usa $30/$35/$25).
- Archivos y descripciones reales de los 3 productos de la tienda; política de reembolsos de descargas; GST (hoy sin impuestos).
- Revisión legal de privacidad y términos (hoy `noindex`, con `TODO(legal)`) y del texto de consentimiento de menores.
- Cuentas: Vercel, Supabase (región Sídney), claves de prueba de Stripe y Resend, dominio. Pasos manuales detallados al final del plan de Contenido (checklists M0–M4).
- Descuento 30 % de alumnos en recursos digitales: confirmado; solo informativo, sin lógica todavía.
