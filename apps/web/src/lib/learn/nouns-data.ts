/**
 * "Spanish Nouns & Articles", copiada de la lección publicada en
 * spanglish.com.au (marcado y script de la página: palabras, ejemplos,
 * ejercicios, respuestas, explicaciones y mensajes). Texto en inglés tal como
 * se publicó; las palabras en español se marcan con lang="es" al pintarlas.
 */

export const SORT_POINTS = 10;
export const PLURAL_POINTS = 8;
export const MCQ_POINTS = 8;
export const BAG_POINTS = 4;
export const TOTAL_POINTS = SORT_POINTS + PLURAL_POINTS + MCQ_POINTS + BAG_POINTS;

export type Gender = "m" | "f";

/** Como norm() de la página publicada: sin tildes, minúsculas, sin signos y espacios simples. */
export function normalizeAnswer(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,!¡¿?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type PluralCheck = "right" | "empty" | "missingArticle" | "wrong";

export function checkPlural(input: string, answer: string): PluralCheck {
  const v = normalizeAnswer(input);
  if (v === normalizeAnswer(answer)) return "right";
  if (!v) return "empty";
  if (v === normalizeAnswer(answer.split(" ").slice(1).join(" "))) return "missingArticle";
  return "wrong";
}

export type BagCheck = { ok: true } | { ok: false; reason: "empty" | "structure" } | { ok: false; reason: "pluralNoun"; article: string };

export function checkBagItem(input: string): BagCheck {
  const v = normalizeAnswer(input);
  if (!v) return { ok: false, reason: "empty" };
  const m = v.match(/^(un|una|unos|unas) ([a-z]{2,})(.*)$/);
  if (!m) return { ok: false, reason: "structure" };
  if ((m[1] === "unos" || m[1] === "unas") && !/s$/.test(m[2]!)) return { ok: false, reason: "pluralNoun", article: m[1] };
  return { ok: true };
}

/** Mensajes de los ejercicios, tal como se publicaron. */
export const FEEDBACK = {
  sortLeft: (right: number, left: number) => `${right} correct so far — ${left} word${left > 1 ? "s" : ""} still to place.`,
  sortPerfect: "🎉 ¡Perfecto! 10 / 10 — you even spotted the exceptions!",
  sortSome: (right: number) => `${right} / 10 correct. Move the red words — remember: el día, el problema, la mano, la foto…`,
  shown: "Here are the answers. Click “Try again” to practise once more.",
  pluralPerfect: "🎉 ¡Muy bien! 8 / 8 — your plurals are perfect.",
  pluralSome: (right: number) => `${right} / 8 correct. Check the corrections in red and try again.`,
  pluralEmpty: "Write your answer ✍️",
  pluralArticle: (answer: string) => `Almost! Add the article → ${answer}`,
  pluralFix: (answer: string) => `✔ ${answer}`,
  mcqPerfect: "🎉 ¡Fantástico! 8 / 8 — you know your articles!",
  mcqSome: (right: number) => `You got ${right} / 8. Read the explanations and click “Try again”.`,
  mcqRunning: (right: number, left: number) => `${right} correct · ${left} to go`,
  bagEmpty: "Write something here ✍️",
  bagStructure: "Start with un, una, unos or unas + a noun.",
  bagPlural: (article: string) => `${article} is plural — the noun should end in -s.`,
  bagOk: "✔ Great structure!",
  bagAll: "🎉 ¡Genial! Now compare your gender choices with the model answer or ask your teacher.",
  bagSome: (good: number) => `${good} / 4 look good. Check the messages under each box.`,
  progressDone: "¡Excelente! You have mastered Spanish nouns and articles 🎉",
} as const;

export const SECTIONS = [
  { id: "what", emoji: "📖", label: "What is a noun?" },
  { id: "gender", emoji: "⚖️", label: "Gender" },
  { id: "number", emoji: "➕", label: "Plural" },
  { id: "articles", emoji: "🔤", label: "Articles" },
  { id: "practice", emoji: "🎯", label: "Practice" },
] as const;

export const CATEGORIES = [
  { emoji: "👩‍🏫", label: "Person", es: "Persona", word: "la profesora", en: "the teacher" },
  { emoji: "🐶", label: "Animal", es: "Animal", word: "el perro", en: "the dog" },
  { emoji: "🏖️", label: "Place", es: "Lugar", word: "la playa", en: "the beach" },
  { emoji: "📚", label: "Thing", es: "Cosa", word: "el libro", en: "the book" },
  { emoji: "❤️", label: "Idea", es: "Idea", word: "el amor", en: "love" },
] as const;

type Ending = { ending: string; words: readonly { emoji: string; word: string }[] };

export const MASCULINE_ENDINGS: readonly Ending[] = [
  { ending: "-o", words: [{ emoji: "📖", word: "el libro" }, { emoji: "🐱", word: "el gato" }] },
  { ending: "-or", words: [{ emoji: "🎨", word: "el color" }, { emoji: "💻", word: "el ordenador" }] },
  { ending: "-aje", words: [{ emoji: "✈️", word: "el viaje" }, { emoji: "🚗", word: "el garaje" }] },
  { ending: "-ma", words: [{ emoji: "🤯", word: "el problema" }, { emoji: "🗣️", word: "el idioma" }] },
];

export const FEMININE_ENDINGS: readonly Ending[] = [
  { ending: "-a", words: [{ emoji: "🏠", word: "la casa" }, { emoji: "🪑", word: "la mesa" }] },
  { ending: "-ción / -sión", words: [{ emoji: "🎵", word: "la canción" }, { emoji: "📺", word: "la televisión" }] },
  { ending: "-dad / -tad", words: [{ emoji: "🏙️", word: "la ciudad" }, { emoji: "🤝", word: "la amistad" }] },
  { ending: "-tud / -umbre", words: [{ emoji: "😎", word: "la actitud" }, { emoji: "🧉", word: "la costumbre" }] },
];

export const NO_RULE = [
  { emoji: "☕", word: "el café", gender: "m" },
  { emoji: "🌙", word: "la noche", gender: "f" },
  { emoji: "🌳", word: "el árbol", gender: "m" },
  { emoji: "🌸", word: "la flor", gender: "f" },
  { emoji: "🌊", word: "el mar", gender: "m" },
  { emoji: "🥛", word: "la leche", gender: "f" },
] as const;

/** `note`: "ends in -a" o "short for <es>la fotografía</es>". */
export const EXCEPTIONS = [
  { emoji: "☀️", word: "el día", gender: "m", note: { en: "ends in -a" } },
  { emoji: "🗺️", word: "el mapa", gender: "m", note: { en: "ends in -a" } },
  { emoji: "🪐", word: "el planeta", gender: "m", note: { en: "ends in -a" } },
  { emoji: "✋", word: "la mano", gender: "f", note: { en: "ends in -o" } },
  { emoji: "📷", word: "la foto", gender: "f", note: { en: "short for ", es: "la fotografía" } },
  { emoji: "🏍️", word: "la moto", gender: "f", note: { en: "short for ", es: "la motocicleta" } },
] as const;

export const PAIRS = [
  [{ emoji: "👦", word: "el chico" }, { emoji: "👧", word: "la chica" }],
  [{ emoji: "👨‍🏫", word: "el profesor" }, { emoji: "👩‍🏫", word: "la profesora" }],
  [{ emoji: "🐈‍⬛", word: "el gato" }, { emoji: "🐈", word: "la gata" }],
  [{ emoji: "🧑‍🎓", word: "el estudiante" }, { emoji: "👩‍🎓", word: "la estudiante" }],
  [{ emoji: "🧳", word: "el turista" }, { emoji: "📸", word: "la turista" }],
  [{ emoji: "🎭", word: "el actor" }, { emoji: "🎬", word: "la actriz" }],
] as const;

/** Reglas del plural. `stem` + `end` (la terminación resaltada). */
export const PLURAL_RULES: readonly {
  title: { lead: string; rule: string };
  examples: readonly { emoji: string; singular: string; stem: string; end: string }[];
}[] = [
  {
    title: { lead: "Ends in a vowel → ", rule: "add -s" },
    examples: [
      { emoji: "📖", singular: "el libro", stem: "los libro", end: "s" },
      { emoji: "🏠", singular: "la casa", stem: "las casa", end: "s" },
    ],
  },
  {
    title: { lead: "Ends in a consonant → ", rule: "add -es" },
    examples: [
      { emoji: "🌸", singular: "la flor", stem: "las flor", end: "es" },
      { emoji: "🎨", singular: "el color", stem: "los color", end: "es" },
    ],
  },
  {
    title: { lead: "Ends in -z → ", rule: "change to -ces" },
    examples: [
      { emoji: "✏️", singular: "el lápiz", stem: "los lápi", end: "ces" },
      { emoji: "💡", singular: "la luz", stem: "las lu", end: "ces" },
    ],
  },
  {
    title: { lead: "The accent mark can ", rule: "disappear or appear" },
    examples: [
      { emoji: "🎵", singular: "la canción", stem: "las cancion", end: "es" },
      { emoji: "🧑", singular: "el joven", stem: "los jóven", end: "es" },
    ],
  },
  {
    title: { lead: "Ends in unstressed -s → ", rule: "no change" },
    examples: [
      { emoji: "📅", singular: "el lunes", stem: "los lunes", end: "" },
      { emoji: "📉", singular: "la crisis", stem: "las crisis", end: "" },
    ],
  },
];

export const ARTICLE_TABLES = [
  {
    title: "Definite articles",
    meaning: "= “the” · a specific thing we both know",
    rows: [
      { label: "Singular", m: { article: "el", example: "el perro", emoji: "🐶" }, f: { article: "la", example: "la casa", emoji: "🏠" } },
      { label: "Plural", m: { article: "los", example: "los perros", emoji: "🐶🐶" }, f: { article: "las", example: "las casas", emoji: "🏠🏠" } },
    ],
  },
  {
    title: "Indefinite articles",
    meaning: "= “a / an / some” · any one, not specific",
    rows: [
      { label: "Singular", m: { article: "un", example: "un libro", emoji: "📖" }, f: { article: "una", example: "una manzana", emoji: "🍎" } },
      { label: "Plural", m: { article: "unos", example: "unos libros", emoji: "📚" }, f: { article: "unas", example: "unas manzanas", emoji: "🍎🍎" } },
    ],
  },
] as const;

export const SORT_WORDS: readonly { word: string; gender: Gender; emoji: string }[] = [
  { word: "libro", gender: "m", emoji: "📖" },
  { word: "casa", gender: "f", emoji: "🏠" },
  { word: "problema", gender: "m", emoji: "🤯" },
  { word: "mano", gender: "f", emoji: "✋" },
  { word: "canción", gender: "f", emoji: "🎵" },
  { word: "día", gender: "m", emoji: "☀️" },
  { word: "ciudad", gender: "f", emoji: "🏙️" },
  { word: "viaje", gender: "m", emoji: "✈️" },
  { word: "foto", gender: "f", emoji: "📷" },
  { word: "color", gender: "m", emoji: "🎨" },
];

export const PLURALS: readonly { singular: string; answer: string; emoji: string }[] = [
  { singular: "el libro", answer: "los libros", emoji: "📖" },
  { singular: "la flor", answer: "las flores", emoji: "🌸" },
  { singular: "el lápiz", answer: "los lápices", emoji: "✏️" },
  { singular: "la canción", answer: "las canciones", emoji: "🎵" },
  { singular: "el lunes", answer: "los lunes", emoji: "📅" },
  { singular: "la ciudad", answer: "las ciudades", emoji: "🏙️" },
  { singular: "el profesor", answer: "los profesores", emoji: "👨‍🏫" },
  { singular: "la luz", answer: "las luces", emoji: "💡" },
];

export const MCQ: readonly { sentence: string; hint: string; options: readonly string[]; answer: number; explanation: string }[] = [
  { sentence: "___ perro es muy simpático.", hint: "(the) dog 🐶", options: ["El", "La", "Los"], answer: 0, explanation: "Perro is masculine singular → el." },
  { sentence: "Tengo ___ gato en casa.", hint: "(a) cat 🐱", options: ["un", "una", "unos"], answer: 0, explanation: "Gato is masculine singular, and “a” = un." },
  { sentence: "___ casas de la playa son bonitas.", hint: "(the) houses 🏠", options: ["Los", "Las", "La"], answer: 1, explanation: "Casas is feminine plural → las." },
  { sentence: "Quiero ___ manzanas, por favor.", hint: "(some) apples 🍎", options: ["unos", "unas", "una"], answer: 1, explanation: "Manzanas is feminine plural, and “some” = unas." },
  {
    sentence: "___ agua está muy fría.",
    hint: "(the) water 💧",
    options: ["El", "La", "Las"],
    answer: 0,
    explanation: "Agua is feminine, but it starts with a stressed a-, so it takes el in the singular.",
  },
  {
    sentence: "Hay ___ problema con el ordenador.",
    hint: "(a) problem 🤯",
    options: ["una", "un", "unos"],
    answer: 1,
    explanation: "Problema ends in -a but comes from Greek -ma, so it is masculine → un.",
  },
  { sentence: "___ libros están en la mesa.", hint: "(the) books 📚", options: ["Los", "Las", "El"], answer: 0, explanation: "Libros is masculine plural → los." },
  {
    sentence: "Mi hermana tiene ___ moto roja.",
    hint: "(a) motorbike 🏍️",
    options: ["un", "una", "unas"],
    answer: 1,
    explanation: "Moto is short for la motocicleta, so it is feminine → una.",
  },
];

export const BAG_PLACEHOLDERS = ["e.g. un móvil 📱", "e.g. unas llaves 🔑", "…", "…"] as const;

export const BAG_MODEL = [
  { emoji: "📱", word: "un móvil" },
  { emoji: "👛", word: "una cartera" },
  { emoji: "🖊️", word: "unos bolígrafos" },
  { emoji: "🔑", word: "unas llaves" },
  { emoji: "🕶️", word: "unas gafas de sol" },
  { emoji: "💧", word: "una botella de agua" },
] as const;

export const TIPS: readonly { term: string; text: string }[] = [
  { term: "Learn the article with the noun:", text: "don’t learn “casa”, learn “la casa”. It saves you guessing later." },
  { term: "-o is usually masculine, -a usually feminine:", text: "but remember the famous exceptions: el día, el mapa, la mano, la foto." },
  { term: "Easy points:", text: "words ending in -ción, -sión, -dad and -tud are feminine — always." },
  { term: "Greek words in -ma are masculine:", text: "el problema, el tema, el idioma, el programa." },
  { term: "Articles copy the noun:", text: "masculine or feminine, singular or plural — they always match." },
  { term: "Use colours in your notebook:", text: "one colour for masculine words and another for feminine words. Your memory will thank you!" },
  { term: "Read the article, not the ending:", text: "when you see “el” or “la” in a text, notice the noun’s gender and say it out loud." },
];

export const SPANISH_SUMMARY = {
  title: "Resumen en español",
  text: "Los sustantivos nombran personas, animales, lugares, cosas e ideas. En español todos los sustantivos tienen género (masculino o femenino) y número (singular o plural). Normalmente las palabras en -o son masculinas y las palabras en -a son femeninas, pero hay excepciones como el día o la mano. Para formar el plural añadimos -s después de vocal y -es después de consonante. Los artículos (el, la, los, las / un, una, unos, unas) siempre concuerdan con el sustantivo.",
} as const;
