import { z } from "zod";

/** Juegos que pueden ir dentro de una lección. */
export const GAME_TYPES = ["match", "fill", "order", "flashcards", "truefalse"] as const;
export type GameType = (typeof GAME_TYPES)[number];

const text = (max = 160) => z.string().trim().min(1).max(max);

const pair = z.object({ a: text(), b: text() });
const fillItem = z
  .object({ text: text(240), answer: text(60), options: z.array(text(60)).min(2).max(5) })
  .refine((i) => i.text.includes("___") && i.options.includes(i.answer), { message: "fill" });
const orderItem = z
  .object({ sentence: text(200), translation: text(200).optional() })
  .refine((i) => i.sentence.split(/\s+/).length >= 2 && i.sentence.split(/\s+/).length <= 12, { message: "order" });
const truefalseItem = z.object({ text: text(240), answer: z.boolean(), explanation: text(240).optional() });

const ITEM_SCHEMAS = {
  match: z.array(pair).min(2).max(8),
  fill: z.array(fillItem).min(1).max(10),
  order: z.array(orderItem).min(1).max(8),
  flashcards: z.array(pair).min(1).max(30),
  truefalse: z.array(truefalseItem).min(1).max(10),
} as const;

export type MatchItem = z.infer<typeof pair>;
export type FillItem = z.infer<typeof fillItem>;
export type OrderItem = z.infer<typeof orderItem>;
export type TrueFalseItem = z.infer<typeof truefalseItem>;

export type GameData =
  | { gameType: "match"; items: MatchItem[] }
  | { gameType: "flashcards"; items: MatchItem[] }
  | { gameType: "fill"; items: FillItem[] }
  | { gameType: "order"; items: OrderItem[] }
  | { gameType: "truefalse"; items: TrueFalseItem[] };

/** Valida la lista de elementos de un juego; null si no es válida. */
export function parseGameItems(type: GameType, items: unknown): GameData | null {
  const result = ITEM_SCHEMAS[type].safeParse(items);
  return result.success ? ({ gameType: type, items: result.data } as GameData) : null;
}

export type GameSourceError = "empty" | "format" | "count";

const TRUE_WORDS = new Set(["v", "verdadero", "true", "t", "si", "sí", "yes", "y"]);
const FALSE_WORDS = new Set(["f", "falso", "false", "no", "n"]);

const lines = (source: string) =>
  source
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * Convierte el texto que escribe la administración (una línea por elemento) en
 * los datos del juego. Formatos:
 *   match / flashcards:  casa = house
 *   fill:                Yo ___ estudiante. | soy | eres, es
 *   order:               Yo soy estudiante | I am a student   (traducción opcional)
 *   truefalse:           El gato es un animal. | v | explicación opcional
 */
export function parseGameSource(
  type: GameType,
  source: string,
): { ok: true; data: GameData } | { ok: false; error: GameSourceError; line?: number } {
  const rows = lines(source);
  if (rows.length === 0) return { ok: false, error: "empty" };
  const items: unknown[] = [];
  for (const [index, row] of rows.entries()) {
    const fail = { ok: false as const, error: "format" as const, line: index + 1 };
    if (type === "match" || type === "flashcards") {
      const [a, ...rest] = row.split("=");
      const b = rest.join("=").trim();
      if (!a?.trim() || !b) return fail;
      items.push({ a: a.trim(), b });
    } else if (type === "fill") {
      const [sentence, answer, wrong] = row.split("|").map((p) => p.trim());
      if (!sentence || !answer || !wrong) return fail;
      const wrongs = wrong.split(",").map((w) => w.trim()).filter(Boolean);
      items.push({ text: sentence, answer, options: [answer, ...wrongs.filter((w) => w !== answer)] });
    } else if (type === "order") {
      const [sentence, translation] = row.split("|").map((p) => p.trim());
      if (!sentence) return fail;
      items.push(translation ? { sentence, translation } : { sentence });
    } else {
      const [statement, verdict, explanation] = row.split("|").map((p) => p.trim());
      const key = verdict?.toLocaleLowerCase();
      if (!statement || !key || (!TRUE_WORDS.has(key) && !FALSE_WORDS.has(key))) return fail;
      items.push({ text: statement, answer: TRUE_WORDS.has(key), ...(explanation ? { explanation } : {}) });
    }
  }
  const data = parseGameItems(type, items);
  if (!data) {
    // Por tamaño o por formato interno de alguna línea.
    const countProblem = !ITEM_SCHEMAS[type].safeParse(items).success && items.length !== undefined &&
      (items.length < 1 || items.length > 30 || (type === "match" && (items.length < 2 || items.length > 8)));
    return { ok: false, error: countProblem ? "count" : "format" };
  }
  return { ok: true, data };
}

/** Texto editable de un juego (lo inverso de parseGameSource). */
export function gameToSource(data: GameData): string {
  switch (data.gameType) {
    case "match":
    case "flashcards":
      return data.items.map((i) => `${i.a} = ${i.b}`).join("\n");
    case "fill":
      return data.items.map((i) => `${i.text} | ${i.answer} | ${i.options.filter((o) => o !== i.answer).join(", ")}`).join("\n");
    case "order":
      return data.items.map((i) => (i.translation ? `${i.sentence} | ${i.translation}` : i.sentence)).join("\n");
    case "truefalse":
      return data.items.map((i) => [i.text, i.answer ? "v" : "f", i.explanation].filter(Boolean).join(" | ")).join("\n");
  }
}
