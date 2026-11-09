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

El seed crea seis usuarios locales (admin, teacher, teacher2, student, guardian, suspended;
correos `*@spanglish.test`), además de un catálogo y alumnos de ejemplo (uno menor con su
tutor y un texto de consentimiento SOLO de desarrollo). Los correos y la contraseña de desarrollo están en `supabase/seed.sql`;
no se repiten aquí.

### Pruebas

- Unitarias: `pnpm test` (también `pnpm lint`, `pnpm typecheck`, `pnpm build`).
- Base de datos (pgTAP): `pnpm supabase test db`.
- Tipos de BD: tras cada migración, `pnpm supabase db reset` y `pnpm db:types`, y versionar
  `packages/db/src/database.types.ts` (CI falla si no coincide con las migraciones).
- e2e (Playwright, requiere Supabase local con seed): `pnpm --filter @spanglish/app e2e`.
  La primera vez: `pnpm --filter @spanglish/app exec playwright install chromium`.
  Algunas pruebas dejan datos en la base local a propósito: los consentimientos y sus
  textos son append-only/inmutables, así que los menores creados por el e2e se marcan
  inactivos (no se pueden borrar) y cada ejecución publica una versión nueva de un texto
  de consentimiento. `pnpm supabase db reset` deja la base limpia otra vez.

### Reglas

- `supabase/seed.sql` es solo para el stack local: crea usuarios con contraseña pública.
  Nunca usar `supabase db push --include-seed` ni Supabase Branching con este seed. El propio
  archivo aborta si la base no es la local.
- Nunca subir archivos `.env*` (solo `.env.example`) ni claves.

## Tienda y pagos (apps/web)

`/shop` vende los tres materiales digitales reales de la web anterior. Precios e ids en una sola
fuente: `apps/web/src/lib/shop.ts` (centavos de AUD). El carrito vive en el navegador
(localStorage); el pago es Stripe Checkout (página alojada por Stripe: los datos de la tarjeta no
pasan por la web). El servidor reconstruye las líneas del pago a partir de los ids; nunca usa
precios que lleguen del navegador.

Probar en local con claves de prueba de Stripe:

1. En `apps/web/.env.local`: `STRIPE_SECRET_KEY=sk_test_...` y `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
2. `stripe listen --forward-to localhost:3000/api/stripe/webhook` y copiar el `whsec_...` que
   muestra a `STRIPE_WEBHOOK_SECRET`.
3. `pnpm --filter @spanglish/web dev`, añadir materiales al carrito, "Ir a pagar" y pagar con la
   tarjeta de prueba `4242 4242 4242 4242`. El webhook (`checkout.session.completed`) manda el
   pedido a Maribel por el mismo canal que las solicitudes (Resend; sin Resend, a la consola).

**La entrega de los archivos es MANUAL por ahora**: tras el pago Maribel recibe un email con el
cliente, los productos, el total y el id de la sesión, y le envía los materiales respondiendo a ese
email. Stripe puede reenviar un aviso: el id de sesión del asunto permite detectar duplicados.
Fase 2: guardar los pedidos, subir los archivos a un almacenamiento privado y enviar al cliente
un enlace de descarga firmado y con caducidad desde el propio webhook.

Pendiente de la propietaria:

- Claves de Stripe (cuenta en AUD) y el endpoint del webhook en producción
  (`https://spanglish.com.au/api/stripe/webhook`, evento `checkout.session.completed` y
  `checkout.session.async_payment_succeeded`).
- Los archivos de cada material y su formato (no publicado: la web no dice PDF ni páginas).
- La descripción real de "El Abecedario – The Alphabet" (la publicada era texto de plantilla).
- Si los precios incluyen GST: hoy no se calcula ningún impuesto (`automatic_tax` desactivado).
- La política de reembolsos de materiales digitales (en `/terms` hay un `TODO(legal)`).

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
