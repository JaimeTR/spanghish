/**
 * "The Spanish Alphabet", copiada de la lección publicada en spanglish.com.au
 * (datos del script de la página: letras, palabra de ejemplo, letras únicas,
 * reglas especiales y consejos). Las imágenes y grabaciones de esa página no
 * existían (404): se mostraba el emoji y se leía con la voz del navegador, igual que aquí.
 * Texto en inglés tal como se publicó, con erratas evidentes corregidas.
 */
export type AlphabetLetter = {
  letter: string;
  /** Nombre de la letra en español. */
  name: string;
  ipa: string;
  emoji: string;
  /** Palabra de ejemplo por sílabas (se colorean alternas). */
  syllables: readonly string[];
  english: string;
};

export const ALPHABET: readonly AlphabetLetter[] = [
  { letter: "A", name: "a", ipa: "[a]", emoji: "🧑‍🤝‍🧑", syllables: ["a", "mi", "go"], english: "friend" },
  { letter: "B", name: "be", ipa: "[b]", emoji: "💋", syllables: ["be", "so"], english: "kiss" },
  { letter: "C", name: "ce", ipa: "[θ] o [s]", emoji: "🛣️", syllables: ["ca", "lle"], english: "street" },
  { letter: "D", name: "de", ipa: "[d]", emoji: "📅", syllables: ["dí", "a"], english: "day" },
  { letter: "E", name: "e", ipa: "[e]", emoji: "🇪🇸", syllables: ["es", "pa", "ñol"], english: "Spanish" },
  { letter: "F", name: "efe", ipa: "[f]", emoji: "🌸", syllables: ["flor"], english: "flower" },
  { letter: "G", name: "ge", ipa: "[g] o [x]", emoji: "🐱", syllables: ["ga", "to"], english: "cat" },
  { letter: "H", name: "hache", ipa: "(mudo)", emoji: "👋", syllables: ["ho", "la"], english: "hello" },
  { letter: "I", name: "i", ipa: "[i]", emoji: "🏝️", syllables: ["is", "la"], english: "island" },
  { letter: "J", name: "jota", ipa: "[x]", emoji: "🧑", syllables: ["jo", "ven"], english: "young" },
  { letter: "K", name: "ka", ipa: "[k]", emoji: "⚖️", syllables: ["ki", "lo"], english: "kilo" },
  { letter: "L", name: "ele", ipa: "[l]", emoji: "📖", syllables: ["li", "bro"], english: "book" },
  { letter: "M", name: "eme", ipa: "[m]", emoji: "✋", syllables: ["ma", "no"], english: "hand" },
  { letter: "N", name: "ene", ipa: "[n]", emoji: "🌙", syllables: ["no", "che"], english: "night" },
  { letter: "Ñ", name: "eñe", ipa: "[ɲ]", emoji: "🧒", syllables: ["ni", "ño"], english: "child" },
  { letter: "O", name: "o", ipa: "[o]", emoji: "🐻", syllables: ["o", "so"], english: "bear" },
  { letter: "P", name: "pe", ipa: "[p]", emoji: "🍞", syllables: ["pan"], english: "bread" },
  { letter: "Q", name: "cu", ipa: "[k]", emoji: "🧀", syllables: ["que", "so"], english: "cheese" },
  { letter: "R", name: "erre", ipa: "[ɾ]", emoji: "🔴", syllables: ["ro", "jo"], english: "red" },
  { letter: "S", name: "ese", ipa: "[s]", emoji: "☀️", syllables: ["sol"], english: "sun" },
  { letter: "T", name: "te", ipa: "[t]", emoji: "🌍", syllables: ["tie", "rra"], english: "earth" },
  { letter: "U", name: "u", ipa: "[u]", emoji: "1️⃣", syllables: ["u", "no"], english: "one" },
  { letter: "V", name: "ve", ipa: "[b]", emoji: "🍷", syllables: ["vi", "no"], english: "wine" },
  { letter: "W", name: "doble ve", ipa: "[w]", emoji: "🤽", syllables: ["wa", "ter", "po", "lo"], english: "water polo" },
  { letter: "X", name: "equis", ipa: "[ks]", emoji: "🏆", syllables: ["é", "xi", "to"], english: "success" },
  { letter: "Y", name: "i griega", ipa: "[j]", emoji: "🙋", syllables: ["yo"], english: "I" },
  { letter: "Z", name: "zeta", ipa: "[θ] o [s]", emoji: "👟", syllables: ["za", "pa", "to"], english: "shoe" },
];

export const VOWELS = ["A", "E", "I", "O", "U"] as const;

export const CONSONANTS = ALPHABET.filter((l) => !(VOWELS as readonly string[]).includes(l.letter)).map((l) => l.letter);

export const UNIQUE_LETTERS = [
  { display: "Ñ", name: "eñe" },
  { display: "LL", name: "elle" },
  { display: "RR", name: "erre doble" },
] as const;

export const GROUPS = {
  vowels: { emoji: "🎵", title: "Vowels", text: "The 5 Spanish vowels are pure and stable. Each one always makes the same clear sound." },
  consonants: { emoji: "🔤", title: "Consonants", text: "Spanish has 22 consonants. Some of them, like Ñ and RR, have very special sounds." },
  unique: {
    emoji: "🌟",
    title: "Unique Letters",
    text: "These letters and letter combinations don’t exist in English and need a bit of extra practice. Tap the speaker to listen to each one.",
  },
} as const;

/**
 * Reglas especiales. `example` separa lo que está en español (es) del resto
 * para marcar el idioma.
 */
export const SPECIAL_RULES: readonly {
  letter: string;
  title: string;
  rule: string;
  example: readonly { es?: string; en?: string }[];
}[] = [
  {
    letter: "LL",
    title: "LL (doble L)",
    rule: "Sounds like the English “y”: the “y” and “ll” have the same pronunciation. The sound is closer to the English “j”.",
    example: [{ es: "llama" }, { en: " → sounds like “" }, { es: "yama" }, { en: "” (flame)" }],
  },
  {
    letter: "RR",
    title: "RR (double R)",
    rule: "A multiple vibrating sound, very different from the single R. It takes some muscle practice to get right.",
    example: [{ es: "perro" }, { en: " → “" }, { es: "peRRo" }, { en: "” (dog)" }],
  },
  {
    letter: "J",
    title: "J (jota)",
    rule: "The Spanish J has a strong, throaty sound. To an English speaker’s ear, it’s quite close to the English “H”, as in “hello”.",
    example: [{ es: "jugo" }, { en: " → sounds close to “hoo-go” (juice)" }],
  },
  {
    letter: "Z",
    title: "Z (zeta)",
    rule: "In Spain it sounds like the “th” in “think”. In Latin America it sounds like “s”.",
    example: [{ en: "Spain: " }, { es: "zapato" }, { en: " [θapato] | Latin America: " }, { es: "zapato" }, { en: " [sapato]" }],
  },
  {
    letter: "C",
    title: "C (ce) – before E/I",
    rule: "Before E and I, the C is pronounced like the “th” in Spain, or like “s” in Latin America.",
    example: [{ es: "cena" }, { en: " → [θena] or [sena] (dinner)" }],
  },
  {
    letter: "G",
    title: "G (ge) – two sounds",
    rule: "Before A, O, U it sounds like a hard “g”. Before E, I it sounds like a throaty “h/x” sound.",
    example: [{ es: "gato" }, { en: " [g] vs. " }, { es: "gente" }, { en: " [x] (cat vs. people)" }],
  },
  {
    letter: "H",
    title: "H (hache)",
    rule: "The H is always silent in Spanish — it has no sound at all.",
    example: [{ es: "hola" }, { en: " = " }, { es: "ola" }, { en: " (hello = wave) – they sound the same!" }],
  },
];

export const TIPS_TITLE = "Tips to Master Spanish Pronunciation";

export const TIPS: readonly { term: string; text: string }[] = [
  { term: "Listen actively:", text: "Listen to how native speakers say each word." },
  { term: "Practise LL and Y:", text: "They both have the same sound, close to the English “J”." },
  { term: "Master the rolled RR:", text: "it’s a multiple vibrating sound and takes muscle practice to get right." },
  { term: "Spanish vowels are pure:", text: "each of the 5 vowels always has its own sound; they don’t glide into another sound like English vowels do." },
  {
    term: "Letter names end differently:",
    text: "in English, most letter names end in an “ee” sound (B → “bee”, D → “dee”). In Spanish, letter names almost always end in an “e” sound instead (B → “be”, D → “de”, T → “te”).",
  },
  { term: "The letter F is a good example:", text: "in English it starts with an “ef” sound. In Spanish, that same sound comes at the end of the letter’s name: “efe”." },
  { term: "Z and C before E/I:", text: "in Spain these sound like the “th” in “think”; in Latin America they sound like “s”." },
  { term: "Record yourself:", text: "compare your pronunciation to a native speaker’s and improve little by little." },
];

export const SPANISH_SUMMARY = {
  title: "Resumen en español",
  text: "Escucha a hablantes nativos, practica la LL/Y y la RR vibrante, y recuerda que las vocales españolas suenan siempre igual. En inglés los nombres de las letras suelen terminar en un sonido “i” (bee, dee), pero en español terminan en “e” (be, de, te); por eso la F en inglés empieza con “ef” y en español termina igual: “efe”. La Z y la C antes de E/I suenan como “z” en España y como “s” en Latinoamérica.",
} as const;
