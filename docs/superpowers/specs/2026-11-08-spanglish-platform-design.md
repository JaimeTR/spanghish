# Spanglish: web pública y plataforma educativa. Diseño

Fecha: 2026-11-08. Estado: pendiente de aprobación. Base: PRD v1.0, `docs/PLAN.md`, inventario de spanglish.com.au (WordPress).

## 1. Intención y por qué
El desarrollador (Jaime) construye el sistema para su clienta, **Maribel Mayhua**, docente de español (y también de inglés a hispanohablantes) en Sunshine Coast y Brisbane, Australia. Hoy Maribel es la única docente activa; habrá más. Da sobre todo **clases en vivo** (online y presenciales en bibliotecas y oficinas) y quiere que la plataforma sirva de apoyo: recursos, lecciones interactivas y avance por niveles A1 a C2.

Hoy todo vive en un WordPress con plantilla médica sin limpiar: horarios con "Dr. Tanner", lecciones de "teeth whitening", lorem ipsum, FAQ que da 404, reservas por formulario que promete responder en 2 horas, pagos por transferencia y Eventbrite. No hay forma de gestionar alumnos, grupos ni pagos.

Entregables: (1) web pública nueva, bilingüe; (2) portal privado con vistas de administradora, docente y alumno.

## 2. Objetivos, no objetivos, antiobjetivos
**Objetivos**
- Maribel gestiona alumnos, cursos, grupos, clases, asistencia y pagos desde un solo lugar.
- Los alumnos entran a su espacio: horario, enlace de clase, materiales, grabaciones, tareas, lecciones interactivas y progreso.
- La web pública convierte visitas en clases gratuitas e inscripciones, con buen SEO.
- Las ~60 lecciones interactivas actuales se conservan y mejoran.
- Preparado para más docentes y más idiomas sin rehacer nada.

**No objetivos (primera versión)**: app móvil, IA y pronunciación, certificados, portal de tutores avanzado, integración por API con Zoom/Meet, evaluaciones avanzadas, multi-institución.

**Antiobjetivos** (fracaso aunque funcione): que Maribel necesite al desarrollador para tareas diarias; fugas de datos de menores; perder SEO o URLs de la web actual sin redirección; interfaz recargada para una escuela de una docente.

## 3. Restricciones
- Australia: AUD, GST 10% (por confirmar registro), zona `Australia/Brisbane` (sin horario de verano), Privacy Act y APPs, Spam Act. Código de privacidad de menores a revisar (alumnos de 6 a 13).
- Marca: amarillo `#FCD404`, fucsia `#D71950`, burdeos `#8F0831`, morado `#592F85`. Logo: globo amarillo con "¡SPAN GLISH!".
- Stack del PRD: Next.js, TypeScript, Tailwind, shadcn/ui, Supabase (Postgres, Auth, Storage, RLS), Vercel, GitHub.
- Repositorio: `JaimeTR/spanghish` (público). Sin secretos en el repo.

## 4. Enfoques considerados
- **A. Monorepo con dos apps** (`apps/web`, `apps/app`) y Supabase compartido. Separa SEO de la zona privada, despliegue independiente. Costo: algo más de configuración. **Elegido.**
- **B. Una sola app** con zona pública y privada. Más simple, pero mezcla preocupaciones y separarlas después cuesta.
- **C. Mantener WordPress y construir solo el portal.** Menos trabajo inicial, pero no resuelve la plantilla médica, los plugins ni la seguridad, y no cumple el rediseño.

Elegido por el desarrollador: A.

## 5. Decisiones tomadas
Elegidas por el usuario: monorepo (A); español e inglés en web y portal.
**Decisiones mías** (marcadas para que se corrijan):
- Moneda AUD, GST y hora de Brisbane; zona horaria y moneda configurables por alumno más adelante.
- Idiomas de enseñanza: español e inglés desde el día uno.
- Un rol de docente con soporte para varias; Pamela Rojas queda como futura.
- Pagos: Stripe para tarjeta; transferencia y Eventbrite se registran a mano con conciliación; transacciones inalterables.
- Clases en vivo: se guarda el enlace de videoconferencia (Zoom/Meet), sin integración API.
- Lecciones interactivas: tipo de contenido propio del portal, por nivel A1 a C2, con ejercicios (arrastrar, escribir, elegir). Migración de las ~60 de WordPress en el hito 2.
- Materiales de pago (~$2): venta desde el portal con carrito mínimo.
- i18n con `next-intl`, rutas `/es` y `/en`; contenido de la web editable en ambos idiomas.
- Un monorepo pnpm + Turborepo; paquetes compartidos: `ui` (tokens), tipos de BD, i18n.
- Auditoría por triggers de Postgres; pruebas de RLS automatizadas.

## 6. Estructura funcional
Roles: administradora (control global), docente (solo sus grupos), alumno (solo lo suyo), tutor (hito 2, para menores). Módulos del MVP según PRD §5, con estos matices del negocio real:
- **Programas con ediciones por fecha** (6, 9, 10 semanas), packs de clases, pay-as-you-go, clase gratuita de 45 minutos.
- **Segmentos por edad**: niños 6–13, adultos 14+, mayores 65+.
- **Sedes**: bibliotecas, WOTSO, domicilio, online.
- **Formatos**: individual, grupo propio (máx. 2), grupo local.
- Precios actuales de referencia: grupos desde $25 a $45 por clase; mayores $40 o $390 por 10; 9 semanas $310; 6 semanas $205; conversación online $245 por 10.
- Web pública: Inicio, Lecciones (Adultos, Niños, Mayores, Conversación online, DELE, After school), Meet Us, Recursos, Learn Now, Contacto/consulta, Reserva de clase gratuita, FAQ, Time Table real, testimonios.

## 7. Hitos
1. **Núcleo operativo:** auth y roles, RLS, idiomas y niveles, programas, cursos, grupos, matrículas, calendario, clases, asistencia, dashboards de administradora y docente.
2. **Experiencia del alumno:** portal, biblioteca, grabaciones, lecciones interactivas (migración), tareas, progreso, notificaciones, rol Tutor para menores.
3. **Negocio y web:** Stripe y pagos externos, solicitudes y clase gratuita, gestión de contenido web, web pública bilingüe, migración y redirecciones 301, pruebas de seguridad y lanzamiento.

## 8. Diseño visual
Sistema en `packages/ui/tokens.css` y `docs/DESIGN.md`. Dashboards: alumno expresivo (cálido, tarjetas de color, próxima clase), docente operativo (clases de hoy, asistencia en un clic), administradora sobria (KPIs y colas). Móvil primero para alumno y docente. Referencias: Filko (calidez) y E-ducate (densidad útil). Tipografías por definir.

## 9. Migración
Inventario completo de URLs (≈150 páginas, 60 lecciones, 8 productos, 6 posts). Redirecciones 301 para toda URL que cambie. El contenido antiguo no se borra automáticamente. Basura de la plantilla (médica, lorem ipsum) no se migra.

## 10. Lo que se deja al builder
Elección de tipografías, estructura exacta de tablas, librería de calendario, esquema de las lecciones interactivas, textos del dashboard, plantillas de email, naming de rutas y orden interno de tareas dentro de cada hito.

## 11. Decisiones del builder tras la revisión (calls míos, corregibles)
- **Menores:** la cuenta de un menor de 13 o menos es siempre del tutor; el niño es un perfil bajo esa cuenta. El tutor acepta consentimiento (guardado con fecha y versión del texto). No se recogen fotos, escuela ni datos de salud. Las grabaciones que muestren niños solo se publican con consentimiento explícito. Se trata el código de privacidad de menores como requisito. El modelo `guardians` entra en el hito 1; el portal de tutores, en el 2.
- **Oferta:** los packs tienen saldo de clases que baja con la asistencia; sin caducidad salvo que la administradora la ponga. La clase gratuita es una por persona y crea una solicitud (lead), no un alumno. Precios por programa/edición, con precio por sede opcional.
- **Contenido web:** CRUD de administradora con secciones estructuradas, no un constructor de páginas. Editable: textos de página, programas, fechas, precios, testimonios, FAQ, horario, recursos, contacto, promociones. Español e inglés por campo.
- **Docentes:** sin `organization_id`. Cada docente ve solo sus grupos y alumnos; los pagos son solo de la administradora; no hay liquidación a docentes.
- **Notificaciones:** correo con Resend desde spanglish.com.au. Sin SMS ni WhatsApp en la primera versión.
- **Conciliación:** manual (la administradora marca una matrícula como pagada con referencia). Sin integración con banco ni Eventbrite.
- **Calendario:** reglas de repetición que generan sesiones concretas; cancelaciones y recuperaciones las gestiona docente o administradora; los alumnos solicitan cambios, no reprograman. El horario público se genera desde los grupos publicados.
- **Archivos:** grabaciones en un servicio de video externo con enlace protegido; tareas de alumnos en bucket privado con tipos y tamaño limitados.
- **Infraestructura:** Supabase en región Sydney; plan gratuito en desarrollo, plan de pago al lanzar.
- **Lecciones:** el formato final se decide al ver los datos de WordPress. Se incluye un editor de lecciones para la administradora y las docentes en el hito 2.

## 12. Respuestas del desarrollador (2026-11-08) y estado
- Stripe: Maribel ya tiene cuenta; los datos fiscales (GST) se pueden ajustar después. No bloquea.
- Lecciones: se copian rastreando la web pública actual. No se necesita acceso a WordPress.
- DNS y fecha de lanzamiento: no se necesitan para empezar. Se desarrolla ya.
- Diseño aprobado por el desarrollador para pasar al plan.
