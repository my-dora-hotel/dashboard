import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"
import type { AccountStatementData } from "./account-statement"
import type { AccountSummaryData } from "./account-summary"

// Embed a font that supports Turkish (Latin Extended) so ı, ş, ğ, ü, ö, ç, İ, Ş, Ğ, Ü, Ö, Ç render correctly in all viewers.
// Using Fontsource WOFF (Latin Extended subset) for smaller PDFs; same-origin optional via public/fonts/.
Font.register({
  family: "NotoSans",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.0/files/noto-sans-latin-ext-400-normal.woff",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.0/files/noto-sans-latin-ext-700-normal.woff",
      fontWeight: 700,
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "NotoSans",
  },
  header: {
    marginBottom: 20,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 10,
    marginBottom: 20,
  },
  table: {
    display: "flex",
    flexDirection: "column",
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 5,
  },
  tableRowDevir: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 5,
    backgroundColor: "#f9f9f9",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
    paddingVertical: 6,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 3,
  },
  tableCellDate: {
    flex: 1,
    paddingHorizontal: 3,
  },
  tableCellDescription: {
    flex: 2,
    paddingHorizontal: 3,
  },
  tableCellAmount: {
    flex: 1,
    paddingHorizontal: 3,
    textAlign: "right",
  },
  footer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#000",
  },
  footerRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  footerLabel: {
    flex: 2,
    fontWeight: "bold",
    paddingHorizontal: 3,
  },
  footerValue: {
    flex: 1,
    paddingHorizontal: 3,
    textAlign: "right",
    fontWeight: "bold",
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 3,
    backgroundColor: "#f0f0f0",
  },
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateString: string): string {
  return format(parseISO(dateString), "dd.MM.yyyy", { locale: tr })
}

/* -------------------------------------------------------------------
 * Account Statement PDF
 * ------------------------------------------------------------------- */

interface AccountStatementPDFProps {
  data: AccountStatementData
  accountName: string
  dateRange: string
}

const AccountStatementPDF: React.FC<AccountStatementPDFProps> = ({
  data,
  accountName,
  dateRange,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.companyName}>MY DORA HOTEL</Text>
        <Text style={styles.reportTitle}>HESAP EKSTRESİ</Text>
        <Text style={styles.dateRange}>
          Hesap: {accountName} | {dateRange}
        </Text>
      </View>

      <View style={styles.table}>
        {/* Header */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.tableCellDate}>Tarih</Text>
          <Text style={styles.tableCellDescription}>Açıklama</Text>
          <Text style={styles.tableCellAmount}>Borç</Text>
          <Text style={styles.tableCellAmount}>Alacak</Text>
          <Text style={styles.tableCellAmount}>Borç Bakiye</Text>
          <Text style={styles.tableCellAmount}>Alacak Bakiye</Text>
        </View>

        {/* Devir row */}
        <View style={styles.tableRowDevir}>
          <Text style={styles.tableCellDate}>Devir</Text>
          <Text style={styles.tableCellDescription}></Text>
          <Text style={styles.tableCellAmount}></Text>
          <Text style={styles.tableCellAmount}></Text>
          <Text style={styles.tableCellAmount}>
            {data.openingNet > 0 ? formatCurrency(data.openingNet) : ""}
          </Text>
          <Text style={styles.tableCellAmount}>
            {data.openingNet < 0 ? formatCurrency(Math.abs(data.openingNet)) : ""}
          </Text>
        </View>

        {/* Entry rows */}
        {data.entries.map((entry, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCellDate}>{formatDate(entry.date)}</Text>
            <Text style={styles.tableCellDescription}>
              {entry.statement || ""}
            </Text>
            <Text style={styles.tableCellAmount}>
              {entry.debt > 0 ? formatCurrency(entry.debt) : ""}
            </Text>
            <Text style={styles.tableCellAmount}>
              {entry.receivable > 0 ? formatCurrency(entry.receivable) : ""}
            </Text>
            <Text style={styles.tableCellAmount}>
              {entry.runningNet > 0 ? formatCurrency(entry.runningNet) : ""}
            </Text>
            <Text style={styles.tableCellAmount}>
              {entry.runningNet < 0
                ? formatCurrency(Math.abs(entry.runningNet))
                : ""}
            </Text>
          </View>
        ))}

        {/* Footer */}
        <View style={[styles.footer, styles.footerRow]}>
          <Text style={styles.footerLabel}>Toplam</Text>
          <Text style={styles.footerValue}>
            {formatCurrency(data.totalDebt)}
          </Text>
          <Text style={styles.footerValue}>
            {formatCurrency(data.totalReceivable)}
          </Text>
          <Text style={styles.footerValue}>
            {data.closingNet > 0 ? formatCurrency(data.closingNet) : ""}
          </Text>
          <Text style={styles.footerValue}>
            {data.closingNet < 0
              ? formatCurrency(Math.abs(data.closingNet))
              : ""}
          </Text>
        </View>
      </View>
    </Page>
  </Document>
)

/* -------------------------------------------------------------------
 * Account Summary PDF
 * ------------------------------------------------------------------- */

interface AccountSummaryPDFProps {
  data: AccountSummaryData
  dateRange: string
  categoryName?: string
}

const AccountSummaryPDF: React.FC<AccountSummaryPDFProps> = ({
  data,
  dateRange,
  categoryName,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.companyName}>MY DORA HOTEL</Text>
        <Text style={styles.reportTitle}>
          HESAP ÖZETİ {categoryName ? `- ${categoryName}` : ""}
        </Text>
        <Text style={styles.dateRange}>{dateRange}</Text>
      </View>

      {data.groups.map((group, groupIndex) => (
        <View key={groupIndex}>
          <Text style={styles.categoryTitle}>{group.category.name}</Text>
          <View style={styles.table}>
            {/* Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Hesap Adı</Text>
              <Text style={styles.tableCellAmount}>Borç</Text>
              <Text style={styles.tableCellAmount}>Alacak</Text>
              <Text style={styles.tableCellAmount}>Borç Bakiye</Text>
              <Text style={styles.tableCellAmount}>Alacak Bakiye</Text>
            </View>

            {/* Account rows */}
            {group.accounts.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.tableRow}>
                <Text style={styles.tableCell}>{row.account.name}</Text>
                <Text style={styles.tableCellAmount}>
                  {row.totalDebt > 0 ? formatCurrency(row.totalDebt) : ""}
                </Text>
                <Text style={styles.tableCellAmount}>
                  {row.totalReceivable > 0
                    ? formatCurrency(row.totalReceivable)
                    : ""}
                </Text>
                <Text style={styles.tableCellAmount}>
                  {row.net > 0 ? formatCurrency(row.net) : ""}
                </Text>
                <Text style={styles.tableCellAmount}>
                  {row.net < 0 ? formatCurrency(Math.abs(row.net)) : ""}
                </Text>
              </View>
            ))}

            {/* Category total */}
            <View style={[styles.footerRow, { marginTop: 4 }]}>
              <Text style={styles.footerLabel}>
                {group.category.name} Toplam
              </Text>
              <Text style={styles.footerValue}>
                {formatCurrency(group.totalDebt)}
              </Text>
              <Text style={styles.footerValue}>
                {formatCurrency(group.totalReceivable)}
              </Text>
              <Text style={styles.footerValue}>
                {group.net > 0 ? formatCurrency(group.net) : ""}
              </Text>
              <Text style={styles.footerValue}>
                {group.net < 0 ? formatCurrency(Math.abs(group.net)) : ""}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {/* Grand total */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>Genel Toplam</Text>
          <Text style={styles.footerValue}>
            {formatCurrency(data.totalDebt)}
          </Text>
          <Text style={styles.footerValue}>
            {formatCurrency(data.totalReceivable)}
          </Text>
          <Text style={styles.footerValue}>
            {data.totalNet > 0 ? formatCurrency(data.totalNet) : ""}
          </Text>
          <Text style={styles.footerValue}>
            {data.totalNet < 0
              ? formatCurrency(Math.abs(data.totalNet))
              : ""}
          </Text>
        </View>
      </View>
    </Page>
  </Document>
)

/**
 * Generate PDF blob for account statement
 */
export async function generateAccountStatementPDF(
  data: AccountStatementData,
  accountName: string,
  dateRange: string
): Promise<Blob> {
  const doc = (
    <AccountStatementPDF
      data={data}
      accountName={accountName}
      dateRange={dateRange}
    />
  )
  return await pdf(doc).toBlob()
}

/**
 * Generate PDF blob for account summary
 */
export async function generateAccountSummaryPDF(
  data: AccountSummaryData,
  dateRange: string,
  categoryName?: string
): Promise<Blob> {
  const doc = (
    <AccountSummaryPDF
      data={data}
      dateRange={dateRange}
      categoryName={categoryName}
    />
  )
  return await pdf(doc).toBlob()
}

/**
 * Download PDF file
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
