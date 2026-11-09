// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import es from "../../messages/es.json";
import { LocaleSwitch } from "./LocaleSwitch";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const nav = vi.hoisted(() => ({ pathname: "/es/admin" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

function wrap(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const logout = vi.fn();

beforeEach(() => {
  nav.pathname = "/es/admin";
});

describe("Sidebar", () => {
  it("admin sidebar lists dashboard, students, teachers", () => {
    wrap(<Sidebar role="admin" locale="es" />);
    const navEl = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(within(navEl).getByRole("link", { name: "Panel" })).toHaveAttribute("href", "/es/admin");
    expect(within(navEl).getByText("Alumnos")).toBeInTheDocument();
    expect(within(navEl).getByText("Docentes")).toBeInTheDocument();
    expect(within(navEl).getByText("Ajustes")).toBeInTheDocument();
  });

  it("student sidebar does not list admin links", () => {
    nav.pathname = "/es/student";
    wrap(<Sidebar role="student" locale="es" />);
    const navEl = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(within(navEl).getByRole("link", { name: "Inicio" })).toHaveAttribute(
      "href",
      "/es/student",
    );
    expect(within(navEl).queryByText("Alumnos")).not.toBeInTheDocument();
    expect(within(navEl).queryByText("Docentes")).not.toBeInTheDocument();
    for (const a of navEl.querySelectorAll("a")) {
      expect(a.getAttribute("href")).not.toMatch(/\/admin/);
    }
  });

  it("sidebar has accessible nav landmark", () => {
    wrap(<Sidebar role="teacher" locale="es" />);
    const navEl = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(navEl.tagName).toBe("NAV");
    expect(within(navEl).getByRole("list")).toBeInTheDocument();
  });

  it("modules in development are links with a visible badge and an accessible name", () => {
    const { container } = wrap(<Sidebar role="admin" locale="es" />);
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/es/admin",
      "/es/admin/calendar",
      "/es/admin/groups",
      "/es/admin/enrollments",
      "/es/admin/attendance",
      "/es/admin/payments",
      "/es/admin/leads",
      "/es/admin/catalog",
      "/es/admin/students",
      "/es/admin/teachers",
      "/es/admin/resources",
      "/es/admin/lessons",
      "/es/admin/settings/consent-texts",
    ]);
    const calendar = screen.getByRole("link", { name: /^Calendario,\s*En desarrollo$/ });
    expect(calendar).toHaveAttribute("href", "/es/admin/calendar");
    expect(within(calendar).getByText("En desarrollo")).toBeVisible();
    expect(container.querySelector("[aria-disabled]")).toBeNull();
    // Un módulo listo no lleva insignia.
    expect(within(screen.getByRole("link", { name: "Catálogo" })).queryByText("En desarrollo")).toBeNull();
  });

  it("a module in development marks itself as current", () => {
    nav.pathname = "/es/admin/leads";
    wrap(<Sidebar role="admin" locale="es" />);
    expect(screen.getByRole("link", { name: /^Solicitudes,\s*En desarrollo$/ })).toHaveAttribute("aria-current", "page");
  });

  it("a nested admin page marks its section as current", () => {
    nav.pathname = "/es/admin/teachers/new";
    wrap(<Sidebar role="admin" locale="es" />);
    expect(screen.getByRole("link", { name: "Docentes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Panel" })).not.toHaveAttribute("aria-current");
  });

  it("current item has aria-current=page", () => {
    nav.pathname = "/es/teacher/today";
    wrap(<Sidebar role="teacher" locale="es" />);
    expect(screen.getByRole("link", { name: /^Hoy,\s*En desarrollo$/ })).toHaveAttribute("aria-current", "page");
    nav.pathname = "/es/admin";
  });
});

describe("LocaleSwitch", () => {
  it("LocaleSwitch keeps the current path", () => {
    nav.pathname = "/es/student";
    wrap(<LocaleSwitch locale="es" />);
    const group = screen.getByRole("group", { name: "Idioma" });
    const en = within(group).getByRole("link", { name: /EN/ });
    expect(en).toHaveAttribute("href", "/en/student");
    expect(en).toHaveAttribute("lang", "en");
    const current = within(group).getByRole("link", { name: /ES/ });
    expect(current).toHaveAttribute("aria-current", "true");
    expect(current).toHaveAttribute("href", "/es/student");
  });
});

describe("Topbar", () => {
  it("role switcher lists only allowed areas for a teacher+student", () => {
    nav.pathname = "/es/teacher";
    wrap(
      <Topbar
        name="Teacher Local"
        roles={["teacher", "student"]}
        area="teacher"
        locale="es"
        logout={logout}
      />,
    );
    const group = screen.getByRole("group", { name: "Cambiar de área" });
    const links = within(group).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Docente", "/es/teacher"],
      ["Alumno", "/es/student"],
    ]);
    expect(links[0]).toHaveAttribute("aria-current", "true");
    expect(links[1]).not.toHaveAttribute("aria-current");
  });

  it("a single-role user gets no role switcher, but sees name and logout", () => {
    nav.pathname = "/es/student";
    wrap(<Topbar name="Student Local" roles={["student"]} area="student" locale="es" logout={logout} />);
    expect(screen.queryByRole("group", { name: "Cambiar de área" })).not.toBeInTheDocument();
    expect(screen.getByText("Student Local")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("mobile menu opens with the button, closes with Escape and returns focus", async () => {
    const user = userEvent.setup();
    nav.pathname = "/es/admin";
    wrap(<Topbar name="Admin Local" roles={["admin"]} area="admin" locale="es" logout={logout} />);
    const button = screen.getByRole("button", { name: "Menú" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const navEl = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(button.getAttribute("aria-controls")).toBe(
      navEl.closest("[id]")?.getAttribute("id"),
    );
    // El foco entra en el menú (primer enlace).
    expect(within(navEl).getByRole("link", { name: "Panel" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
});
