# Sistema de diseño Spanglish (v0.1)

Tokens en `packages/ui/tokens.css`. Logo en `brand/`.

## Roles de color
- Morado `#592F85`: estructura (sidebar, cabeceras).
- Fucsia `#D71950`: acción principal y enlaces activos.
- Amarillo `#FCD404`: destacados y tarjetas hero. Solo como fondo, texto en `--ink`.
- Burdeos `#8F0831`: hover/pressed de la acción y énfasis profundo.

## Contrastes medidos (WCAG, mínimo AA 4.5:1 en texto)
| Par | Ratio |
|---|---|
| ink / crema | 16.8 |
| ink / amarillo | 12.5 |
| blanco / fucsia | 5.1 |
| fucsia / crema | 4.7 |
| blanco / burdeos | 9.4 |
| blanco / morado | 9.7 |
| amarillo / morado | 6.7 |
| ink-muted / crema | 6.7 |

## Web pública (apps/web)
- Tipografías: **Lilita One** (rotulado: titulares, precios, bocadillos; gruesa y redondeada como las letras del logo) + **Figtree** (texto; sans cálida y legible). Ambas con `latin-ext` (ñ, á, ¡, ¿), servidas por `next/font`.
- Gesto de marca: el **bocadillo** del logo. Las secciones se abren con una pregunta en bocadillo (`SectionQuestion`) y la extrusión burdeos sin desenfoque del logo (`--bubble-shadow`) se usa solo en bocadillos y en el rotulado (`.lettering`).
- Campos de color por sección: amarillo (hero), crema, morado, crema, burdeos, arena, fucsia, morado (pie). Fucsia sobre amarillo (3.7:1) solo en texto grande.
- Foco: 3px morado; dentro de `.on-dark` (morado, burdeos, fucsia) pasa a amarillo.
- Páginas interiores: cada público conserva su color de la home (adultos fucsia, niños amarillo, mayores morado; Conócenos burdeos; Contacto fucsia). El hero abre con la pregunta del visitante en un bocadillo blanco y la respuesta en el color opuesto (`PageHero` + `HeroChat`). Recorrido: quién → cómo es una clase (hilo de bocadillos sobre morado) → formatos → precios → dudas → otras páginas → clase gratis (`FreeLessonBand`, fucsia).
- Rutas: `apps/web/src/lib/routes.ts` es la única fuente de los slugs (los de la web antigua, iguales en es/en).

## Pendiente
Tipografías del portal (apps/app), modo oscuro, escala tipográfica, componentes shadcn tematizados, logo SVG.
