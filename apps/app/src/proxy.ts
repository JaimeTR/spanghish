import { createServerClient, type CookieOptions } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, routing } from "./i18n/routing";
import { loadSessionUser } from "./lib/load-session-user";
import { guardRequest, type GuardUser } from "./lib/route-guard";
import { supabaseEnv } from "./lib/supabase/env";

const intl = createMiddleware(routing);

// Primer segmento con forma de código de idioma (p. ej. /fr, /pt-BR).
const LOCALE_LIKE = /^[a-z]{2}(?:-[A-Za-z]{2})?$/;

type PendingCookie = { name: string; value: string; options: CookieOptions };

/**
 * Orden:
 *  1. Idioma desconocido -> /es/... (antes que nada).
 *  2. Sesión de Supabase: getUser() valida el JWT y renueva cookies. Las cookies
 *     renovadas se escriben también en la petición ANTES de next-intl, que copia
 *     las cabeceras de la petición: así los Server Components ven la sesión nueva.
 *  3. next-intl (prefijo de idioma); si redirige, se devuelve tal cual.
 *  4. Reglas de acceso (guardRequest) sobre el pathname crudo.
 * El proxy NO es la única barrera: cada layout/página privada vuelve a comprobar
 * el rol con getSessionUser().
 */
export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const [first, ...rest] = pathname.split("/").filter(Boolean);
  if (first && LOCALE_LIKE.test(first) && !isLocale(first)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${[routing.defaultLocale, ...rest].join("/")}`;
    return NextResponse.redirect(url);
  }

  const pending: PendingCookie[] = [];
  const { url, anonKey } = supabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) {
          request.cookies.set(name, value);
          pending.push({ name, value, options });
        }
      },
    },
  });
  const withCookies = <T extends NextResponse>(response: T): T => {
    for (const { name, value, options } of pending) response.cookies.set(name, value, options);
    // Una respuesta que fija cookies de sesión nunca debe ir a cachés compartidas.
    if (pending.length > 0) response.headers.set("Cache-Control", "private, no-store");
    return response;
  };

  const sessionUser = await loadSessionUser(supabase);
  const user: GuardUser = sessionUser
    ? { roles: sessionUser.roles, status: sessionUser.status }
    : null;

  const intlResponse = intl(request);
  if (intlResponse.headers.has("location")) return withCookies(intlResponse);

  const decision = guardRequest(pathname, search, user);
  if (decision.kind === "allow") return withCookies(intlResponse);
  if (decision.kind === "reject") {
    return withCookies(new NextResponse(null, { status: 400 }));
  }
  if (decision.signOut) await supabase.auth.signOut();
  return withCookies(NextResponse.redirect(new URL(decision.to, request.url)));
}

export const config = {
  // Todo excepto api, _next, _vercel y archivos estáticos.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
