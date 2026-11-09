import { describe, expect, it } from "vitest";
import { parseYouTubeId } from "./youtube";

const ID = "dQw4w9WgXcQ";

describe("parseYouTubeId", () => {
  it("parseYouTubeId accepts a bare id and the four URL shapes", () => {
    expect(parseYouTubeId(ID)).toBe(ID);
    expect(parseYouTubeId(`  ${ID}  `)).toBe(ID);
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(parseYouTubeId(`https://youtube.com/watch?v=${ID}&t=42s`)).toBe(ID);
    expect(parseYouTubeId(`https://m.youtube.com/watch?feature=share&v=${ID}`)).toBe(ID);
    expect(parseYouTubeId(`https://youtu.be/${ID}`)).toBe(ID);
    expect(parseYouTubeId(`https://youtu.be/${ID}?si=abc`)).toBe(ID);
    expect(parseYouTubeId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(parseYouTubeId(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
    expect(parseYouTubeId(`https://www.youtube-nocookie.com/embed/${ID}`)).toBe(ID);
  });

  it("parseYouTubeId rejects http, other hosts and 10-char ids", () => {
    expect(parseYouTubeId(`http://www.youtube.com/watch?v=${ID}`)).toBeNull();
    expect(parseYouTubeId(`https://vimeo.com/${ID}`)).toBeNull();
    expect(parseYouTubeId(`https://youtube.com.evil.example/watch?v=${ID}`)).toBeNull();
    expect(parseYouTubeId(`https://evil.example/?u=https://youtu.be/${ID}`)).toBeNull();
    expect(parseYouTubeId("dQw4w9WgXc")).toBeNull();
    expect(parseYouTubeId(`https://youtu.be/dQw4w9WgXc`)).toBeNull();
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${ID}x`)).toBeNull();
    expect(parseYouTubeId("not a url")).toBeNull();
    expect(parseYouTubeId("")).toBeNull();
  });
});
