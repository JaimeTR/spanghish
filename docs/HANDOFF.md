# Traspaso del proyecto (para continuar desde otra sesión o cuenta)

Última actualización: 2026-11-09. Repositorio: `JaimeTR/spanghish` (público). Cliente: Maribel Mayhua (profesora de español, Australia). Producto: web pública bilingüe (es/en) + plataforma educativa privada. Stack: pnpm + Turborepo, Next.js 16, Tailwind v4, next-intl, Supabase (Postgres/Auth/Storage/RLS), Stripe.

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
1. **Contenido fase 2 (T5–T9):** gestión en el portal de recursos y lecciones (CRUD, publicar, ordenar, subida de archivos con URL firmada, editor de lecciones por bloques con vista previa). Al terminar, cambiar `status` de `content` a `ready` en `apps/app/src/lib/nav.ts`.
2. **Contenido fase 3 (T10–T11):** vista de Recursos y "Aprende" del alumno por nivel de acceso.
3. **Contenido fase 4 (T12–T15):** la web lee recursos y lecciones publicados (RPC con clave anónima, caché 300 s, respaldo estático, `/api/revalidate`).
4. **Contenido fase 5 (T16–T20):** configuración de despliegue, validación de variables, noindex por entorno, `/api/health`, semilla de datos de ejemplo, `docs/despliegue.md`. **T20 debe renumerar** las migraciones de 1B fases 3–6 (reservadas 0010–0015 → pasan a 0012+) en el plan 1B.
5. Contenido fase 6 (tienda gestionable): opcional.
6. **1B fases 3–6:** grupos/calendario/matrículas, asistencia/packs/"Hoy" del docente, solicitudes web → panel, panel de la administradora. Sustituir `has_enrolled_access()` (marcador temporal) en la tarea 13 de 1B.
7. Hito 2 (alumno completo) y hito 3 (Stripe de matrículas, CMS, lanzamiento): sin plan escrito aún.

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
