// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import es from "../../../messages/es.json";
import { BilingualField } from "../forms/BilingualField";
import { MoveButtons } from "./MoveButtons";

describe("content form components", () => {
  it("BilingualField renders two inputs with lang es and en and links errors", () => {
    render(<NextIntlClientProvider locale="es" messages={es}><BilingualField name="title" label="Título" errors={{ titleEn: "required" }} maxLength={120} /></NextIntlClientProvider>);
    expect(screen.getByLabelText("Español")).toHaveAttribute("lang", "es");
    expect(screen.getByLabelText("English")).toHaveAttribute("lang", "en");
    expect(screen.getByLabelText("English")).toHaveAttribute("aria-describedby", "field-titleEn-error");
  });
  it("MoveButtons disables up on the first row", () => {
    render(<MoveButtons id="x" action={async () => {}} labelUp="Up" labelDown="Down" first last={false} />);
    expect(screen.getByRole("button", { name: "Up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Down" })).toBeEnabled();
  });
});
