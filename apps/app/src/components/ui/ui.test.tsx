// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pencil } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDelete } from "./ConfirmDelete";
import { IconButton, IconLink } from "./IconButton";

describe("IconButton / IconLink", () => {
  it("has no visible text: the label is the accessible name and the tooltip", () => {
    render(<IconButton label="Cerrar" icon={<Pencil />} />);
    const button = screen.getByRole("button", { name: "Cerrar" });
    expect(button.textContent).toBe("");
    expect(button).toHaveAttribute("title", "Cerrar");
    expect(button).toHaveAttribute("type", "button");
  });

  it("an icon link keeps its destination and name", () => {
    render(<IconLink href="/es/admin/students/1" label="Editar" icon={<Pencil />} />);
    const link = screen.getByRole("link", { name: "Editar" });
    expect(link).toHaveAttribute("href", "/es/admin/students/1");
    expect(link.textContent).toBe("");
  });

  it("passes click handlers through", async () => {
    const onClick = vi.fn();
    render(<IconButton label="Abrir" icon={<Pencil />} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("ConfirmDelete", () => {
  const labels = { label: "Eliminar recurso", confirmLabel: "¿Seguro?", cancelLabel: "Cancelar" };

  it("asks for a second step with icon-only buttons and can be cancelled", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <ConfirmDelete {...labels} />
      </form>,
    );
    expect(screen.queryByRole("button", { name: "¿Seguro?" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar recurso" }));
    const sure = screen.getByRole("button", { name: "¿Seguro?" });
    expect(sure).toHaveAttribute("type", "submit");
    expect(sure.textContent).toBe("");
    expect(screen.getByRole("button", { name: "Cancelar" }).textContent).toBe("");
    expect(screen.queryByRole("button", { name: "Eliminar recurso" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "Eliminar recurso" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "¿Seguro?" })).not.toBeInTheDocument();
  });

  it("only submits on the second step", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ConfirmDelete {...labels} />
      </form>,
    );
    await user.click(screen.getByRole("button", { name: "Eliminar recurso" }));
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "¿Seguro?" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
