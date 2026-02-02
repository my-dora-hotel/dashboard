import asimile from "asimile"

/**
 * Arama için metni normalize eder: Türkçe karakterleri ASCII karşılıklarına
 * çevirir ve küçük harfe dönüştürür. Böylece "is veren" ile "İş Veren" eşleşir.
 * asimile (Türkçe → İngilizce karakter) kullanır; önce tr-TR locale ile
 * toLowerCase uygulanır ki İ→i ve I→ı doğru işlensin.
 */
export function normalizeForSearch(str: string): string {
  if (typeof str !== "string") return ""
  const lower = str.toLocaleLowerCase("tr-TR")
  return asimile(lower)
}
