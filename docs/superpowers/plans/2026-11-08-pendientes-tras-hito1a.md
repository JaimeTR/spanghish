# Pendientes tras el hito 1A (para el plan 1B y siguientes)

Salen de las revisiones por tarea y de la revisión final. Ninguno bloquea lo ya entregado.

## Primeras tareas del plan 1B
- **Privilegios por defecto:** primera migración con `alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated` (y `revoke execute on functions from public, anon`). Hoy cada migración revoca tabla por tabla.
- **service_role:** política única de grants (hoy tiene grants por defecto en `profiles`/`user_roles` y ninguno en `languages`, `levels`, `audit_logs`).
- **Rol inicial:** `handle_new_user` asigna siempre `student`; las cuentas de docente/tutor creadas por la administradora deben recibir su rol inicial vía `app_metadata` (nunca `raw_user_meta_data`).
- **Página `/reset-password`:** el correo de recuperación ya apunta al portal (`site_url` 3001) pero la página no existe.
- **Última administradora:** impedir con un trigger que se quede el sistema sin ninguna cuenta admin.
- **Sincronizar** `auth.users.email` con `profiles.email`.
- **Zona horaria:** `Australia/Brisbane` ya está en next-intl; usarla en calendario y sesiones.

## Antes del lanzamiento (hito 3)
- Límite de intentos por IP/cuenta en la app (GoTrue ve una sola IP detrás del servidor Next).
- `minimum_password_length` más estricto en el proyecto remoto; revisar auth remoto (signup desactivado, redirect allow-list).
- Diferencias de tiempo en login y recuperación (enumeración); coste de 3-4 llamadas a Supabase por petición en el proxy.
- Confirmar con la clienta que `docs/PLAN.md` y el spec pueden ser públicos (teléfono, correo, nombre). El repositorio es público.

## Calidad, sin urgencia
- Tests: `apps/web` sin tests; focus ring del Button; `audit.test.sql` (actor nulo vacuo, asserts débiles, no fijan mensaje del trigger); admin suspendido sin test de escritura en catálogo; UPDATE sobre usuario 1111 sin comprobar estado.
- Auditoría: `WHEN (old.* is distinct from new.*)` en UPDATE; `row_id` se parte si cambia la clave; el comentario "incluso del dueño" exagera; `service_role` no puede leer `audit_logs`.
- Config: TypeScript 7 en la raíz vs 6.0.3 en las apps; `tsconfig` con extends relativo; `LOCALE_LIKE` solo acepta códigos de 2 letras; proxy/routing duplicados entre apps; el seed depende de `app.settings.jwt_secret` de la CLI.
- UI: nav deshabilitada con `role="link"` (usar `span aria-disabled`); el foco no vuelve tras elegir un enlace del menú móvil; el estado abierto no se reinicia al agrandar la ventana; etiqueta "Pronto" de 11px; `LocaleSwitch` pierde la query; fuentes de marca sin elegir; focus ring amarillo en el sidebar morado (desviación consciente).
- CI: `cancel-in-progress` solo en PRs; `db reset` redundante; README: mencionar que el e2e lee `supabase status`.
- Decisión pendiente del propietario: si `.agents/`, `.claude/skills/` y `skills-lock.json` se versionan.
