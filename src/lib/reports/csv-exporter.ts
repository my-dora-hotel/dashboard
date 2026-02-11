import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"
import type { AccountStatementData } from "./account-statement"
import type { AccountSummaryData } from "./account-summary"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export account statement to CSV
 */
export function exportAccountStatementToCSV(
  data: AccountStatementData,
  accountName: string,
  dateRange: string
): void {
  const headers = [
    "Tarih",
    "Açıklama",
    "Borç",
    "Alacak",
    "Borç Bakiye",
    "Alacak Bakiye",
  ]

  const rows: string[] = []
  rows.push(headers.join(","))

  // Devir row
  rows.push(
    [
      "Devir",
      "",
      "",
      "",
      data.openingNet > 0 ? formatCurrency(data.openingNet) : "",
      data.openingNet < 0 ? formatCurrency(Math.abs(data.openingNet)) : "",
    ].join(",")
  )

  // Entry rows
  data.entries.forEach((entry) => {
    rows.push(
      [
        format(parseISO(entry.date), "dd.MM.yyyy", { locale: tr }),
        escapeCSV(entry.statement || ""),
        entry.debt > 0 ? formatCurrency(entry.debt) : "",
        entry.receivable > 0 ? formatCurrency(entry.receivable) : "",
        entry.runningNet > 0 ? formatCurrency(entry.runningNet) : "",
        entry.runningNet < 0
          ? formatCurrency(Math.abs(entry.runningNet))
          : "",
      ].join(",")
    )
  })

  // Totals row
  rows.push(
    [
      "Toplam",
      "",
      formatCurrency(data.totalDebt),
      formatCurrency(data.totalReceivable),
      data.closingNet > 0 ? formatCurrency(data.closingNet) : "",
      data.closingNet < 0 ? formatCurrency(Math.abs(data.closingNet)) : "",
    ].join(",")
  )

  downloadCSV(rows.join("\n"), `${accountName}_${dateRange}.csv`)
}

/**
 * Export account summary to CSV
 */
export function exportAccountSummaryToCSV(
  data: AccountSummaryData,
  dateRange: string
): void {
  const headers = [
    "Kategori",
    "Hesap",
    "Borç",
    "Alacak",
    "Borç Bakiye",
    "Alacak Bakiye",
  ]

  const rows: string[] = []
  rows.push(headers.join(","))

  data.groups.forEach((group) => {
    group.accounts.forEach((row) => {
      rows.push(
        [
          escapeCSV(group.category.name),
          escapeCSV(row.account.name),
          row.totalDebt > 0 ? formatCurrency(row.totalDebt) : "",
          row.totalReceivable > 0 ? formatCurrency(row.totalReceivable) : "",
          row.net > 0 ? formatCurrency(row.net) : "",
          row.net < 0 ? formatCurrency(Math.abs(row.net)) : "",
        ].join(",")
      )
    })

    // Category totals
    rows.push(
      [
        escapeCSV(group.category.name),
        "Toplam",
        formatCurrency(group.totalDebt),
        formatCurrency(group.totalReceivable),
        group.net > 0 ? formatCurrency(group.net) : "",
        group.net < 0 ? formatCurrency(Math.abs(group.net)) : "",
      ].join(",")
    )
    rows.push("") // Empty row between categories
  })

  // Grand totals
  rows.push(
    [
      "Genel Toplam",
      "",
      formatCurrency(data.totalDebt),
      formatCurrency(data.totalReceivable),
      data.totalNet > 0 ? formatCurrency(data.totalNet) : "",
      data.totalNet < 0 ? formatCurrency(Math.abs(data.totalNet)) : "",
    ].join(",")
  )

  downloadCSV(rows.join("\n"), `Hesap_Ozeti_${dateRange}.csv`)
}
