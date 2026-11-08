import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders primary with fuchsia background class", () => {
    render(<Button>Empezar</Button>);
    const btn = screen.getByRole("button", { name: "Empezar" });
    expect(btn).toHaveClass("bg-primary", "text-on-primary");
    expect(btn).toHaveAttribute("type", "button");
  });

  it("renders highlight with ink text", () => {
    render(<Button variant="highlight">Premium</Button>);
    const btn = screen.getByRole("button", { name: "Premium" });
    expect(btn).toHaveClass("bg-highlight", "text-on-highlight");
    expect(btn).not.toHaveClass("text-highlight");
  });

  it("is focusable and shows focus ring class", async () => {
    const user = userEvent.setup();
    render(<Button variant="secondary">Volver</Button>);
    await user.tab();
    const btn = screen.getByRole("button", { name: "Volver" });
    expect(btn).toHaveFocus();
    expect(btn.className).toContain("focus-visible:outline-");
  });

  it("forwards ref, type and native attributes; disabled does not fire onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} type="submit" disabled onClick={onClick}>
        Enviar
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toHaveAttribute("type", "submit");
    expect(onClick).not.toHaveBeenCalled();
  });
});
