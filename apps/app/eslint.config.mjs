import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "next-env.d.ts"] },
  // La service_role solo se usa para crear cuentas, desde lib/people/provision.ts.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/people/provision.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/supabase/admin", "@/lib/supabase/admin"],
              message: "createAdminClient (service_role) solo se importa en lib/people/provision.ts.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
