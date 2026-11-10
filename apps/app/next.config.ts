import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import { assertEnv, checkAppEnv } from "./src/lib/env";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// En Vercel el build se detiene si faltan variables o hay alguna peligrosa (ver src/lib/env.ts).
// En local y en CI no se valida.
if (process.env.VERCEL === "1") assertEnv(checkAppEnv(process.env), "app");

const nextConfig: NextConfig = {
  transpilePackages: ["@spanglish/ui", "@spanglish/content"],
  /** El portal es privado: ninguna respuesta se indexa, en ningún entorno. */
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default withNextIntl(nextConfig);
