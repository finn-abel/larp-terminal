/**
 * Reads a design token off the document root. Canvas libraries need real colour
 * strings, so this is how they stay driven by `theme/tokens.css` instead of forking
 * the palette into JavaScript.
 */
export function readToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}
