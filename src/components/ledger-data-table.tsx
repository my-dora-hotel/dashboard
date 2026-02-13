"use client"

import * as React from "react"
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { StatementAutocomplete } from "@/components/statement-autocomplete"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DatePicker } from "@/components/date-picker"
import { ComboboxSelect } from "@/components/combobox-select"
import { createClient } from "@/lib/supabase/client"
import { useDraftAutoSave } from "@/hooks/use-draft-auto-save"
import {
  Category,
  AccountWithCategory,
  LedgerEntryWithRelations,
  LedgerDraft,
  LedgerDraftEntry,
} from "@/types/database"

interface LedgerDataTableProps {
  initialData: LedgerEntryWithRelations[]
  categories: Category[]
  accounts: AccountWithCategory[]
  /** Unique statement strings for autocomplete (e.g. from all ledger entries in DB, not filtered by date). */
  statementSuggestions?: string[]
  onRefresh: () => void
  onEntryAdded?: (entry: LedgerEntryWithRelations) => void
  onEntryDeleted?: (entryId: string) => void
  isCreateDialogOpen?: boolean
  setIsCreateDialogOpen?: (open: boolean) => void
  /** When set, the create dialog opens pre-filled with this draft's data */
  resumeDraft?: LedgerDraft | null
  /** Called when a draft is created or deleted so parent can refresh list */
  onDraftChange?: () => void
}

interface EntryFormData {
  date: Date | undefined
  category_id: string
  account_id: string
  statement: string
  type: "receivable" | "debt"
  amount: string
}

const initialFormData: EntryFormData = {
  date: new Date(),
  category_id: "",
  account_id: "",
  statement: "",
  type: "receivable",
  amount: "",
}

// Multi-entry creation types
interface EntryRowData {
  id: string
  account_id: string
  category_id: string
  statement: string
  type: "receivable" | "debt"
  amount: string
}

const createEmptyRow = (): EntryRowData => ({
  id: crypto.randomUUID(),
  account_id: "",
  category_id: "",
  statement: "",
  type: "debt",
  amount: "",
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount)
}

export function LedgerDataTable({
  initialData,
  categories,
  accounts,
  statementSuggestions: statementSuggestionsProp,
  onRefresh,
  onEntryAdded,
  onEntryDeleted,
  isCreateDialogOpen: externalCreateDialogOpen,
  setIsCreateDialogOpen: externalSetCreateDialogOpen,
  resumeDraft: resumeDraftProp,
  onDraftChange,
}: LedgerDataTableProps) {
  const [data, setData] = React.useState(initialData)
  const [newRowIds, setNewRowIds] = React.useState<Set<string>>(new Set())
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
  })
  const [viewMode, setViewMode] = React.useState<"list" | "grouped">("list")
  const [internalCreateDialogOpen, setInternalCreateDialogOpen] = React.useState(false)
  
  // Use external state if provided, otherwise use internal
  const isCreateDialogOpen = externalCreateDialogOpen ?? internalCreateDialogOpen
  const setIsCreateDialogOpen = externalSetCreateDialogOpen ?? setInternalCreateDialogOpen
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedEntry, setSelectedEntry] = React.useState<LedgerEntryWithRelations | null>(null)
  const [formData, setFormData] = React.useState<EntryFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Multi-entry creation state
  const [createDate, setCreateDate] = React.useState<Date | undefined>(new Date())
  const [entryRows, setEntryRows] = React.useState<EntryRowData[]>([createEmptyRow()])
  
  // Row selection state for balance preview
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null)
  const [currentAccountBalance, setCurrentAccountBalance] = React.useState<number | null>(null)
  
  // Cache for account balances (account_id -> balance) - cleared when dialog closes
  const balanceCacheRef = React.useRef<Map<string, number>>(new Map())

  // Draft auto-save
  const { draftId, setDraftId, deleteDraft, flushSave } = useDraftAutoSave({
    entryRows: entryRows as LedgerDraftEntry[],
    createDate,
    isOpen: isCreateDialogOpen,
  })

  // Load draft data synchronously when resumeDraft prop changes or dialog opens
  React.useEffect(() => {
    if (!resumeDraftProp || !isCreateDialogOpen) return
    const rows = Array.isArray(resumeDraftProp.entries)
      ? resumeDraftProp.entries
      : []
    const date = resumeDraftProp.date
      ? new Date(resumeDraftProp.date)
      : undefined
    setEntryRows(rows as EntryRowData[])
    setCreateDate(date)
    setDraftId(resumeDraftProp.id)
  }, [resumeDraftProp, isCreateDialogOpen, setDraftId])

  const supabase = createClient()

  React.useEffect(() => {
    setData(initialData)
  }, [initialData])

  const handleAccountChange = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId)
    if (account) {
      const entryType = account.categories?.entry_type ?? "both"
      setFormData((prev) => ({
        ...prev,
        account_id: accountId,
        category_id: account.category_id,
        type:
          entryType === "debt"
            ? "debt"
            : entryType === "receivable"
              ? "receivable"
              : prev.type,
      }))
    }
  }

  const resetForm = () => {
    setFormData(initialFormData)
    // Reset multi-entry state
    setCreateDate(new Date())
    setEntryRows([createEmptyRow()])
    // Reset selection state
    setSelectedRowId(null)
    setCurrentAccountBalance(null)
    // Clear balance cache when form resets
    balanceCacheRef.current.clear()
  }

  // Reset form when dialog opens (works for both external state and onOpenChange)
  const prevCreateDialogOpenRef = React.useRef(isCreateDialogOpen)
  React.useEffect(() => {
    const wasOpen = prevCreateDialogOpenRef.current
    prevCreateDialogOpenRef.current = isCreateDialogOpen

    if (isCreateDialogOpen && !wasOpen) {
      // Dialog just opened: reset form unless resuming a draft
      if (!resumeDraftProp) {
        resetForm()
      }
    }
  }, [isCreateDialogOpen, resumeDraftProp])

  const handleCreateDialogOpenChange = (open: boolean) => {
    if (!open) {
      // Save draft BEFORE closing (flushSave reads from refs).
      flushSave().then(() => {
        onDraftChange?.()
      })
      // Clear balance cache when dialog closes
      balanceCacheRef.current.clear()
    }
    setIsCreateDialogOpen(open)
  }

  // Multi-entry row management
  const handleRowAccountChange = (rowId: string, accountId: string) => {
    const account = accounts.find((a) => a.id === accountId)
    if (account) {
      const entryType = account.categories?.entry_type ?? "both"
      setEntryRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                account_id: accountId,
                category_id: account.category_id,
                type:
                  entryType === "debt"
                    ? "debt"
                    : entryType === "receivable"
                      ? "receivable"
                      : row.type,
              }
            : row
        )
      )
      // Set selected row when account changes
      setSelectedRowId(rowId)
    }
  }

  const updateRow = (rowId: string, field: keyof EntryRowData, value: string) => {
    setEntryRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    )
  }

  const lastRowFirstCellRef = React.useRef<HTMLDivElement>(null)

  const addRow = () => {
    setEntryRows((prev) => [...prev, createEmptyRow()])
    // Open the new row's Hesap (account) dropdown after render
    setTimeout(() => {
      const trigger = lastRowFirstCellRef.current?.querySelector<HTMLButtonElement>('button[role="combobox"]')
      trigger?.click()
    }, 0)
  }

  const removeRow = (rowId: string) => {
    setEntryRows((prev) => {
      if (prev.length === 1) return prev // Keep at least one row
      return prev.filter((row) => row.id !== rowId)
    })
    // Clear selection if removed row was selected
    if (selectedRowId === rowId) {
      setSelectedRowId(null)
      setCurrentAccountBalance(null)
    }
  }

  const hasValidRow = React.useMemo(() => {
    return entryRows.some((row) => {
      if (!row.account_id || !row.category_id || !row.amount) return false
      const amount = parseFloat(row.amount)
      return !isNaN(amount) && amount > 0
    })
  }, [entryRows])

  const createDialogTotals = React.useMemo(() => {
    let totalReceivable = 0
    let totalDebt = 0
    for (const row of entryRows) {
      if (!row.account_id || !row.category_id || !row.amount) continue
      const amount = parseFloat(row.amount)
      if (isNaN(amount) || amount <= 0) continue
      if (row.type === "receivable") totalReceivable += amount
      else totalDebt += amount
    }
    return {
      totalReceivable,
      totalDebt,
      balance: totalReceivable - totalDebt,
    }
  }, [entryRows])

  // Get selected row and account
  const selectedRow = React.useMemo(() => {
    return entryRows.find((row) => row.id === selectedRowId) || null
  }, [entryRows, selectedRowId])

  const selectedRowAccount = React.useMemo(() => {
    if (!selectedRow?.account_id) return null
    return accounts.find((a) => a.id === selectedRow.account_id) || null
  }, [selectedRow, accounts])

  // Fetch account balance from DB with caching
  React.useEffect(() => {
    if (!selectedRow?.account_id || !isCreateDialogOpen) {
      setCurrentAccountBalance(null)
      return
    }

    const accountId = selectedRow.account_id

    // Check cache first
    const cachedBalance = balanceCacheRef.current.get(accountId)
    if (cachedBalance !== undefined) {
      setCurrentAccountBalance(cachedBalance)
      return
    }

    // Fetch from DB if not in cache
    const fetchBalance = async () => {
      const { data, error } = await supabase
        .from("ledger_entries")
        .select("receivable, debt")
        .eq("account_id", accountId)

      if (error) {
        console.error("Error fetching account balance:", error)
        setCurrentAccountBalance(null)
        return
      }

      const balance = data && data.length > 0
        ? data.reduce((sum, entry) => {
            return sum + (entry.receivable || 0) - (entry.debt || 0)
          }, 0)
        : 0

      // Cache the result
      balanceCacheRef.current.set(accountId, balance)
      setCurrentAccountBalance(balance)
    }

    fetchBalance()
  }, [selectedRow?.account_id, isCreateDialogOpen, supabase])

  // Calculate pending changes for selected account
  const pendingChangesForSelectedAccount = React.useMemo(() => {
    if (!selectedRow?.account_id) return 0

    let change = 0
    for (const row of entryRows) {
      if (row.account_id !== selectedRow.account_id) continue
      if (!row.amount) continue
      const amount = parseFloat(row.amount)
      if (isNaN(amount) || amount <= 0) continue

      if (row.type === "receivable") {
        change += amount
      } else if (row.type === "debt") {
        change -= amount
      }
    }

    return change
  }, [entryRows, selectedRow?.account_id])

  const handleCreate = async () => {
    if (!createDate) {
      toast.error("Lütfen tarih seçin")
      return
    }

    // Validate all rows
    const validRows = entryRows.filter(
      (row) => row.account_id && row.category_id && row.amount
    )

    if (validRows.length === 0) {
      toast.error("Lütfen en az bir geçerli kayıt girin")
      return
    }

    // Check for invalid amounts
    for (const row of validRows) {
      const amount = parseFloat(row.amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error("Lütfen geçerli tutarlar girin")
        return
      }
    }

    const totalReceivable = validRows
      .filter((r) => r.type === "receivable")
      .reduce((sum, r) => sum + parseFloat(r.amount), 0)
    const totalDebt = validRows
      .filter((r) => r.type === "debt")
      .reduce((sum, r) => sum + parseFloat(r.amount), 0)
    const balance = totalReceivable - totalDebt

    if (Math.abs(balance) > 0.001) {
      toast.error(
        "Bakiye sıfır olmalıdır. Alacak ve borç toplamları eşit olmalı."
      )
      return
    }

    setIsSubmitting(true)
    try {
      const entriesToInsert = validRows.map((row) => {
        const amount = parseFloat(row.amount)
        return {
          date: format(createDate, "yyyy-MM-dd"),
          category_id: row.category_id,
          account_id: row.account_id,
          statement: row.statement || null,
          receivable: row.type === "receivable" ? amount : 0,
          debt: row.type === "debt" ? amount : 0,
        }
      })

      const { data: newEntries, error } = await supabase
        .from("ledger_entries")
        .insert(entriesToInsert)
        .select("*, categories(*), accounts(*)")

      if (error) throw error
      if (!newEntries || newEntries.length === 0)
        throw new Error("Kayıtlar oluşturulamadı")

      const entriesWithRelations = newEntries as LedgerEntryWithRelations[]

      // Optimistic update: Add all new entries to local state
      setData((prev) => [...entriesWithRelations, ...prev])

      // Mark all as new rows for animation
      const newIds = entriesWithRelations.map((e) => e.id)
      setNewRowIds((prev) => new Set([...prev, ...newIds]))

      // Remove animation class after animation completes
      setTimeout(() => {
        setNewRowIds((prev) => {
          const next = new Set(prev)
          newIds.forEach((id) => next.delete(id))
          return next
        })
      }, 500)

      // Notify parent component for totals and chart updates
      if (onEntryAdded) {
        entriesWithRelations.forEach((entry) => onEntryAdded(entry))
      }

      // Delete draft on successful creation
      await deleteDraft()
      onDraftChange?.()

      toast.success(
        entriesWithRelations.length === 1
          ? "Kayıt başarıyla oluşturuldu"
          : `${entriesWithRelations.length} kayıt başarıyla oluşturuldu`
      )
      setIsCreateDialogOpen(false)
      // Form will be reset when dialog opens next time
    } catch {
      toast.error("Kayıt oluşturulurken bir hata oluştu")
      // On error, refresh to sync with server
      onRefresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (
      !selectedEntry ||
      !formData.date ||
      !formData.category_id ||
      !formData.account_id ||
      !formData.amount
    ) {
      toast.error("Lütfen tüm zorunlu alanları doldurun")
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Lütfen geçerli bir tutar girin")
      return
    }

    setIsSubmitting(true)
    try {
      const { data: updatedEntry, error } = await supabase
        .from("ledger_entries")
        .update({
          date: format(formData.date, "yyyy-MM-dd"),
          category_id: formData.category_id,
          account_id: formData.account_id,
          statement: formData.statement || null,
          receivable: formData.type === "receivable" ? amount : 0,
          debt: formData.type === "debt" ? amount : 0,
        })
        .eq("id", selectedEntry.id)
        .select("*, categories(*), accounts(*)")
        .single()

      if (error) throw error
      if (!updatedEntry) throw new Error("Kayıt güncellenemedi")

      const entryWithRelations = updatedEntry as LedgerEntryWithRelations

      // Optimistic update: Update in local state
      setData((prev) =>
        prev.map((entry) =>
          entry.id === selectedEntry.id ? entryWithRelations : entry
        )
      )

      // Notify parent component for totals and chart updates
      if (onEntryAdded) {
        onEntryAdded(entryWithRelations)
      }

      toast.success("Kayıt başarıyla güncellendi")
      setIsEditDialogOpen(false)
      setSelectedEntry(null)
      resetForm()
    } catch {
      toast.error("Kayıt güncellenirken bir hata oluştu")
      // On error, refresh to sync with server
      onRefresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedEntry) return

    const entryToDelete = selectedEntry

    try {
      // Optimistic update: Remove from local state immediately
      setData((prev) => prev.filter((entry) => entry.id !== entryToDelete.id))

      const { error } = await supabase
        .from("ledger_entries")
        .delete()
        .eq("id", entryToDelete.id)

      if (error) throw error

      // Notify parent component for totals and chart updates
      if (onEntryDeleted) {
        onEntryDeleted(entryToDelete.id)
      }

      toast.success("Kayıt başarıyla silindi")
      setIsDeleteDialogOpen(false)
      setSelectedEntry(null)
    } catch {
      toast.error("Kayıt silinirken bir hata oluştu")
      // On error, refresh to sync with server
      onRefresh()
    }
  }

  const openEditDialog = (entry: LedgerEntryWithRelations) => {
    setSelectedEntry(entry)
    setFormData({
      date: parseISO(entry.date),
      category_id: entry.category_id,
      account_id: entry.account_id,
      statement: entry.statement || "",
      type: entry.receivable > 0 ? "receivable" : "debt",
      amount: (entry.receivable > 0 ? entry.receivable : entry.debt).toString(),
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (entry: LedgerEntryWithRelations) => {
    setSelectedEntry(entry)
    setIsDeleteDialogOpen(true)
  }

  const columns: ColumnDef<LedgerEntryWithRelations>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Tarih
          {column.getIsSorted() === "asc" ? (
            <IconArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <IconArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {format(parseISO(row.original.date), "dd MMM yyyy", { locale: tr })}
        </div>
      ),
    },
    {
      accessorKey: "categories",
      header: "Kategori",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.categories.name}
        </Badge>
      ),
    },
    {
      accessorKey: "accounts",
      header: "Hesap",
      cell: ({ row }) => <div>{row.original.accounts.name}</div>,
    },
    {
      accessorKey: "statement",
      header: "Açıklama",
      cell: ({ row }) => (
        <div className="text-muted-foreground max-w-[200px] truncate">
          {row.original.statement || "-"}
        </div>
      ),
    },
    {
      accessorKey: "debt",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            className="-mr-4 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Borç
            {column.getIsSorted() === "asc" ? (
              <IconArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {row.original.debt > 0 ? formatCurrency(row.original.debt) : "-"}
        </div>
      ),
    },
    {
      accessorKey: "receivable",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            className="-mr-4 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Alacak
            {column.getIsSorted() === "asc" ? (
              <IconArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {row.original.receivable > 0
            ? formatCurrency(row.original.receivable)
            : "-"}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8 ml-auto"
                size="icon"
              >
                <IconDotsVertical />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => openEditDialog(row.original)}>
                <IconPencil className="mr-2 size-4" />
                Düzenle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => openDeleteDialog(row.original)}
              >
                <IconTrash className="mr-2 size-4" />
                Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Totals over all filtered rows (ignores pagination) — date/category filter + table column filters
  const tableTotals = React.useMemo(() => {
    const rows = table.getFilteredRowModel().rows
    let totalReceivable = 0
    let totalDebt = 0
    rows.forEach((row) => {
      const entry = row.original
      totalReceivable += entry.receivable || 0
      totalDebt += entry.debt || 0
    })
    return {
      totalReceivable,
      totalDebt,
      balance: totalReceivable - totalDebt,
    }
  }, [data, columnFilters])

  // Group entries by category for grouped view
  const groupedEntries = React.useMemo(() => {
    const groups = new Map<string, {
      category: Category
      entries: LedgerEntryWithRelations[]
      totalReceivable: number
      totalDebt: number
    }>()

    data.forEach((entry) => {
      const categoryId = entry.category_id
      if (!groups.has(categoryId)) {
        groups.set(categoryId, {
          category: entry.categories,
          entries: [],
          totalReceivable: 0,
          totalDebt: 0,
        })
      }
      const group = groups.get(categoryId)!
      group.entries.push(entry)
      group.totalReceivable += entry.receivable || 0
      group.totalDebt += entry.debt || 0
    })

    return Array.from(groups.values()).sort((a, b) =>
      a.category.id.localeCompare(b.category.id)
    )
  }, [data])

  const selectedAccount = formData.account_id
    ? accounts.find((a) => a.id === formData.account_id)
    : null
  const categoryEntryType = selectedAccount?.categories?.entry_type ?? "both"
  const allowReceivable = categoryEntryType === "receivable" || categoryEntryType === "both"
  const allowDebt = categoryEntryType === "debt" || categoryEntryType === "both"

  // Use suggestions from all DB entries when provided; otherwise fallback to current (filtered) data
  const statementSuggestions = React.useMemo(() => {
    if (statementSuggestionsProp && statementSuggestionsProp.length > 0) {
      return statementSuggestionsProp
    }
    const statements = data
      .map((entry) => entry.statement)
      .filter((s): s is string => !!s && s.trim().length > 0)
    const statementCount = new Map<string, number>()
    statements.forEach((s) => {
      statementCount.set(s, (statementCount.get(s) || 0) + 1)
    })
    return Array.from(statementCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([statement]) => statement)
  }, [data, statementSuggestionsProp])

  const renderEntryForm = (isEdit: boolean = false) => (
    <div className="space-y-6 py-6">
      <div className="space-y-3">
        <Label>Tarih</Label>
        <DatePicker
          date={formData.date}
          onDateChange={(date) => setFormData(prev => ({ ...prev, date }))}
        />
      </div>
      <div className="space-y-3">
        <Label>Hesap</Label>
        <ComboboxSelect
          items={accounts.map((a) => ({ label: a.name, value: a.id }))}
          value={formData.account_id}
          onValueChange={handleAccountChange}
          placeholder="Hesap seçin..."
          emptyMessage="Hesap bulunamadı."
          portal={false}
        />
        <p className="text-xs text-muted-foreground">
          Kategori hesap seçimine göre otomatik belirlenir
        </p>
      </div>
      <div className="space-y-3">
        <Label htmlFor={isEdit ? "edit-statement" : "statement"}>
          Açıklama (İsteğe bağlı)
        </Label>
        <StatementAutocomplete
          id={isEdit ? "edit-statement" : "statement"}
          placeholder="İşlem açıklaması"
          value={formData.statement}
          onValueChange={(value) =>
            setFormData(prev => ({ ...prev, statement: value }))
          }
          suggestions={statementSuggestions}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label>İşlem Türü</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={formData.type}
            onValueChange={(value) => {
              if (value) setFormData(prev => ({ ...prev, type: value as "receivable" | "debt" }))
            }}
            className="w-full"
          >
            <ToggleGroupItem
              value="receivable"
              className="flex-1"
              disabled={!allowReceivable}
            >
              Alacak
            </ToggleGroupItem>
            <ToggleGroupItem
              value="debt"
              className="flex-1"
              disabled={!allowDebt}
            >
              Borç
            </ToggleGroupItem>
          </ToggleGroup>
          {!allowReceivable && (
            <p className="text-xs text-muted-foreground">
              Bu kategori yalnızca Borç kaydı kabul eder
            </p>
          )}
          {!allowDebt && (
            <p className="text-xs text-muted-foreground">
              Bu kategori yalnızca Alacak kaydı kabul eder
            </p>
          )}
        </div>
        <div className="space-y-3">
          <Label htmlFor={isEdit ? "edit-amount" : "amount"}>Tutar (TRY)</Label>
          <CurrencyInput
            id={isEdit ? "edit-amount" : "amount"}
            value={formData.amount}
            onValueChange={(value) =>
              setFormData(prev => ({ ...prev, amount: value }))
            }
          />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as "list" | "grouped")}
        className="w-full flex-col justify-start gap-6"
      >
        <div className="flex items-center justify-between px-4 lg:px-6">
          <TabsList className="hidden @4xl/main:flex">
            <TabsTrigger value="list">Liste</TabsTrigger>
            <TabsTrigger value="grouped">
              Kategoriler <Badge variant="secondary">{groupedEntries.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <Label htmlFor="view-selector" className="sr-only">
            Görünüm
          </Label>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "grouped")}>
            <SelectTrigger
              className="flex w-fit @4xl/main:hidden"
              size="sm"
              id="view-selector"
            >
              <SelectValue placeholder="Görünüm seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">Liste</SelectItem>
              <SelectItem value="grouped">Kategoriler</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TabsContent
          value="list"
          className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        >
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const entry = row.original as LedgerEntryWithRelations
                    const isNewRow = newRowIds.has(entry.id)
                    return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={isNewRow ? "animate-in fade-in slide-in-from-top-2 duration-500" : ""}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      Kayıt bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
                {table.getRowModel().rows?.length > 0 && (
                  <>
                    <TableRow className="bg-muted/50 font-medium border-t-2">
                      <TableCell colSpan={4} className="text-right">
                        Genel Toplam
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(tableTotals.totalDebt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(tableTotals.totalReceivable)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow className="bg-muted font-semibold">
                      <TableCell colSpan={4} className="text-right">
                        Bakiye
                      </TableCell>
                      <TableCell colSpan={2} className="text-right">
                        {formatCurrency(tableTotals.balance)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4">
            <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
              {table.getFilteredRowModel().rows.length} kayıt
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit">
              <div className="hidden items-center gap-2 lg:flex">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  Sayfa başına
                </Label>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value))
                  }}
                >
                  <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                    <SelectValue
                      placeholder={table.getState().pagination.pageSize}
                    />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Sayfa {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">İlk sayfa</span>
                  <IconChevronsLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Önceki sayfa</span>
                  <IconChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Sonraki sayfa</span>
                  <IconChevronRight />
                </Button>
                <Button
                  variant="outline"
                  className="hidden size-8 lg:flex"
                  size="icon"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Son sayfa</span>
                  <IconChevronsRight />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="grouped" className="flex flex-col gap-6 px-4 lg:px-6">
          {groupedEntries.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Kayıt bulunamadı</p>
            </div>
          ) : (
            groupedEntries.map((group) => (
              <div key={group.category.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {group.category.id}
                  </Badge>
                  <h3 className="text-lg font-semibold">
                    {group.category.name}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    ({group.entries.length} kayıt)
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Hesap</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead className="text-right">Borç</TableHead>
                        <TableHead className="text-right">Alacak</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {format(parseISO(entry.date), "dd MMM yyyy", {
                              locale: tr,
                            })}
                          </TableCell>
                          <TableCell>{entry.accounts.name}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {entry.statement || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.debt > 0 ? formatCurrency(entry.debt) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.receivable > 0
                              ? formatCurrency(entry.receivable)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                                  size="icon"
                                >
                                  <IconDotsVertical />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(entry)}
                                >
                                  <IconPencil className="mr-2 size-4" />
                                  Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => openDeleteDialog(entry)}
                                >
                                  <IconTrash className="mr-2 size-4" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Summary Row */}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={3} className="text-right">
                          Toplam
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(group.totalDebt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(group.totalReceivable)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow className="bg-muted font-semibold">
                        <TableCell colSpan={3} className="text-right">
                          Bakiye
                        </TableCell>
                        <TableCell colSpan={2} className="text-right">
                          {formatCurrency(group.totalReceivable - group.totalDebt)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog - Multi-entry */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
        <DialogContent
            className="sm:max-w-none w-[85vw] max-w-[1100px] !h-[80vh] flex flex-col"
            style={{ height: '80vh', width: '85vw', maxWidth: '1100px' }}
          >
          <DialogHeader>
            <DialogTitle>Yeni Defter Kaydı</DialogTitle>
            <DialogDescription>
              Bir veya birden fazla alacak/borç kaydı ekleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col space-y-6 py-4 overflow-hidden min-h-0">
            {/* Shared Date Picker */}
            <div className="space-y-3 shrink-0">
              <Label>Tarih</Label>
              <DatePicker
                date={createDate}
                onDateChange={setCreateDate}
              />
            </div>

            {/* Entries Table */}
            <div 
              className="flex-1 flex flex-col min-h-0 space-y-3"
              onClick={(e) => {
                // Clear selection if clicking outside the table
                const target = e.target as HTMLElement
                if (!target.closest('.rounded-md.border')) {
                  setSelectedRowId(null)
                }
              }}
            >
              <div className="flex items-center justify-between shrink-0">
                <Label>Kayıtlar</Label>
                <Button variant="outline" size="sm" onClick={addRow}>
                  <IconPlus className="mr-1 size-4" />
                  Kayıt
                </Button>
              </div>

              <div className="rounded-md border flex-1 min-h-0 flex flex-col overflow-hidden">
                <div 
                  className="flex-1 min-h-0 overflow-auto outline-none focus:outline-none"
                  onKeyDown={(e) => {
                    // Navigate rows with arrow keys
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault()
                      const currentIndex = entryRows.findIndex((row) => row.id === selectedRowId)
                      
                      if (e.key === 'ArrowUp') {
                        // Move to previous row
                        if (currentIndex > 0) {
                          setSelectedRowId(entryRows[currentIndex - 1].id)
                        } else if (currentIndex === -1 && entryRows.length > 0) {
                          // If no row selected, select last row
                          setSelectedRowId(entryRows[entryRows.length - 1].id)
                        }
                      } else if (e.key === 'ArrowDown') {
                        // Move to next row
                        if (currentIndex >= 0 && currentIndex < entryRows.length - 1) {
                          setSelectedRowId(entryRows[currentIndex + 1].id)
                        } else if (currentIndex === -1 && entryRows.length > 0) {
                          // If no row selected, select first row
                          setSelectedRowId(entryRows[0].id)
                        }
                      }
                    }
                  }}
                  onClick={(e) => {
                    // If clicking on a cell (td), selection is handled by TableRow onClick
                    // If clicking on empty space (not on td), clear selection
                    const target = e.target as HTMLElement
                    if (!target.closest('td')) {
                      setSelectedRowId(null)
                    }
                  }}
                  tabIndex={0}
                >
                  <table
                    className="w-full caption-bottom text-sm"
                    style={{ tableLayout: 'fixed', width: '100%' }}
                  >
                    <colgroup>
                      <col style={{ width: '27%' }} />
                      <col style={{ width: '38%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '5%' }} />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-muted border-b [&_tr]:border-b">
                      <TableRow>
                        <TableHead className="px-3">Hesap</TableHead>
                        <TableHead className="px-3">Açıklama</TableHead>
                        <TableHead className="px-3">İşlem</TableHead>
                        <TableHead className="px-3">Tutar</TableHead>
                        <TableHead className="px-3"></TableHead>
                      </TableRow>
                    </thead>
                    <TableBody>
                    {entryRows.map((row, rowIndex) => {
                      const rowAccount = row.account_id
                        ? accounts.find((a) => a.id === row.account_id)
                        : null
                      const rowEntryType = rowAccount?.categories?.entry_type ?? "both"
                      const rowAllowReceivable = rowEntryType === "receivable" || rowEntryType === "both"
                      const rowAllowDebt = rowEntryType === "debt" || rowEntryType === "both"

                      const isSelected = selectedRowId === row.id
                      const isLastRow = rowIndex === entryRows.length - 1
                      return (
                        <TableRow 
                          key={row.id}
                          data-state={isSelected ? "selected" : undefined}
                          onClick={(e) => {
                            const target = e.target as HTMLElement
                            // If clicking on interactive elements, don't select
                            if (
                              target.closest('button') ||
                              target.closest('input') ||
                              target.closest('textarea') ||
                              target.closest('select') ||
                              target.closest('[role="combobox"]') ||
                              target.closest('[role="textbox"]') ||
                              target.closest('a') ||
                              target.closest('label') ||
                              target.closest('[contenteditable]')
                            ) {
                              return
                            }
                            // If clicking on a cell (td), select the row
                            if (target.closest('td')) {
                              setSelectedRowId(row.id)
                              e.stopPropagation()
                            }
                          }}
                          className="cursor-pointer hover:bg-transparent"
                        >
                          <TableCell className="px-3 py-2 align-middle" style={{ overflow: 'hidden' }}>
                            <div
                              ref={entryRows[entryRows.length - 1]?.id === row.id ? lastRowFirstCellRef : undefined}
                              data-row-index={rowIndex}
                              style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}
                            >
                              <ComboboxSelect
                                items={accounts.map((a) => ({ label: a.name, value: a.id }))}
                                value={row.account_id}
                                onValueChange={(v) => handleRowAccountChange(row.id, v)}
                                placeholder="Hesap seçin..."
                                emptyMessage="Hesap bulunamadı."
                                portal={false}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-2 align-top overflow-hidden">
                            <div className="w-full">
                              <StatementAutocomplete
                                placeholder="Açıklama"
                                value={row.statement}
                                onValueChange={(v) => updateRow(row.id, "statement", v)}
                                suggestions={statementSuggestions}
                                rows={1}
                                autoResize
                                maxRows={4}
                                className="w-full"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-2 align-middle overflow-hidden">
                            <ToggleGroup
                              type="single"
                              variant="outline"
                              value={row.type}
                              onValueChange={(v) => {
                                if (v) updateRow(row.id, "type", v)
                              }}
                              className="w-full"
                            >
                              <ToggleGroupItem
                                value="debt"
                                className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                                disabled={!rowAllowDebt}
                              >
                                Borç
                              </ToggleGroupItem>
                              <ToggleGroupItem
                                value="receivable"
                                className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                                disabled={!rowAllowReceivable}
                              >
                                Alacak
                              </ToggleGroupItem>
                            </ToggleGroup>
                          </TableCell>
                          <TableCell className="px-3 py-2 align-middle overflow-hidden">
                            <CurrencyInput
                              value={row.amount}
                              onValueChange={(v) => updateRow(row.id, "amount", v)}
                              onKeyDown={(e) => {
                                if (e.key === "Tab" && !e.shiftKey) {
                                  e.preventDefault()
                                  if (isLastRow) {
                                    // Last row, last column: add new row
                                    addRow()
                                  } else {
                                    // Not last row: focus next row's first column (Account combobox)
                                    const nextRowIndex = rowIndex + 1
                                    const nextRowFirstCell = document.querySelector(`[data-row-index="${nextRowIndex}"]`)
                                    const nextRowComboboxTrigger = nextRowFirstCell?.querySelector<HTMLButtonElement>('button[role="combobox"]')
                                    nextRowComboboxTrigger?.focus()
                                  }
                                }
                              }}
                              placeholder="0,00"
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-2 align-middle text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRow(row.id)}
                              disabled={entryRows.length === 1}
                              className="size-8 text-muted-foreground hover:text-destructive"
                            >
                              <IconTrash className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                  </table>
                </div>
                <div className="border-t bg-muted shrink-0">
                  <table
                    className="w-full caption-bottom text-sm"
                    style={{ tableLayout: 'fixed', width: '100%' }}
                  >
                    <colgroup>
                      <col style={{ width: '27%' }} />
                      <col style={{ width: '38%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '5%' }} />
                    </colgroup>
                    <tbody>
                      <TableRow className="hover:bg-transparent border-0">
                        <TableCell className="px-3 py-2" />
                        <TableCell className="px-3 py-2" />
                        <TableCell className="px-3 py-2 text-right font-medium">
                          Genel Toplam
                        </TableCell>
                        <TableCell className="px-3 py-2 text-left font-medium">
                          {formatCurrency(
                            createDialogTotals.totalReceivable -
                              createDialogTotals.totalDebt
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2" />
                      </TableRow>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Balance Preview Container */}
            <div className="mt-4 flex flex-col space-y-3">
              <div className="shrink-0">
                <Label>Bakiye Bilgisi</Label>
              </div>
              <div className="px-6 py-5 rounded-md border bg-muted/50">
                <div className="w-full flex items-start justify-between gap-8">
                  {/* Left: Hesap */}
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium text-muted-foreground text-left">Hesap</div>
                    <div className="text-sm font-medium text-left">
                      {selectedRowAccount?.name || (
                        <span className="text-muted-foreground">Bir hesap seçin</span>
                      )}
                    </div>
                  </div>
                  {/* Right: Güncel Bakiye, Değişim, Yeni Bakiye */}
                  <div className="flex items-start gap-12 flex-shrink-0">
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <div className="text-sm font-medium text-muted-foreground text-left">Güncel Bakiye</div>
                      <div className="text-sm font-medium text-left">
                        {selectedRowAccount && currentAccountBalance !== null ? (
                          formatCurrency(currentAccountBalance)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      <div className="text-sm font-medium text-muted-foreground text-left">Değişim</div>
                      <div className="text-left">
                        {selectedRowAccount && currentAccountBalance !== null ? (
                          <Badge 
                            variant={pendingChangesForSelectedAccount >= 0 ? "default" : "destructive"}
                            className={pendingChangesForSelectedAccount >= 0 ? "bg-green-500 text-white hover:bg-green-600" : ""}
                          >
                            {pendingChangesForSelectedAccount >= 0 ? "+" : ""}{formatCurrency(pendingChangesForSelectedAccount)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <div className="text-sm font-medium text-muted-foreground text-left">Yeni Bakiye</div>
                      <div className="text-sm font-semibold text-left">
                        {selectedRowAccount && currentAccountBalance !== null ? (
                          formatCurrency(currentAccountBalance + pendingChangesForSelectedAccount)
                        ) : (
                          <span className="text-muted-foreground font-normal">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleCreateDialogOpenChange(false)}
            >
              İptal
            </Button>
            <Button
              onClick={handleCreate}
              loading={isSubmitting}
              disabled={!hasValidRow}
            >
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kaydı Düzenle</DialogTitle>
            <DialogDescription>
              Defter kaydını güncelleyin.
            </DialogDescription>
          </DialogHeader>
          {renderEntryForm(true)}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              İptal
            </Button>
            <Button onClick={handleEdit} loading={isSubmitting}>
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu defter kaydını silmek istediğinizden emin misiniz? Bu işlem geri
              alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
