"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Category,
  AccountWithCategory,
  LedgerEntryWithRelations,
  LedgerDraft,
} from "@/types/database"
import { IconFileText, IconPlus, IconTrash, IconX, IconFileDescription } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ComboboxSelect } from "@/components/combobox-select"
import { DateRangeFilter } from "@/components/date-range-filter"
import { LedgerDataTable } from "@/components/ledger-data-table"
import { LedgerChart } from "@/components/ledger-chart"
import { SlidingNumber } from "@/components/motion-primitives/sliding-number"
import { CreateReportDialog } from "@/components/reports/create-report-dialog"
import { toast } from "sonner"
import { parseISO } from "date-fns"
import { formatShortRelativeTime } from "@/lib/date-utils"

// Wrapper to animate on initial mount
function AnimatedSlidingNumber({
  value,
  locale = "tr-TR",
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
}: {
  value: number
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
    // Delay to ensure component is mounted before animating
    const timer = setTimeout(() => {
      setDisplayValue(value)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (hasMounted) {
      // For subsequent changes, animate immediately but smoothly
      setDisplayValue(value)
    }
  }, [value, hasMounted])

  return (
    <SlidingNumber
      value={displayValue}
      locale={locale}
      minimumFractionDigits={minimumFractionDigits}
      maximumFractionDigits={maximumFractionDigits}
    />
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount)
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntryWithRelations[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<AccountWithCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [filterCategoryId, setFilterCategoryId] = useState<string>("")
  const [filterAccountId, setFilterAccountId] = useState<string>("")
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>()
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>()

  // Create dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Draft state
  const [drafts, setDrafts] = useState<LedgerDraft[]>([])
  const [resumeDraft, setResumeDraft] = useState<LedgerDraft | null>(null)
  const [isDraftsPopoverOpen, setIsDraftsPopoverOpen] = useState(false)

  // Create report dialog state
  const [isCreateReportDialogOpen, setIsCreateReportDialogOpen] = useState(false)

  const supabase = createClient()

  const fetchDrafts = useCallback(async () => {
    const { data } = await supabase
      .from("ledger_drafts")
      .select("*")
      .order("updated_at", { ascending: false })
    if (data) {
      setDrafts(data as unknown as LedgerDraft[])
    }
  }, [supabase])

  const handleDeleteDraft = useCallback(async (draftId: string) => {
    await supabase.from("ledger_drafts").delete().eq("id", draftId)
    setDrafts((prev) => prev.filter((d) => d.id !== draftId))
    toast.success("Taslak silindi")
  }, [supabase])

  const handleResumeDraft = useCallback((draftId: string) => {
    const draft = drafts.find((d) => d.id === draftId)
    if (!draft) return
    setResumeDraft(draft)
    setIsCreateDialogOpen(true)
    setIsDraftsPopoverOpen(false)
  }, [drafts])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [entriesRes, categoriesRes, accountsRes] = await Promise.all([
        supabase
          .from("ledger_entries")
          .select("*, categories(*), accounts(*)")
          .order("date", { ascending: false }),
        supabase.from("categories").select("*").order("id"),
        supabase.from("accounts").select("*, categories(*)").order("name"),
      ])

      if (entriesRes.error) throw entriesRes.error
      if (categoriesRes.error) throw categoriesRes.error
      if (accountsRes.error) throw accountsRes.error

      setEntries((entriesRes.data as LedgerEntryWithRelations[]) || [])
      setCategories(categoriesRes.data || [])
      setAccounts((accountsRes.data as AccountWithCategory[]) || [])
    } catch {
      toast.error("Veriler yüklenirken bir hata oluştu")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
    fetchDrafts()
  }, [fetchData, fetchDrafts])

  // Clear account filter if selected account doesn't belong to selected category
  useEffect(() => {
    if (filterCategoryId && filterAccountId) {
      const selectedAccount = accounts.find((acc) => acc.id === filterAccountId)
      if (selectedAccount && selectedAccount.category_id !== filterCategoryId) {
        setFilterAccountId("")
      }
    }
  }, [filterCategoryId, accounts, filterAccountId])

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filterCategoryId && entry.category_id !== filterCategoryId) {
        return false
      }
      if (filterAccountId && entry.account_id !== filterAccountId) {
        return false
      }
      if (filterStartDate) {
        const entryDate = parseISO(entry.date)
        if (entryDate < filterStartDate) return false
      }
      if (filterEndDate) {
        const entryDate = parseISO(entry.date)
        if (entryDate > filterEndDate) return false
      }
      return true
    })
  }, [entries, filterCategoryId, filterAccountId, filterStartDate, filterEndDate])

  // Unique statement suggestions from all ledger entries (DB-wide), for autocomplete
  const statementSuggestions = useMemo(() => {
    const statements = entries
      .map((e) => e.statement)
      .filter((s): s is string => !!s && s.trim().length > 0)
    const count = new Map<string, number>()
    statements.forEach((s) => count.set(s, (count.get(s) || 0) + 1))
    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s)
  }, [entries])

  // Calculate totals (all time, not affected by filters)
  const totals = useMemo(() => {
    const totalReceivable = entries.reduce(
      (sum, entry) => sum + (entry.receivable || 0),
      0
    )
    const totalDebt = entries.reduce(
      (sum, entry) => sum + (entry.debt || 0),
      0
    )
    return {
      totalReceivable,
      totalDebt,
      balance: totalReceivable - totalDebt,
    }
  }, [entries])

  const clearFilters = () => {
    setFilterCategoryId("")
    setFilterAccountId("")
  }

  const handleEntryAdded = useCallback((newEntry: LedgerEntryWithRelations) => {
    // Add new entry to state for smooth update
    setEntries((prev) => {
      // Check if entry already exists (for edit case)
      const exists = prev.some((e) => e.id === newEntry.id)
      if (exists) {
        return prev.map((e) => (e.id === newEntry.id ? newEntry : e))
      }
      return [newEntry, ...prev]
    })
  }, [])

  const handleEntryDeleted = useCallback((entryId: string) => {
    // Remove entry from state for smooth update
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 px-4 lg:px-6">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <>
      {/* Row 1: Totals Cards */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-3">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Toplam Alacak</CardDescription>
            <CardTitle className="flex items-baseline gap-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <span>₺</span>
              <AnimatedSlidingNumber value={totals.totalReceivable} />
            </CardTitle>
            <Badge variant="outline" className="w-fit">
              {entries.filter((e) => e.receivable > 0).length} kayıt
            </Badge>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Toplam Borç</CardDescription>
            <CardTitle className="flex items-baseline gap-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <span>₺</span>
              <AnimatedSlidingNumber value={totals.totalDebt} />
            </CardTitle>
            <Badge variant="outline" className="w-fit">
              {entries.filter((e) => e.debt > 0).length} kayıt
            </Badge>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Bakiye</CardDescription>
            <CardTitle className="flex items-baseline gap-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <span>₺</span>
              <AnimatedSlidingNumber value={totals.balance} />
            </CardTitle>
            <Badge variant="outline" className="w-fit">
              {totals.balance >= 0 ? "Pozitif" : "Negatif"}
            </Badge>
          </CardHeader>
        </Card>
      </div>

      {/* Row 2: Filters + Add Button */}
      <div className="px-4 pt-4 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <DateRangeFilter
              startDate={filterStartDate}
              endDate={filterEndDate}
              onRangeChange={(start, end) => {
                setFilterStartDate(start)
                setFilterEndDate(end)
              }}
            />
            <div className="w-[200px]">
              <ComboboxSelect
                items={categories.map((c) => ({ label: c.name, value: c.id }))}
                value={filterCategoryId}
                onValueChange={setFilterCategoryId}
                placeholder="Tüm Ana Hesaplar"
                emptyMessage="Kategori bulunamadı."
                includeAllOption
              />
            </div>
            <div className="w-[200px]">
              <ComboboxSelect
                items={(filterCategoryId
                  ? accounts.filter((a) => a.category_id === filterCategoryId)
                  : accounts
                ).map((a) => ({ label: a.name, value: a.id }))}
                value={filterAccountId}
                onValueChange={setFilterAccountId}
                placeholder="Tüm Alt Hesaplar"
                emptyMessage="Hesap bulunamadı."
                includeAllOption
              />
            </div>
            {(filterCategoryId || filterAccountId) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <IconX className="size-4" />
                Filtreyi Temizle
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateReportDialogOpen(true)}
            >
              <IconFileDescription className="size-4" />
              Rapor Oluştur
            </Button>
            {drafts.length > 0 && (
              <Popover open={isDraftsPopoverOpen} onOpenChange={setIsDraftsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <IconFileText className="size-4" />
                    {drafts.length} Taslak
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-1">
                  <div className="flex flex-col">
                    {drafts.map((draft, index) => (
                      <div
                        key={draft.id}
                        className="flex items-center justify-between gap-2 rounded-sm px-3 py-2 hover:bg-accent cursor-pointer"
                        onClick={() => handleResumeDraft(draft.id)}
                      >
                        <span className="text-sm font-medium">
                          Taslak {index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatShortRelativeTime(new Date(draft.created_at))}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteDraft(draft.id)
                            }}
                          >
                            <IconTrash className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button onClick={() => {
              setResumeDraft(null)
              setIsCreateDialogOpen(true)
            }}>
              <IconPlus className="size-4" />
              Kayıt
            </Button>
          </div>
        </div>
      </div>

      {/* Row 3: Chart */}
      <div className="px-4 lg:px-6">
        <LedgerChart
          entries={filteredEntries}
          startDate={filterStartDate}
          endDate={filterEndDate}
        />
      </div>

      {/* Row 4: Data Table */}
      <LedgerDataTable
        initialData={filteredEntries}
        categories={categories}
        accounts={accounts}
        statementSuggestions={statementSuggestions}
        onRefresh={fetchData}
        onEntryAdded={handleEntryAdded}
        onEntryDeleted={handleEntryDeleted}
        isCreateDialogOpen={isCreateDialogOpen}
        setIsCreateDialogOpen={setIsCreateDialogOpen}
        resumeDraft={resumeDraft}
        onDraftChange={fetchDrafts}
      />

      <CreateReportDialog
        open={isCreateReportDialogOpen}
        onOpenChange={setIsCreateReportDialogOpen}
        initialFilters={{
          startDate: filterStartDate,
          endDate: filterEndDate,
          categoryId: filterCategoryId || undefined,
          accountId: filterAccountId || undefined,
        }}
        accounts={accounts}
        categories={categories}
      />
    </>
  )
}
