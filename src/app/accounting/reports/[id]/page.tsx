"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { IconDownload, IconShare, IconArrowLeft } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AccountStatementTable } from "@/components/reports/account-statement-table"
import { AccountSummaryTable } from "@/components/reports/account-summary-table"
import { ShareDialog } from "@/components/reports/share-dialog"
import {
  fetchAccountStatement,
  type AccountStatementData,
} from "@/lib/reports/account-statement"
import {
  fetchAccountSummary,
  type AccountSummaryData,
} from "@/lib/reports/account-summary"
import {
  exportAccountStatementToCSV,
  exportAccountSummaryToCSV,
} from "@/lib/reports/csv-exporter"
import {
  generateAccountStatementPDF,
  generateAccountSummaryPDF,
  downloadPDF,
} from "@/lib/reports/pdf-generator"
import type { Report } from "@/types/reports"
import type { AccountWithCategory, Category } from "@/types/database"
import { toast } from "sonner"

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string
  const supabase = createClient()

  const [report, setReport] = useState<Report | null>(null)
  const [accounts, setAccounts] = useState<AccountWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [statementData, setStatementData] =
    useState<AccountStatementData | null>(null)
  const [summaryData, setSummaryData] = useState<AccountSummaryData | null>(
    null
  )

  const fetchReport = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single()

      if (reportError) throw reportError
      if (!reportData) {
        toast.error("Rapor bulunamadı")
        router.push("/accounting/reports")
        return
      }

      const reportObj = reportData as unknown as Report
      setReport(reportObj)

      // Fetch reference data
      const [categoriesRes, accountsRes] = await Promise.all([
        supabase.from("categories").select("*").order("id"),
        supabase.from("accounts").select("*, categories(*)").order("name"),
      ])

      if (categoriesRes.data) setCategories(categoriesRes.data)
      if (accountsRes.data)
        setAccounts(accountsRes.data as AccountWithCategory[])

      // Fetch report-specific data
      if (reportObj.type === "account_statement") {
        const result = await fetchAccountStatement(
          reportObj.parameters as any
        )
        setStatementData(result)
      } else {
        const result = await fetchAccountSummary(reportObj.parameters as any)
        setSummaryData(result)
      }
    } catch {
      toast.error("Rapor yüklenirken bir hata oluştu")
      router.push("/accounting/reports")
    } finally {
      setIsLoading(false)
    }
  }, [reportId, supabase, router])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const getDateRangeText = () => {
    if (!report) return "-"
    try {
      const isAllTime =
        report.parameters.startDate === "2000-01-01" &&
        report.parameters.endDate === "2099-12-31"
      if (isAllTime) return "Tüm Zamanlar"

      const start = format(parseISO(report.parameters.startDate), "dd.MM.yyyy", {
        locale: tr,
      })
      const end = format(parseISO(report.parameters.endDate), "dd.MM.yyyy", {
        locale: tr,
      })
      return start === end ? start : `${start} - ${end}`
    } catch {
      return "-"
    }
  }

  const handleExportCSV = () => {
    if (!report) return
    try {
      const dateRange = getDateRangeText().replace(/\s/g, "_")

      if (report.type === "account_statement" && statementData) {
        const account = accounts.find(
          (a) => a.id === (report.parameters as any).accountId
        )
        exportAccountStatementToCSV(
          statementData,
          account?.name || "Hesap",
          dateRange
        )
        toast.success("CSV dosyası indirildi")
      } else if (report.type === "account_summary" && summaryData) {
        exportAccountSummaryToCSV(summaryData, dateRange)
        toast.success("CSV dosyası indirildi")
      }
    } catch {
      toast.error("CSV export sırasında bir hata oluştu")
    }
  }

  const handleExportPDF = async () => {
    if (!report) return
    try {
      const dateRange = getDateRangeText()

      if (report.type === "account_statement" && statementData) {
        const account = accounts.find(
          (a) => a.id === (report.parameters as any).accountId
        )
        const accountName = account?.name || "Hesap"
        const blob = await generateAccountStatementPDF(
          statementData,
          accountName,
          dateRange
        )
        downloadPDF(
          blob,
          `${accountName}_${dateRange.replace(/\s/g, "_")}.pdf`
        )
        toast.success("PDF dosyası indirildi")
      } else if (report.type === "account_summary" && summaryData) {
        const categoryId = (report.parameters as any).categoryId
        const category = categoryId
          ? categories.find((c) => c.id === categoryId)
          : null
        const blob = await generateAccountSummaryPDF(
          summaryData,
          dateRange,
          category?.name
        )
        downloadPDF(
          blob,
          `Hesap_Ozeti_${dateRange.replace(/\s/g, "_")}.pdf`
        )
        toast.success("PDF dosyası indirildi")
      }
    } catch {
      toast.error("PDF export sırasında bir hata oluştu")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 px-4 lg:px-6">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    )
  }

  if (!report) {
    return null
  }

  const reportTypeLabel =
    report.type === "account_statement" ? "Hesap Ekstresi" : "Hesap Özeti"

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/accounting/reports?from=detail")}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{report.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{reportTypeLabel}</Badge>
              <span className="text-sm text-muted-foreground">
                {getDateRangeText()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
            <IconShare className="mr-2 size-4" />
            Paylaş
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <IconDownload className="mr-2 size-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <IconDownload className="mr-2 size-4" />
            PDF
          </Button>
        </div>
      </div>

      {report.type === "account_statement" && statementData && (
        <AccountStatementTable data={statementData} />
      )}

      {report.type === "account_summary" && summaryData && (
        <AccountSummaryTable data={summaryData} />
      )}

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        reportId={reportId}
      />
    </div>
  )
}
