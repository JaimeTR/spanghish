import type { LessonBlock } from "@spanglish/content";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleBlocks } from "./ArticleBlocks";

const labels = { play: "Reproducir", videoTitle: "Video", quiz: { check: "Comprobar", choose: "Elige", correct: "Correcto", incorrect: "No" } };
const render = (blocks: LessonBlock[], locale: "es" | "en" = "es") =>
  renderToStaticMarkup(<ArticleBlocks blocks={blocks} locale={locale} labels={labels} mediaUrl={(path) => `https://media.test/${path}`} />);

describe("ArticleBlocks", () => {
  it("renders what the admin wrote as text, never as HTML", () => {
    const html = render([
      { id: "t", position: 0, kind: "text", bodyEs: "Hola <img src=x onerror=alert(1)> **<script>alert(2)</script>**", bodyEn: "Hi" },
      {
        id: "q",
        position: 1,
        kind: "quiz",
        bodyEs: "<b>¿Cuál?</b>",
        bodyEn: "Which?",
        optionsEs: ["<i>uno</i>", "dos"],
        optionsEn: ["one", "two"],
        correctOption: 1,
        explanationEs: null,
        explanationEn: null,
      },
    ]);
    expect(html).not.toMatch(/<img|<script|<b>|<i>/);
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("<strong>&lt;script&gt;alert(2)&lt;/script&gt;</strong>");
    expect(html).toContain("&lt;b&gt;¿Cuál?&lt;/b&gt;");
  });

  it("renders paragraphs, lists and bold in the page language", () => {
    const html = render([{ id: "t", position: 0, kind: "text", bodyEs: "Uno", bodyEn: "A **bold** word\n\n- first\n- second" }], "en");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<li>first</li>");
    expect(html).not.toContain("Uno");
  });

  it("renders an image with its alt text and real dimensions", () => {
    const html = render([
      { id: "i", position: 0, kind: "image", imagePath: "lessons/a.webp", imageWidth: 800, imageHeight: 600, altEs: "Un gato", altEn: "A cat" },
    ]);
    expect(html).toContain('alt="Un gato"');
    expect(html).toContain("https://media.test/lessons/a.webp");
    expect(html).toContain('width="800"');
  });

  it("a video that is not stored locally shows no thumbnail before playing", () => {
    const html = render([{ id: "v", position: 0, kind: "video", youtubeId: "abcdefghijk" }]);
    expect(html).not.toMatch(/<img|ytimg|<iframe/);
    expect(html).toContain("Reproducir");
  });
});
