// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PasswordField } from "./fields";

const labels = {
  label: "Contraseña",
  showLabel: "Mostrar contraseña",
  hideLabel: "Ocultar contraseña",
  capsLockLabel: "Bloq Mayús está activado.",
};

describe("PasswordField", () => {
  it("is found by its label and hides the text by default", () => {
    render(<PasswordField {...labels} />);
    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
    expect(input).toBeRequired();
  });

  it("the toggle shows and hides the password without losing what was typed", async () => {
    const user = userEvent.setup();
    render(<PasswordField {...labels} />);
    const input = screen.getByLabelText("Contraseña");
    await user.type(input, "secreta-123");

    const show = screen.getByRole("button", { name: "Mostrar contraseña" });
    expect(show.textContent).toBe("");
    expect(show).toHaveAttribute("title", "Mostrar contraseña");
    expect(show).toHaveAttribute("type", "button");
    expect(show).toHaveAttribute("aria-controls", input.id);
    await user.click(show);
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("secreta-123");

    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("secreta-123");
  });

  it("the field is found by its exact label even though the icon button also names the password", () => {
    render(<PasswordField {...labels} />);
    expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveAttribute("type", "password");
  });

  it("warns politely while Caps Lock is on and clears the warning when it is off or on blur", () => {
    render(<PasswordField {...labels} />);
    const input = screen.getByLabelText("Contraseña");
    const warning = () => document.querySelector("[aria-live='polite']")!;
    expect(warning()).toBeEmptyDOMElement();

    fireEvent.keyUp(input, { key: "a", modifierCapsLock: true });
    expect(warning()).toHaveTextContent("Bloq Mayús está activado.");
    expect(input).toHaveAccessibleDescription("Bloq Mayús está activado.");

    fireEvent.keyUp(input, { key: "a", modifierCapsLock: false });
    expect(warning()).toBeEmptyDOMElement();

    fireEvent.keyDown(input, { key: "a", modifierCapsLock: true });
    fireEvent.blur(input);
    expect(warning()).toBeEmptyDOMElement();
  });

  it("combines an external description with the caps lock one and renders the footer", () => {
    render(
      <>
        <p id="login-error">Error</p>
        <PasswordField {...labels} describedBy="login-error" invalid footer={<button type="button">¿Olvidaste?</button>} />
      </>,
    );
    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Error");
    expect(screen.getByRole("button", { name: "¿Olvidaste?" })).toBeInTheDocument();
  });
});
