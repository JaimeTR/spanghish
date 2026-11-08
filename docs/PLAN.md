# Spanglish: plan maestro (v0.1, 2026-11-08)

## 1. Qué encontré en la web actual (spanglish.com.au)
- WordPress en Sunshine Coast / Brisbane, una profesora (Maribel), clases de 70 min.
- Menú: Lessons (Adult, Kids, Mature; "Online Conversations", "DELE", "After School" marcados como próximamente), Meet Us, Resources, Learn Now, Send Enquiry, "Book Your Free Lesson" (/bookings/).
- Precios reales: grupos desde $30 pp; mayores $40/clase o $390 por 10; grupos $205–$310 por 6–9 semanas; conversación online $245 por 10 semanas. Hoy se paga por transferencia bancaria y Eventbrite.
- Contacto: 0413 178 583, hello@spanglish.com.au. Redes: Facebook, Instagram, LinkedIn, TikTok, Threads (@spanglishworldwide).
- Problemas a corregir en el rediseño: fechas vencidas en la home (21 y 27 oct), edad de niños inconsistente (4–13 vs 6–13), botones "Book Now" apuntan a una plantilla de blog, texto de relleno en latín en el newsletter, "Age Care" vs "Mature", recursos con enlaces "#".
- Sin leer aún: /teachers/, /bookings/, /time-table/, FAQ.
- Implicación: la plataforma debe modelar **ediciones/cohortes con fecha** (6, 9, 10 semanas), **pay-as-you-go**, **packs de clases**, **sedes** (bibliotecas, WOTSO) y **segmentos por edad** (niños 6–13, adultos 14+, mayores 65+).

## 2. Revisión del PRD: qué cambiaría
1. **MVP demasiado grande** (21 módulos). Propuesta en 3 hitos (sección 6).
2. **Dos repos**: mejor **un monorepo** con dos apps (web y app) y paquetes compartidos (ui, tipos de BD, i18n). Evita que el sistema de diseño y los tipos de Supabase se desincronicen. Dos proyectos Vercel, dos dominios, un repo.
3. **Faltan en el modelo de datos**: `locations` (sedes), `packs/credits` (clases prepagas y pay-as-you-go), `waitlist`, `invoices` con GST, `terms_acceptance` (política de cancelación y consentimiento), `consents` (menores, fotos/grabaciones), `content_translations` (ES/EN en CMS), `email_log`.
4. **Pagos**: Stripe (AUD, tarjetas, Apple/Google Pay). Transferencia bancaria y Eventbrite = "pago externo" registrado a mano, con conciliación. Webhooks firmados + tabla de transacciones append-only.
5. **Zona horaria**: guardar en UTC, mostrar en `Australia/Brisbane` (Queensland no usa horario de verano). Alumnos online en otras zonas ven su hora local.
6. **Menores y grabaciones**: grabaciones de niños requieren consentimiento explícito del tutor. El rol Tutor debería entrar en el MVP-2, no mucho después, porque los niños (6–13) son un segmento central.
7. **Cumplimiento (AU)**: Privacy Act / APPs, código de privacidad online para menores (OAIC), Spam Act para email marketing, GST 10% si está registrada. Revisión legal antes del lanzamiento, como ya dice el PRD.
8. **Video**: no alojar video en Supabase. Usar Mux, Vimeo o YouTube no listado según presupuesto; PDFs/audio en Supabase Storage con URLs firmadas.
9. **Videoconferencia**: en el MVP solo guardar el enlace (Zoom/Meet). Integración vía API después.
10. **Auditoría**: `audit_logs` por triggers en Postgres, no solo desde la app.

## 3. Stack recomendado
| Capa | Elección | Motivo |
|---|---|---|
| Monorepo | pnpm + Turborepo | Un repo, dos apps, paquetes compartidos |
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui | Ya definido en el PRD |
| i18n | next-intl (ES/EN) | Rutas `/es` `/en`, textos tipados |
| Backend | Supabase (Postgres, Auth, Storage, RLS) | Ya definido |
| Formularios | react-hook-form + zod | Validación compartida cliente/servidor |
| Datos | TanStack Query + Server Actions | Dashboard fluido |
| Gráficos | Recharts | Dashboard de actividad/progreso |
| Calendario | FullCalendar o react-big-calendar | Sesiones, reprogramar |
| Pagos | Stripe + registro manual | AUD, webhooks |
| Email | Resend + React Email | Transaccional bilingüe |
| CMS web | Tablas en Supabase (pages, posts, testimonials, public_programs) con editor en la app | Sin WordPress, sin plugin extra |
| Errores/analítica | Sentry + Vercel Analytics | |
| Tests | Vitest + Playwright (incl. pruebas de RLS) | |
| Hosting | Vercel + Supabase, entornos dev/staging/prod | Ya definido |

## 4. Skills recomendadas para el proyecto
- **impeccable** (ya cargada): sistema de diseño, DESIGN.md, dashboard, auditoría y pulido de UI.
- **vercel-react-best-practices** y **vercel-composition-patterns**: rendimiento y arquitectura de componentes en Next.js.
- **web-design-guidelines**: revisión de accesibilidad (WCAG 2.2 AA) antes de cada hito.
- **Supabase agent skill** (`npx skills add supabase/agent-skills`): RLS y migraciones seguras.
- **webapp-testing**: pruebas con Playwright.

## 5. Marca y sistema de diseño
Colores oficiales: amarillo `#FCD404`, fucsia `#D71950`, burdeos `#8F0831`, morado `#592F85`.
Notas de contraste (a verificar con herramienta antes de fijar tokens):
- Amarillo: **nunca** como color de texto sobre blanco; sirve de fondo con texto oscuro.
- Burdeos y morado: texto y superficies oscuras con buen contraste.
- Fucsia: acción primaria y acentos; comprobar texto pequeño blanco sobre fucsia.
- Neutros cálidos (crema, no gris frío) y un casi-negro tintado de morado para el texto.

Rol de cada color:
- Morado = estructura (sidebar, cabeceras), confianza.
- Fucsia = acción principal (botones, enlaces, estados activos).
- Amarillo = energía y destacados (tarjetas hero, promociones, insignias).
- Burdeos = énfasis profundo, alertas suaves, hover oscuro.
- Estados (éxito/aviso/error) con tonos propios, separados de la marca.

Tipografía: una sans geométrica con carácter para títulos y una sans legible para UI, con soporte de acentos del español (ñ, á, ¿ ¡). Se define al construir los tokens.

## 6. Dashboards: dirección a partir de tus dos referencias
Qué tomar de cada una:
- **Filko**: fondo crema, tarjetas grandes de color con ilustración, titular grande de saludo, lista de módulo con progreso, panel "Scheduled" a la derecha. Da calidez y personalidad.
- **E-ducate**: sidebar oscuro, "Continue classes", "My courses", gráficos de actividad y progreso, lista de tareas con fecha. Da densidad útil.

Propuesta Spanglish (con la paleta propia, sin copiar):
- **Alumno** (el más expresivo): saludo en ES/EN, "Tu próxima clase" con cuenta regresiva y botón Unirme, tarjetas de curso con progreso, tareas pendientes, grabaciones recientes, panel lateral de calendario.
- **Docente**: clases de hoy, asistencia en un clic, entregas por revisar, mis grupos.
- **Administradora** (el más sobrio, 'Operate'): KPIs (alumnos activos, matrículas pendientes, pagos pendientes, solicitudes nuevas), próximas clases, cola de solicitudes, actividad reciente, gráfico de ingresos y ocupación de grupos.
- Móvil primero para alumno y docente (la mayoría lo abrirá desde el teléfono).
- Evitar: tarjetas idénticas repetidas, métricas decorativas, gradientes de relleno.

## 7. Hitos (propuesta de MVP en 3 partes)
**Hito 1 — Núcleo operativo (Fases 2–4):** auth y roles, RLS, idiomas/niveles, programas, cursos, grupos, matrículas, calendario, clases y asistencia, dashboard admin/docente.
**Hito 2 — Experiencia de alumno (Fase 5):** portal del alumno, biblioteca, grabaciones, tareas y progreso básico, notificaciones por email, rol Tutor para menores.
**Hito 3 — Negocio y web (Fases 6–7):** Stripe + pagos externos, solicitudes y clase gratuita, gestión de contenido web, nueva web pública, migración y redirecciones 301.
Luego: pruebas, seguridad, lanzamiento y capacitación (Fases 8–9).

## 8. Datos que necesito de ti
1. **Logo** en SVG o PNG de alta resolución (y variantes: horizontal, solo icono, versión blanca). Hoy solo está el PNG de la web: `/wp-content/uploads/2025/10/logo-spanglish-ok.png`.
2. **Tipografías de marca** si existen, o libertad para elegirlas.
3. **Acceso o export de WordPress** (o confirmar que puedo rastrear la web pública) para inventario completo, incluyendo /teachers/, /bookings/, /time-table/, FAQ, imágenes y videos.
4. **Pagos**: ¿tienen cuenta Stripe o prefieren otra pasarela? ¿Están registradas para GST? ¿Qué pasa hoy con los pagos por transferencia?
5. **Videoconferencia y video**: ¿Zoom, Google Meet u otra? ¿Dónde están hoy los videos (YouTube, Vimeo)?
6. **Alcance de idiomas**: ¿inglés para hispanohablantes se lanza ya o solo español al inicio?
7. **Política de cancelación y recuperación de clases** y textos legales existentes.
8. **Persona dueña de cuentas**: cuenta de Supabase, Vercel y GitHub (¿en qué organización?) y quién controla el dominio spanglish.com.au.
9. **Prioridad de fecha**: ¿hay fecha objetivo de lanzamiento?
10. **Nombre de la docente y administradora** para datos de prueba y textos reales (Maribel aparece como docente en la web).
