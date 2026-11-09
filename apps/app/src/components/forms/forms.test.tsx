// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { Field } from "./Field";
import { FormStatus } from "./FormStatus";
import { SubmitButton } from "./SubmitButton";

function wrap(ui: ReactNode, locale: "es" | "en" = "es") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("Field", () => {
  it("Field marks the input invalid and describes it with the error", () => {
    wrap(
      <Field name="email" label="Correo" error="email" hint="El de la escuela">
        <input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText("Correo");
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/El de la escuela/);
    expect(input).toHaveAccessibleDescription(new RegExp(es.forms.errors.email));
  });

  it("a valid field is not marked invalid and keeps its hint", () => {
    wrap(
      <Field name="name" label="Nombre" hint="Como aparece en la lista">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText("Nombre");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAccessibleDescription("Como aparece en la lista");
  });
});

describe("FormStatus", () => {
  it("announces a translated domain error as an alert", () => {
    wrap(<FormStatus state={{ status: "error", error: "group_full" }} />, "en");
    expect(screen.getByRole("alert")).toHaveTextContent(en.errors.domain.group_full);
  });

  it("announces success in a status region", () => {
    wrap(<FormStatus state={{ status: "ok" }} />);
    expect(screen.getByRole("status")).toHaveTextContent(es.forms.saved);
  });

  it("summarises field errors", () => {
    wrap(<FormStatus state={{ status: "invalid", fieldErrors: { name: "required" } }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(es.forms.invalid);
  });

  it("is empty when idle", () => {
    wrap(<FormStatus state={{ status: "idle" }} />);
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

describe("SubmitButton", () => {
  it("renders an enabled submit button outside a pending form", () => {
    wrap(
      <form>
        <SubmitButton pendingLabel="Guardando…">Guardar</SubmitButton>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeEnabled();
  });
});
