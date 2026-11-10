import { describe, expect, it, vi } from "vitest";
import {
  buildLearnCategories,
  getLearnCategories,
  getPublicArticleSlugs,
  getPublicLesson,
  getPublicResourceCards,
  lessonToItem,
  loadPublicLesson,
  mergeResourceCards,
  resourceToCard,
} from "./content-source";
import { LEARN_CATEGORIES, isReady } from "./learn/catalog";
import { FALLBACK_RESOURCE_CARDS, cardsFor } from "./resources";
import { sitemapEntries } from "./seo";

const ENV = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "a.b.c" };
const ID = "11111111-1111-4111-8111-111111111111";
const ok = (data: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status: 200 })) as unknown as typeof fetch;
const down = () => vi.fn().mockResolvedValue(new Response("boom", { status: 500 })) as unknown as typeof fetch;

const resource = (over: Record<string, unknown> = {}) => ({
  id: ID,
  kind: "worksheet",
  accessLevel: "public",
  locked: false,
  titleEs: "Ficha de colores",
  titleEn: "Colours worksheet",
  titleLang: null,
  descriptionEs: "PDF para imprimir",
  descriptionEn: null,
  levelCode: null,
  audience: null,
  sortOrder: 1,
  thumbnailPath: null,
  youtubeId: null,
  externalUrl: null,
  hasFile: true,
  ...over,
});

/** Fila tal como la devuelve el RPC (snake_case). */
const lessonRow = (over: Record<string, unknown> = {}) => ({
  id: ID,
  slug: "los-colores",
  kind: "article",
  component_key: null,
  category: "foundations",
  level_code: null,
  access_level: "public",
  locked: false,
  title_es: "Los colores",
  title_en: "Colours",
  summary_es: null,
  summary_en: null,
  sort_order: 1,
  ...over,
});
const lesson = (over: Record<string, unknown> = {}) =>
  ({
    id: ID,
    slug: "los-colores",
    kind: "article",
    componentKey: null,
    category: "foundations",
    levelCode: null,
    accessLevel: "public",
    locked: false,
    titleEs: "Los colores",
    titleEn: "Colours",
    summaryEs: null,
    summaryEn: null,
    sortOrder: 1,
    ...over,
  }) as never;

describe("resourceToCard", () => {
  it("a public file downloads through the web's own signed route", () => {
    const card = resourceToCard(resource() as never);
    expect(card).toMatchObject({
      key: `db-${ID}`,
      access: "public",
      state: "open",
      kind: "worksheets",
      dbKind: "worksheet",
      href: `/api/resource-file/${ID}`,
      title: { es: "Ficha de colores", en: "Colours worksheet" },
      meta: { es: "PDF para imprimir", en: "PDF para imprimir" },
    });
    expect(card?.external).toBeUndefined();
  });

  it("a locked resource never carries an origin, even if the row had one", () => {
    const card = resourceToCard(
      resource({ accessLevel: "enrolled", locked: true, youtubeId: "GilfeIjZm_g", externalUrl: "https://example.com/x", hasFile: true }) as never,
    );
    expect(card).toMatchObject({ state: "locked", access: "enrolled" });
    expect(card?.href).toBeUndefined();
    expect(card?.videoId).toBeUndefined();
    expect(JSON.stringify(card)).not.toMatch(/example\.com|GilfeIjZm_g|resource-file/);
  });

  it("a home video plays in the page; another YouTube video opens outside", () => {
    expect(resourceToCard(resource({ kind: "video", youtubeId: "GilfeIjZm_g", hasFile: false }) as never)).toMatchObject({
      videoId: "GilfeIjZm_g",
      target: "videos",
    });
    const other = resourceToCard(resource({ kind: "video", youtubeId: "abcdefghijk", hasFile: false }) as never);
    expect(other).toMatchObject({ external: true });
    expect(other?.href).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=abcdefghijk$/);
  });

  it("only https external links are kept", () => {
    expect(resourceToCard(resource({ kind: "link", externalUrl: "https://example.com/a", hasFile: false }) as never)).toMatchObject({
      href: "https://example.com/a",
      external: true,
    });
    for (const externalUrl of ["javascript:alert(1)", "http://example.com/a", "nope"]) {
      expect(resourceToCard(resource({ kind: "link", externalUrl, hasFile: false }) as never)).toBeNull();
    }
  });

  it("drops rows without a title or without an origin", () => {
    expect(resourceToCard(resource({ titleEs: " ", titleEn: "" }) as never)).toBeNull();
    expect(resourceToCard(resource({ hasFile: false }) as never)).toBeNull();
    expect(resourceToCard(resource({ id: "not-a-uuid" }) as never)).toBeNull();
  });
});

describe("mergeResourceCards", () => {
  it("a tier with nothing published keeps its fallback cards", () => {
    const cards = mergeResourceCards([resource() as never]);
    expect(cardsFor("public", cards).map((c) => c.key)).toEqual([`db-${ID}`]);
    expect(cardsFor("account", cards)).toEqual(cardsFor("account"));
    expect(cardsFor("enrolled", cards)).toEqual(cardsFor("enrolled"));
  });

  it("orders by sortOrder", () => {
    const other = "22222222-2222-4222-8222-222222222222";
    const cards = mergeResourceCards([resource({ sortOrder: 5 }) as never, resource({ id: other, sortOrder: 2 }) as never]);
    expect(cardsFor("public", cards).map((c) => c.key)).toEqual([`db-${other}`, `db-${ID}`]);
  });
});

describe("getPublicResourceCards", () => {
  const row = {
    id: ID,
    kind: "worksheet",
    access_level: "public",
    locked: false,
    title_es: "Ficha",
    title_en: "Sheet",
    title_lang: null,
    description_es: null,
    description_en: null,
    level_code: null,
    audience: null,
    sort_order: 1,
    thumbnail_path: null,
    youtube_id: null,
    external_url: null,
    has_file: true,
  };

  it("uses the platform when it answers with something to show", async () => {
    const result = await getPublicResourceCards(ENV, ok([row]));
    expect(result.source).toBe("db");
    expect(result.cards[0]).toMatchObject({ key: `db-${ID}`, href: `/api/resource-file/${ID}` });
  });

  it("falls back when not configured, failing, empty or malformed", async () => {
    for (const [env, fetchImpl] of [
      [{}, ok([row])],
      [ENV, down()],
      [ENV, ok([])],
      [ENV, ok([{ nope: true }])],
      [ENV, ok({ not: "an array" })],
    ] as const) {
      expect(await getPublicResourceCards(env, fetchImpl)).toEqual({ source: "fallback", cards: [...FALLBACK_RESOURCE_CARDS] });
    }
  });
});

describe("lessons", () => {
  it("maps an article, an interactive lesson and a locked one", () => {
    expect(lessonToItem(lesson())).toMatchObject({ key: `db-${ID}`, slug: "los-colores", title: { es: "Los colores", en: "Colours" } });
    const interactive = lessonToItem(lesson({ kind: "interactive", componentKey: "alphabet" }));
    expect(interactive).toMatchObject({ lesson: "learnAlphabet" });
    expect(interactive?.slug).toBeUndefined();
    const locked = lessonToItem(lesson({ locked: true, accessLevel: "account" }));
    expect(locked).toMatchObject({ slug: "los-colores", locked: true });
    expect(isReady(locked!)).toBe(false);
    expect(lessonToItem(lesson({ slug: "../x" }))).toBeNull();
    expect(lessonToItem(lesson({ kind: "interactive", componentKey: null }))).toBeNull();
  });

  it("level categories keep the six levels; untouched categories keep the fallback", () => {
    const categories = buildLearnCategories([
      lesson({ category: "kids", levelCode: "A2", slug: "animales", titleEs: "Animales", titleEn: "Animals" }),
      lesson({ id: "b", sortOrder: 0 }),
    ]);
    const kids = categories.find((c) => c.key === "kids")!;
    expect(kids.items.map((i) => i.level)).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
    expect(kids.items.filter(isReady).map((i) => i.slug)).toEqual(["animales"]);
    expect(categories.find((c) => c.key === "foundations")!.items.map((i) => i.slug)).toEqual(["los-colores"]);
    expect(categories.find((c) => c.key === "stories")!.items).toEqual(LEARN_CATEGORIES.find((c) => c.key === "stories")!.items);
  });

  it("getLearnCategories reads the platform or falls back", async () => {
    const live = await getLearnCategories(ENV, ok([lessonRow()]));
    expect(live.source).toBe("db");
    expect(live.categories[0]!.items[0]).toMatchObject({ slug: "los-colores" });
    for (const fetchImpl of [down(), ok([])]) {
      const result = await getLearnCategories(ENV, fetchImpl);
      expect(result.source).toBe("fallback");
      expect(result.categories).toEqual(LEARN_CATEGORIES);
    }
  });

  it("getPublicLesson returns only an existing public article", async () => {
    const detail = { lesson: lessonRow(), blocks: [{ id: "b1", position: 0, kind: "text", body_es: "Hola", body_en: "Hi" }] };
    const fetchImpl = ok(detail);
    const found = await getPublicLesson("los-colores", ENV, fetchImpl);
    expect(found?.blocks).toHaveLength(1);
    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(JSON.parse(init.body)).toEqual({ p_slug: "los-colores" });

    expect(await getPublicLesson("los-colores", ENV, ok(null))).toBeNull();
    expect(await getPublicLesson("los-colores", ENV, down())).toBeNull();
    const interactive = { ...detail, lesson: lessonRow({ kind: "interactive", component_key: "alphabet" }) };
    expect(await getPublicLesson("los-colores", ENV, ok(interactive))).toBeNull();
    expect(await getPublicLesson("otra", ENV, ok(detail))).toBeNull();

    // "No existe" y "la plataforma no responde" son cosas distintas (lo segundo no se cachea como 404).
    expect(await loadPublicLesson("los-colores", ENV, ok(detail))).toMatchObject({ status: "ok" });
    expect(await loadPublicLesson("los-colores", ENV, ok(null))).toEqual({ status: "not_found" });
    expect(await loadPublicLesson("los-colores", {}, ok(detail))).toEqual({ status: "not_found" });
    expect(await loadPublicLesson("los-colores", ENV, down())).toEqual({ status: "unavailable" });

    const untouched = vi.fn();
    expect(await getPublicLesson("../secreto", ENV, untouched as unknown as typeof fetch)).toBeNull();
    expect(await getPublicLesson("Con Mayúsculas", ENV, untouched as unknown as typeof fetch)).toBeNull();
    expect(untouched).not.toHaveBeenCalled();
  });

  it("the sitemap lists open articles and keeps its static entries when the platform is down", async () => {
    const slugs = await getPublicArticleSlugs(
      ENV,
      ok([
        lessonRow(),
        lessonRow({ id: "2", slug: "privada", locked: true }),
        lessonRow({ id: "3", slug: "alfabeto", kind: "interactive", component_key: "alphabet" }),
      ]),
    );
    expect(slugs).toEqual(["los-colores"]);

    const base = sitemapEntries("https://example.test");
    const withLessons = sitemapEntries("https://example.test", undefined, undefined, slugs);
    expect(withLessons).toHaveLength(base.length + 2);
    const entry = withLessons.find((e) => e.url === "https://example.test/en/learn/los-colores");
    expect(entry?.alternates?.languages).toMatchObject({
      es: "https://example.test/es/learn/los-colores",
      en: "https://example.test/en/learn/los-colores",
    });

    expect(await getPublicArticleSlugs(ENV, down())).toEqual([]);
    expect(await getPublicArticleSlugs({}, ok([lessonRow()]))).toEqual([]);
    expect(sitemapEntries("https://example.test", undefined, undefined, [])).toEqual(base);
  });
});
