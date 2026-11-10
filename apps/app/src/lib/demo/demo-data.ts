import type { TablesInsert } from "@spanglish/db";

export const DEMO_ID = (n: number): string => `de000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function assertDemoTarget(env: Record<string, string | undefined>): { url: string; serviceKey: string; projectRef: string } {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const projectRef = env.DEMO_SEED_PROJECT_REF;
  if (!url || !serviceKey || !projectRef) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o DEMO_SEED_PROJECT_REF.");
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("NEXT_PUBLIC_SUPABASE_URL debe ser https://<ref>.supabase.co."); }
  const match = /^([a-z0-9]+)\.supabase\.co$/i.exec(parsed.hostname);
  if (parsed.protocol !== "https:" || !match || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || match[1] !== projectRef) {
    throw new Error("Destino demo inválido: la URL debe ser https://<ref>.supabase.co y coincidir con DEMO_SEED_PROJECT_REF.");
  }
  return { url: parsed.origin, serviceKey, projectRef };
}

export type DemoUser = { key: "admin" | "teacher" | "student" | "visitor"; email: string; password: string; fullName: string; initialRole: "teacher" | "student"; extraRoles: ("admin")[]; studentRow: boolean };
export function demoUsers(env: Record<string, string | undefined>): DemoUser[] {
  const vars = ["DEMO_PASSWORD_ADMIN", "DEMO_PASSWORD_TEACHER", "DEMO_PASSWORD_STUDENT", "DEMO_PASSWORD_VISITOR"] as const;
  const missing = vars.filter((key) => !env[key] || env[key]!.length < 12);
  if (missing.length) throw new Error(`Define contraseñas de al menos 12 caracteres: ${missing.join(", ")}.`);
  const domain = (env.DEMO_EMAIL_DOMAIN || "demo.spanglish.test").replace(/^@/, "");
  return ([
    ["admin", "admin", "Administradora", "teacher", ["admin"], false],
    ["teacher", "teacher", "Docente", "teacher", [], false],
    ["student", "student", "Alumna", "student", [], true],
    ["visitor", "visitor", "Visitante", "student", [], false],
  ] as const).map(([key, local, fullName, initialRole, extraRoles, studentRow]) => ({
    key, email: `${local}.demo@${domain}`, password: env[`DEMO_PASSWORD_${key.toUpperCase()}`]!, fullName: `DEMO · ${fullName}`,
    initialRole, extraRoles: [...extraRoles], studentRow,
  }));
}

type Content = { resources: TablesInsert<"resources">[]; lessons: TablesInsert<"lessons">[]; blocks: TablesInsert<"lesson_blocks">[]; files: { resourceId: string; path: string; bytes: Uint8Array; mime: string }[]; locations: TablesInsert<"locations">[]; programs: TablesInsert<"programs">[] };
export function buildDemoContent(): Content {
  const resources: TablesInsert<"resources">[] = [
    { id: DEMO_ID(1), kind: "worksheet", access_level: "public", status: "published", title_es: "DEMO · Saludos básicos", title_en: "DEMO · Basic greetings", description_es: "Una ficha breve para practicar saludos.", description_en: "A short worksheet to practise greetings.", file_path: `resources/${DEMO_ID(1)}/${DEMO_ID(101)}.pdf`, file_mime: "application/pdf", file_size_bytes: minimalPdf("Saludos básicos").byteLength, thumbnail_path: `thumbnails/${DEMO_ID(1)}.png`, sort_order: 10 },
    { id: DEMO_ID(2), kind: "link", access_level: "account", status: "published", title_es: "DEMO · Diccionario", title_en: "DEMO · Dictionary", description_es: "Consulta palabras nuevas.", description_en: "Look up new words.", external_url: "https://dle.rae.es/", sort_order: 20 },
    { id: DEMO_ID(3), kind: "video", access_level: "enrolled", status: "published", title_es: "DEMO · Video para alumnos", title_en: "DEMO · Student video", description_es: "Práctica de español.", description_en: "Spanish practice.", youtube_id: "GilfeIjZm_g", sort_order: 30 },
    { id: DEMO_ID(4), kind: "worksheet", access_level: "enrolled", status: "published", title_es: "DEMO · Deberes semana 1", title_en: "DEMO · Week 1 homework", description_es: "Repasa lo aprendido esta semana.", description_en: "Review this week's learning.", file_path: `resources/${DEMO_ID(4)}/${DEMO_ID(104)}.pdf`, file_mime: "application/pdf", file_size_bytes: minimalPdf("Deberes semana 1").byteLength, sort_order: 40 },
  ];
  const lessons: TablesInsert<"lessons">[] = [
    { id: DEMO_ID(11), slug: "demo-los-colores", kind: "article", category: "foundations", access_level: "public", status: "published", title_es: "DEMO · Los colores", title_en: "DEMO · Colours", summary_es: "Aprende colores básicos.", summary_en: "Learn basic colours.", sort_order: 10 },
    { id: DEMO_ID(12), slug: "demo-presentarse", kind: "article", category: "adults", level_id: DEMO_ID(201), access_level: "account", status: "published", title_es: "DEMO · Presentarse", title_en: "DEMO · Introducing yourself", summary_es: "Preséntate en español.", summary_en: "Introduce yourself in Spanish.", sort_order: 20 },
    { id: DEMO_ID(13), slug: "demo-preterito", kind: "article", category: "adults", level_id: DEMO_ID(203), access_level: "enrolled", status: "published", title_es: "DEMO · El pretérito", title_en: "DEMO · The preterite", summary_es: "Habla de acciones pasadas.", summary_en: "Talk about past actions.", sort_order: 30 },
  ];
  const blocks: TablesInsert<"lesson_blocks">[] = [
    { id: DEMO_ID(31), lesson_id: DEMO_ID(11), position: 10, kind: "text", body_es: "Los colores básicos son **rojo**, **azul** y **amarillo**.", body_en: "The basic colours are **red**, **blue** and **yellow**." },
    { id: DEMO_ID(32), lesson_id: DEMO_ID(11), position: 20, kind: "image", image_path: `lessons/${DEMO_ID(11)}/${DEMO_ID(132)}.png`, image_width: 250, image_height: 198, alt_es: "Logotipo Spanglish", alt_en: "Spanglish logo" },
    { id: DEMO_ID(33), lesson_id: DEMO_ID(11), position: 30, kind: "video", youtube_id: "GilfeIjZm_g" },
    { id: DEMO_ID(36), lesson_id: DEMO_ID(11), position: 40, kind: "quiz", body_es: "¿De qué color es el cielo despejado?", body_en: "What colour is a clear sky?", options_es: ["Azul", "Rojo"], options_en: ["Blue", "Red"], correct_option: 0 },
    { id: DEMO_ID(34), lesson_id: DEMO_ID(12), position: 10, kind: "text", body_es: "Di **hola** y comparte tu nombre.", body_en: "Say **hola** and share your name." },
    { id: DEMO_ID(35), lesson_id: DEMO_ID(13), position: 10, kind: "text", body_es: "El pretérito cuenta acciones terminadas.", body_en: "The preterite describes completed actions." },
  ];
  const files = [1, 4].map((n) => ({ resourceId: DEMO_ID(n), path: resources[n - 1]!.file_path!, bytes: minimalPdf(n === 1 ? "Saludos básicos" : "Deberes semana 1"), mime: "application/pdf" }));
  const locations: TablesInsert<"locations">[] = [
    { id: DEMO_ID(41), name: "DEMO · Biblioteca de Sunshine Coast", kind: "library", region: "sunshine_coast", address: "", map_url: null },
    { id: DEMO_ID(42), name: "DEMO · Online", kind: "online", region: "online", address: null, map_url: null },
  ];
  const programs: TablesInsert<"programs">[] = [{ id: DEMO_ID(51), code: "demo-adults-a1", name_es: "DEMO · Adultos A1", name_en: "DEMO · Adults A1", language_code: "es", audience: "adults", format: "local_group", level_id: DEMO_ID(201), duration_weeks: 8, lesson_minutes: 60, is_public: true }];
  return { resources, lessons, blocks, files, locations, programs };
}

export function minimalPdf(title: string): Uint8Array {
  const safe = title.replace(/[^\x20-\x7e]/g, "?").replace(/[()\\]/g, "\\$&");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${new TextEncoder().encode(`BT /F1 14 Tf 30 150 Td (${safe}) Tj ET`).length} >>\nstream\nBT /F1 14 Tf 30 150 Td (${safe}) Tj ET\nendstream`];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(new TextEncoder().encode(body).length); body += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = new TextEncoder().encode(body).length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

export function parseArgs(argv: string[]): { command: "seed" | "remove"; dryRun: boolean } {
  const args = [...argv];
  let command: "seed" | "remove" = "seed";
  if (args[0] === "seed" || args[0] === "remove") command = args.shift() as "seed" | "remove";
  const dryRun = args.includes("--dry-run");
  if (dryRun) args.splice(args.indexOf("--dry-run"), 1);
  if (args.length) throw new Error("Uso: demo:seed [seed|remove] [--dry-run]");
  return { command, dryRun };
}
