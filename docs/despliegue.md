# Despliegue: entorno de demostración y salida a producción

Fuente única para configurar y desplegar Spanglish. Nada de lo que hay aquí guarda valores reales: los
secretos viven en un gestor de contraseñas y en los paneles de Vercel y Supabase, nunca en git.

## 1. Arquitectura en 5 líneas

1. Dos proyectos de Vercel sobre el mismo repositorio: `spanglish-web` (carpeta `apps/web`, la web pública) y `spanglish-app` (carpeta `apps/app`, el portal privado).
2. Un proyecto de Supabase en **Sídney (ap-southeast-2)**: base de datos, autenticación y archivos. La seguridad vive en Postgres (RLS).
3. El portal habla con Supabase con la sesión de cada usuario; solo su servidor usa la clave de servicio (alta de cuentas).
4. La web habla con Supabase desde su servidor con la clave pública, como visitante anónimo: solo puede llamar a funciones que devuelven lo publicado (y, de lo restringido, solo el título). Sin Supabase usa su contenido de respaldo.
5. Al publicar algo en el portal, este avisa a la web (`/api/revalidate`, con un secreto compartido) para que lo muestre al momento; sin ese aviso, la web se pone al día en 5 minutos como mucho.

## 2. Referencia de variables

"Secreta" = nunca en el navegador, en git ni en capturas. Las `NEXT_PUBLIC_` van al navegador: no pueden ser secretas.
Al compilar en Vercel, cada app comprueba sus variables (`apps/web/src/lib/env.ts`, `apps/app/src/lib/env.ts`): lo peligroso o a medias detiene el build con una lista legible; lo que falta en la web solo se avisa.

| Variable | App | Dónde se usa | ¿Secreta? | ¿Al navegador? | Demo | Producción | Ejemplo (forma, no real) | Si falta |
|---|---|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | web, app | `apps/web/src/lib/site.ts`, `apps/app/src/lib/site-url.ts` | no | sí | sí | sí | `https://demo.example.com` | web: usa `https://spanglish.com.au` (aviso). app: el build de Vercel falla |
| `NEXT_PUBLIC_APP_URL` | web | `apps/web/src/lib/site.ts` | no | sí | sí | sí | `https://app-demo.example.com` | usa `https://app.spanglish.com.au` (aviso): "Entrar" y los candados irían al portal real |
| `NEXT_PUBLIC_WEB_URL` | app | enlaces del portal a la web pública | no | sí | sí | sí | `https://demo.example.com` | usa la dirección por defecto (aviso) |
| `NEXT_PUBLIC_SUPABASE_URL` | web, app | `apps/web/src/lib/platform.ts`, `apps/app/src/lib/supabase/*` | no | sí | sí | sí | `https://abcdefghijklmnop.supabase.co` | web: contenido de respaldo. app: el build de Vercel falla |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web, app | los mismos | no (es la clave pública) | sí | sí | sí | `eyJ…` (anon) o `sb_publishable_…` | igual que la anterior; van siempre las dos |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo app** | `apps/app/src/lib/supabase/admin.ts` | **sí** (marcar Sensitive) | no | sí | sí | `eyJ…` (service_role) o `sb_secret_…` | app: el build de Vercel falla. **En la web está prohibida: el build falla si aparece** |
| `WEB_REVALIDATE_URL` | app | `apps/app/src/lib/web-revalidate.ts` | no | no | recomendada | recomendada | `https://demo.example.com/api/revalidate` | la web tarda hasta 5 minutos en mostrar lo publicado |
| `WEB_REVALIDATE_SECRET` | web, app (mismo valor) | `apps/web/src/app/api/revalidate/route.ts`, `apps/app/src/lib/web-revalidate.ts` | **sí** | no | recomendada | recomendada | salida de `openssl rand -hex 32` | sin ella `/api/revalidate` responde 503; con menos de 32 caracteres el build falla |
| `SITE_NOINDEX` | web | `apps/web/src/lib/indexing.ts` | no | no | **`1`** | **no definirla** | `1` | la web es indexable por buscadores |
| `STRIPE_SECRET_KEY` | web | `apps/web/src/lib/checkout.ts` | **sí** | no | opcional (`sk_test_…`) | sí (`sk_live_…`) | `sk_test_…` | la tienda avisa de que los pagos no están activos |
| `STRIPE_WEBHOOK_SECRET` | web | `apps/web/src/app/api/stripe/webhook/route.ts` | **sí** | no | con la anterior | sí | `whsec_…` | el webhook responde 400; van siempre las dos |
| `RESEND_API_KEY` | web | `apps/web/src/lib/leads.ts` | **sí** | no | opcional | sí | `re_…` | el formulario de clase gratis avisa de que no está disponible |
| `LEAD_TO_EMAIL` | web | `apps/web/src/lib/leads.ts` | no | no | con Resend | sí | `hola@example.com` | van siempre las tres de Resend |
| `LEAD_FROM_EMAIL` | web | `apps/web/src/lib/leads.ts` | no | no | con Resend | sí | `Spanglish <web@example.com>` | van siempre las tres de Resend |
| `LEADS_LOG_ONLY` | web | `apps/web/src/lib/leads.ts` | no | no | opcional (`1`) | **prohibida** | `1` | las solicitudes se envían por Resend; con `1` solo se escriben en el registro |
| `ENABLE_EXPERIMENTAL_COREPACK` | web, app (solo Vercel) | la lee Vercel, no el código | no | no | `1` | `1` | `1` | Vercel puede usar otra versión de pnpm que la de `packageManager` |
| `DEMO_SEED_PROJECT_REF` | solo tu máquina (`apps/app/.env.demo.local`) | `apps/app/scripts/demo-seed.ts` | no | no | sí | nunca | `abcdefghijklmnop` | el script de demo se niega a escribir |
| `DEMO_PASSWORD_ADMIN` | solo tu máquina | `apps/app/scripts/demo-seed.ts` | **sí** | no | sí | nunca | 12 caracteres o más | el script lista las que faltan y no escribe |
| `DEMO_PASSWORD_TEACHER` | solo tu máquina | igual | **sí** | no | sí | nunca | 12 caracteres o más | igual |
| `DEMO_PASSWORD_STUDENT` | solo tu máquina | igual | **sí** | no | sí | nunca | 12 caracteres o más | igual |
| `DEMO_PASSWORD_VISITOR` | solo tu máquina | igual | **sí** | no | sí | nunca | 12 caracteres o más | igual |
| `DEMO_EMAIL_DOMAIN` | solo tu máquina | igual | no | no | opcional | nunca | `demo.spanglish.test` | usa `demo.spanglish.test` |

## 3. Comandos paso a paso

**Nunca, contra un proyecto remoto:** `supabase db reset --linked`, `supabase db push --include-seed`, `supabase config push`, Branching, ni `supabase/seed.sql` (su guarda aborta, pero no se intenta). El seed es solo para el entorno local.

Enlazar el proyecto y subir las migraciones:

```bash
pnpm supabase login
```

```bash
pnpm db:link <project-ref>
```

```bash
pnpm db:push:dry
```

```bash
pnpm db:push
```

`db:push:dry` debe listar solo migraciones de `supabase/migrations` (hoy `0001` a `0012`) antes de aplicar nada. Los buckets no tienen comando propio: los crea la migración `0011`.

Verificar los buckets (SQL Editor de Supabase):

```sql
select id, public, file_size_limit, allowed_mime_types from storage.buckets;
```

Deben salir `content-media` (público, 2097152) y `resource-files` (privado, 26214400).

Primera administradora real (después de crear su usuario en Authentication → Users, con auto-confirm):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = '<email>'
on conflict do nothing;
```

Generar un secreto (para `WEB_REVALIDATE_SECRET`):

```bash
openssl rand -hex 32
```

Datos de demostración. Crear `apps/app/.env.demo.local` (git lo ignora) con `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_SEED_PROJECT_REF` y las cuatro `DEMO_PASSWORD_*`. Primero en seco, luego de verdad:

```bash
pnpm --filter @spanglish/app demo:seed --dry-run
```

```bash
pnpm --filter @spanglish/app demo:seed
```

Para retirarlos (borra exactamente lo que creó el script: los ids `de000000-…` y los cuatro usuarios):

```bash
pnpm --filter @spanglish/app demo:seed remove
```

Comprobar salud y que la demo está fuera de buscadores:

```bash
curl -s https://<web>/api/health
```

```bash
curl -s https://<app>/api/health
```

```bash
curl -sI https://<web>/es | grep -i x-robots-tag
```

```bash
curl -s https://<web>/robots.txt
```

Comparar los tipos del proyecto remoto con los versionados (solo lectura; nunca sobrescribe `packages/db`):

```bash
pnpm -s db:remote:types | diff - packages/db/src/database.types.ts
```

## 4. Checklists

### M1 · Supabase (necesita: cuenta de Supabase y gestor de contraseñas)

1. Proyecto nuevo `spanglish-demo`, región **Sydney (ap-southeast-2)**, plan gratuito; contraseña de la base generada y guardada en el gestor. Anotar el `project-ref`.
2. Con `develop` actualizado: los cuatro comandos de "Enlazar el proyecto y subir las migraciones".
3. Verificar los buckets con la consulta de arriba.
4. Authentication → Providers: Email activado; **"Allow new users to sign up" desactivado**; confirmación de email desactivada; contraseña mínima 10.
5. Authentication → Emails → "Reset password": pegar `supabase/templates/recovery.html`. El SMTP por defecto basta para la demo.
6. Project Settings → API Keys: guardar en el gestor la URL, la clave pública y la clave de servicio. Advisors → Security sin "RLS disabled".
7. Crear `apps/app/.env.demo.local` y sembrar los datos de demostración (en seco primero). `git status` no debe mostrar ese archivo.
8. Primera administradora real, cuando Maribel tenga cuenta: el SQL de arriba.

### M2 · Vercel (necesita: cuenta de Vercel con acceso al repositorio; opcional Stripe de prueba, Resend, DNS)

1. Dos proyectos sobre el mismo repositorio: `spanglish-web` (Root Directory `apps/web`) y `spanglish-app` (Root Directory `apps/app`); Next.js; "Include files outside the root directory" activado; Production Branch `main`. El `vercel.json` de cada app fija la instalación y cuándo saltarse un build.
2. Variables de Production según la tabla de la sección 2.
   - Web: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `WEB_REVALIDATE_SECRET`, `SITE_NOINDEX=1` (solo demo), `ENABLE_EXPERIMENTAL_COREPACK=1`, y Resend o `LEADS_LOG_ONLY=1`; Stripe de prueba opcional.
   - Portal: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Sensitive), `WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET` (el mismo valor que en la web), `ENABLE_EXPERIMENTAL_COREPACK=1`.
3. Deployment Protection: "Vercel Authentication" en **Only Preview Deployments**.
4. Desplegar los dos; en Supabase → Authentication → URL Configuration: Site URL = URL del portal, Redirect URLs = `https://<portal>/**`.
5. (Opcional) Stripe de prueba: webhook `https://<web>/api/stripe/webhook` con `checkout.session.completed` y `checkout.session.async_payment_succeeded`; su `whsec_…` a `STRIPE_WEBHOOK_SECRET`; volver a desplegar.
6. (Opcional) Dominios propios para la demo: `CNAME` a `cname.vercel-dns.com`; actualizar las `NEXT_PUBLIC_*_URL`, `WEB_REVALIDATE_URL` y las URL de Auth; volver a desplegar. No tocar los registros del dominio principal ni los del correo.

### M3 · Salida a demo (verificación, en orden)

1. Salud: la web responde `db: "ok"` e `indexing: false`; el portal, `db: "ok"`.
2. La web lleva `X-Robots-Tag: noindex, nofollow` y su `robots.txt` dice `Disallow: /`; lo mismo el portal.
3. Entrar con las cuatro cuentas de demo; publicar algo como administradora y verlo en la web en menos de un minuto.
4. Ensayar el guion completo en móvil (375 px) y escritorio, cronometrado (15 minutos como mucho).
5. `git status` en local: ningún `.env*` salvo `.env.example`.

### M4 · Salida a producción

1. Proyecto de Supabase nuevo de producción (M1 completo, **sin** datos de demostración), plan de pago, primera administradora real por SQL.
2. Vercel: **quitar `SITE_NOINDEX`**, claves `live` de Stripe, Resend con dominio verificado, sin `LEADS_LOG_ONLY`, dominios reales.
3. Redirecciones 301 desde WordPress y DNS.
4. M3 de nuevo, esperando `indexing: true` y sin `X-Robots-Tag`.

## 5. Guion de la demo (con Maribel)

1. **Web pública (3 min)** en `https://<web>/es`: Inicio → Lecciones → Precios → Recursos (videos, tres niveles de acceso con candados) → Aprende ahora (El alfabeto, Sustantivos y "DEMO · Los colores"; niveles con "Próximamente" y una lección con candado) → abrir El alfabeto y hacer un ejercicio → cambiar a English.
2. **Entrar como administradora (1 min):** botón "Entrar" → cuenta `admin.demo@…` → panel.
3. **Crear un recurso (2 min):** Recursos → Nuevo → tipo "Ficha", nivel "Libre", títulos en español e inglés → guardar → subir un PDF → Publicar.
4. **Crear una lección (3 min):** Lecciones → Adultos › A1 → Añadir → título y slug → bloques: texto, video (pegar una URL de YouTube de Maribel), pregunta de 3 opciones → Vista previa en inglés → Publicar.
5. **Verlo en la web (1 min):** recargar Recursos y Aprende ahora: aparecen la ficha (descarga) y la lección (abrirla y responder la pregunta).
6. **Niveles de acceso (3 min):** cerrar sesión; entrar como `visitor.demo@…` → lo "Con cuenta" abierto, lo de alumnos con candado; entrar como `student.demo@…` → todo abierto, abrir la ficha de alumnos y la lección "El pretérito".
7. **Qué viene después (2 min):** grupos, calendario, asistencia y pagos (plan 1B).

## 6. Pasar de demo a producción

- **Base nueva:** no se reutiliza el proyecto de la demo. Proyecto de Supabase de producción, de pago, con las mismas migraciones y sin `demo:seed`.
- **Indexación:** quitar `SITE_NOINDEX` de la web (el portal nunca se indexa).
- **Claves reales:** Stripe `live` con su webhook, Resend con dominio verificado; quitar `LEADS_LOG_ONLY`.
- **Dominio real:** `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL`, `WEB_REVALIDATE_URL` y las URL de Auth de Supabase apuntando a los dominios definitivos.
- **Datos de demostración:** si alguna vez se sembraron en un proyecto que va a quedarse, retirarlos con `demo:seed remove` antes de abrirlo.
