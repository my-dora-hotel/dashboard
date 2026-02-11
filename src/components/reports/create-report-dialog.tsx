"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRangeFilter } from "@/components/date-range-filter"
import { ComboboxSelect } from "@/components/combobox-select"
import { createClient } from "@/lib/supabase/client"
import { generateReportTitle } from "@/lib/reports/generate-title"
import type {
  ReportType,
  AccountStatementParameters,
  AccountSummaryParameters,
  AccountSummaryFilterOption,
} from "@/types/reports"
import type { AccountWithCategory, Category } from "@/types/database"

interface CreateReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialFilters?: {
    startDate?: Date
    endDate?: Date
    categoryId?: string
    accountId?: string
  }
  accounts: AccountWithCategory[]
  categories: Category[]
}

export function CreateReportDialog({
  open,
  onOpenChange,
  initialFilters,
  accounts,
  categories,
}: CreateReportDialogProps) {
  const router = useRouter()
  const supabase = createClient()

  const [reportType, setReportType] = React.useState<ReportType>("account_summary")
  const [title, setTitle] = React.useState("")
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    initialFilters?.startDate
  )
  const [endDate, setEndDate] = React.useState<Date | undefined>(
    initialFilters?.endDate
  )
  const [categoryId, setCategoryId] = React.useState<string>(
    initialFilters?.categoryId || ""
  )
  const [accountId, setAccountId] = React.useState<string>(
    initialFilters?.accountId || ""
  )
  const [filterOption, setFilterOption] =
    React.useState<AccountSummaryFilterOption>("all")
  const [isAllTime, setIsAllTime] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset all state when dialog opens
  React.useEffect(() => {
    if (open) {
      setReportType(initialFilters?.accountId ? "account_statement" : "account_summary")
      setTitle("")
      setStartDate(initialFilters?.startDate)
      setEndDate(initialFilters?.endDate)
      setCategoryId(initialFilters?.categoryId || "")
      setAccountId(initialFilters?.accountId || "")
      setFilterOption("all")
      setIsAllTime(!initialFilters?.startDate && !initialFilters?.endDate)
      setIsSubmitting(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate title when parameters change
  React.useEffect(() => {
    const effectiveStartDate = isAllTime ? "2000-01-01" : startDate ? format(startDate, "yyyy-MM-dd") : null
    const effectiveEndDate = isAllTime ? "2099-12-31" : endDate ? format(endDate, "yyyy-MM-dd") : null

    if (reportType === "account_statement") {
      const account = accountId
        ? accounts.find((a) => a.id === accountId) || null
        : null
      const params: AccountStatementParameters = {
        startDate: effectiveStartDate || "",
        endDate: effectiveEndDate || "",
        accountId: accountId || "",
      }
      setTitle(generateReportTitle("account_statement", params, account))
    } else {
      const category = categoryId
        ? categories.find((c) => c.id === categoryId) || null
        : null
      const params: AccountSummaryParameters = {
        startDate: effectiveStartDate || "",
        endDate: effectiveEndDate || "",
        categoryId: categoryId || null,
        filterOption,
      }
      setTitle(generateReportTitle("account_summary", params, null, category))
    }
  }, [
    reportType,
    startDate,
    endDate,
    isAllTime,
    accountId,
    categoryId,
    filterOption,
    accounts,
    categories,
  ])

  const handleSubmit = async () => {
    if (!isAllTime && (!startDate || !endDate)) {
      toast.error("Lütfen tarih aralığı seçin")
      return
    }

    if (reportType === "account_statement" && !accountId) {
      toast.error("Lütfen hesap seçin")
      return
    }

    if (!title.trim()) {
      toast.error("Lütfen rapor başlığı girin")
      return
    }

    setIsSubmitting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const startDateStr = isAllTime ? "2000-01-01" : format(startDate!, "yyyy-MM-dd")
      const endDateStr = isAllTime ? "2099-12-31" : format(endDate!, "yyyy-MM-dd")

      let parameters: AccountStatementParameters | AccountSummaryParameters

      if (reportType === "account_statement") {
        parameters = {
          startDate: startDateStr,
          endDate: endDateStr,
          accountId,
        }
      } else {
        parameters = {
          startDate: startDateStr,
          endDate: endDateStr,
          categoryId: categoryId || null,
          filterOption,
        }
      }

      const { data: report, error } = await supabase
        .from("reports")
        .insert({
          user_id: user.id,
          type: reportType,
          title: title.trim(),
          parameters,
        })
        .select()
        .single()

      if (error) throw error

      toast.success("Rapor başarıyla oluşturuldu")
      onOpenChange(false)
      router.push(`/accounting/reports/${report.id}`)
    } catch (error) {
      toast.error("Rapor oluşturulurken bir hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Rapor Oluştur</DialogTitle>
          <DialogDescription>
            Mevcut filtreleri kullanarak yeni bir rapor oluşturun.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Rapor Türü</Label>
            <Select
              value={reportType}
              onValueChange={(value) => setReportType(value as ReportType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="account_statement">
                  Hesap Ekstresi
                </SelectItem>
                <SelectItem value="account_summary">Hesap Özeti</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Tarih Aralığı</Label>
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onRangeChange={(start, end) => {
                setStartDate(start)
                setEndDate(end)
                setIsAllTime(!start && !end)
              }}
            />
          </div>

          {reportType === "account_statement" ? (
            <div className="space-y-3">
              <Label>Hesap (Alt Hesap)</Label>
              <ComboboxSelect
                items={accounts.map((a) => ({ label: a.name, value: a.id }))}
                value={accountId}
                onValueChange={setAccountId}
                placeholder="Hesap seçin..."
                emptyMessage="Hesap bulunamadı."
                portal={false}
              />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label>Ana Hesap (İsteğe Bağlı)</Label>
                <ComboboxSelect
                  items={categories.map((c) => ({
                    label: c.name,
                    value: c.id,
                  }))}
                  value={categoryId}
                  onValueChange={setCategoryId}
                  placeholder="Tüm Ana Hesaplar"
                  emptyMessage="Kategori bulunamadı."
                  includeAllOption
                  portal={false}
                />
              </div>
              <div className="space-y-3">
                <Label>Filtre Seçeneği</Label>
                <Select
                  value={filterOption}
                  onValueChange={(value) =>
                    setFilterOption(value as AccountSummaryFilterOption)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="onlyDebtBalance">
                      Sadece Borç Bakiyeli Olanlar
                    </SelectItem>
                    <SelectItem value="onlyReceivableBalance">
                      Sadece Alacak Bakiyeli Olanlar
                    </SelectItem>
                    <SelectItem value="onlyActive">
                      Sadece Aktif Olanlar
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-3">
            <Label>Başlık</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Rapor başlığı"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>
            Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
