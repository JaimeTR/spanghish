export type InlinePart = { text: string; bold: boolean };
export type TextNode = { type: "p"; parts: InlinePart[] } | { type: "ul"; items: InlinePart[][] };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /\*\*([^\s*\n](?:[^\n]*?[^\s*\n])?)\*\*/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index;
    const full = match[0];
    const content = match[1];
    if (index === undefined || content === undefined) continue;
    if (index > cursor) parts.push({ text: text.slice(cursor, index), bold: false });
    parts.push({ text: content, bold: true });
    cursor = index + full.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), bold: false });
  if (parts.length === 0 && text.length > 0) parts.push({ text, bold: false });
  return parts;
}

export function parseTextBlock(text: string): TextNode[] {
  const normalized = text.replace(/\r\n/g, "\n");
  if (normalized.length === 0) return [];
  const blocks = normalized.split(/\n(?:[\t ]*\n)+/);
  const nodes: TextNode[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    let paragraph: string[] = [];
    let items: InlinePart[][] = [];
    const flushParagraph = (): void => {
      if (paragraph.length > 0) {
        const value = paragraph.join("\n").trim();
        if (value.length > 0) nodes.push({ type: "p", parts: parseInline(value) });
        paragraph = [];
      }
    };
    const flushItems = (): void => {
      if (items.length > 0) {
        nodes.push({ type: "ul", items });
        items = [];
      }
    };
    for (const line of lines) {
      if (line.startsWith("- ")) {
        flushParagraph();
        items.push(parseInline(line.slice(2)));
      } else {
        flushItems();
        paragraph.push(line);
      }
    }
    flushItems();
    flushParagraph();
  }
  return nodes;
}
