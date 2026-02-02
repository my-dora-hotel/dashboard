import asimile from "asimile"

/**
 * Normalizes text for search: converts Turkish characters to ASCII equivalents
 * and lowercases. Enables matching e.g. "is veren" with "İş Veren".
 * Uses asimile (Turkish → Latin); toLowerCase with tr-TR locale first so
 * İ→i and I→ı are handled correctly.
 */
export function normalizeForSearch(str: string): string {
  if (typeof str !== "string") return ""
  const lower = str.toLocaleLowerCase("tr-TR")
  return asimile(lower)
}
