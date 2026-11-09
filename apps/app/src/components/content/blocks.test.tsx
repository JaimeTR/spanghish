// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { TextBlock } from "./TextBlock";
import { QuizBlock } from "./QuizBlock";
import { YouTubeFacade } from "./YouTubeFacade";
import { LessonBlocks } from "./LessonBlocks";
const wrap = (ui: ReactNode) => render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>);
describe("lesson blocks", () => {
  it("TextBlock renders '<script>' as text and **bold** as strong", () => { wrap(<TextBlock body={'<script>alert(1)</script>\n\n**bold**'} />); expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument(); expect(screen.getByText("bold").tagName).toBe("STRONG"); });
  it("QuizBlock announces correct and incorrect answers in a status region", () => { wrap(<QuizBlock prompt="Capital?" options={["Lima", "Sydney"]} correctOption={0} explanation="Good" />); fireEvent.click(screen.getByLabelText("Sydney")); fireEvent.click(screen.getByRole("button", { name: en.content.quiz.check })); expect(screen.getByRole("status")).toHaveTextContent(en.content.quiz.incorrect); });
  it("YouTubeFacade renders no iframe until play is pressed", () => { wrap(<YouTubeFacade youtubeId="dQw4w9WgXcQ" title="Video" playLabel="Play" />); expect(screen.queryByTitle("Video")).not.toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Play" })); expect(screen.getByTitle("Video")).toHaveAttribute("src", expect.stringContaining("youtube-nocookie.com")); });
  it("LessonBlocks uses the English alt text for locale en", () => { wrap(<LessonBlocks locale="en" blocks={[{ kind: "image", id: "x", position: 0, imagePath: "lessons/x.png", imageWidth: 10, imageHeight: 10, altEs: "Gato", altEn: "Cat" }]} />); expect(screen.getByAltText("Cat")).toBeInTheDocument(); });
});
