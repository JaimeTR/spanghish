import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// Primer segmento con forma de código de idioma (p. ej. /fr, /pt-BR).
const LOCALE_LIKE = /^[a-z]{2}(?:-[A-Za-z]{2})?$/;

export default function proxy(request: NextRequest) {
  const [first, ...rest] = request.nextUrl.pathname.split("/").filter(Boolean);
  if (first && LOCALE_LIKE.test(first) && !isLocale(first)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${[routing.defaultLocale, ...rest].join("/")}`;
    return NextResponse.redirect(url);
  }
  return intl(request);
}

export const config = {
  // Todo excepto api, _next, _vercel y archivos estáticos.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
