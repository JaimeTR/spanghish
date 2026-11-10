/**
 * Utilidades puras para comprobar que la documentación de despliegue
 * (docs/despliegue.md) y .env.example no se quedan atrás respecto al código.
 */

/** Variables de `names` que no aparecen como `NOMBRE` en una fila de tabla del documento. */
export function missingFromReference(docText: string, names: readonly string[]): string[] {
  const documented = new Set<string>();
  for (const line of docText.split(/\r?\n/)) {
    if (!line.trimStart().startsWith("|")) continue;
    for (const match of line.matchAll(/`([A-Z][A-Z0-9_]*)`/g)) documented.add(match[1]!);
  }
  return names.filter((name) => !documented.has(name));
}

/** Nombres definidos en un .env.example (líneas `NOMBRE=`, también comentadas como `# NOMBRE=`). */
export function envExampleNames(text: string): string[] {
  const names = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*#?\s*([A-Z][A-Z0-9_]*)=/.exec(line);
    if (match) names.add(match[1]!);
  }
  return [...names];
}

/** Fragmentos del texto que parecen una clave real (para que la documentación nunca lleve una). */
export function secretLookalikes(text: string): string[] {
  const patterns = [/eyJ[A-Za-z0-9_-]{38,}/g, /sk_live_[A-Za-z0-9]+/g, /sk_test_[A-Za-z0-9]{20,}/g, /sb_secret_[A-Za-z0-9_-]+/g, /whsec_[A-Za-z0-9]{12,}/g];
  return patterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => `${match[0].slice(0, 10)}…`));
}
