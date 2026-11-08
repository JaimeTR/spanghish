import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [...nextVitals, ...nextTs, { ignores: [".next/**", "next-env.d.ts", ".design-preview/**", "test-results/**", "playwright-report/**"] }];

export default config;
