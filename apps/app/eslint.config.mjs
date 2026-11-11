import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "next-env.d.ts"] },
  // La service_role solo se usa en dos sitios: crear cuentas (lib/people/provision.ts) y los pedidos/descargas de la tienda (lib/shop/orders.ts).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/people/provision.ts", "src/lib/shop/orders.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/supabase/admin", "@/lib/supabase/admin"],
              message: "createAdminClient (service_role) solo se importa en lib/people/provision.ts y lib/shop/orders.ts.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
