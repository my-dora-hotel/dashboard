"use client"

import * as React from "react"
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconLayoutColumns,
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
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
import { CategoryCombobox } from "@/components/category-combobox"
import { AccountCombobox } from "@/components/account-combobox"
import { createClient } from "@/lib/supabase/client"
import {
  Category,
  AccountWithCategory,
  LedgerEntryWithRelations,
} from "@/types/database"

interface LedgerDataTableProps {
  initialData: LedgerEntryWithRelations[]
  categories: Category[]
  accounts: AccountWithCategory[]
  onRefresh: () => void
  onEntryAdded?: (entry: LedgerEntryWithRelations) => void
  onEntryDeleted?: (entryId: string) => void
  isCreateDialogOpen?: boolean
  setIsCreateDialogOpen?: (open: boolean) => void
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
  onRefresh,
  onEntryAdded,
  onEntryDeleted,
  isCreateDialogOpen: externalCreateDialogOpen,
  setIsCreateDialogOpen: externalSetCreateDialogOpen,
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

  const supabase = createClient()

  React.useEffect(() => {
    setData(initialData)
  }, [initialData])

  const handleAccountChange = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId)
    if (account) {
      setFormData(prev => ({
        ...prev,
        account_id: accountId,
        category_id: account.category_id,
      }))
    }
  }

  const resetForm = () => {
    setFormData(initialFormData)
  }

  const handleCreate = async () => {
    if (
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
      const { data: newEntry, error } = await supabase
        .from("ledger_entries")
        .insert({
          date: format(formData.date, "yyyy-MM-dd"),
          category_id: formData.category_id,
          account_id: formData.account_id,
          statement: formData.statement || null,
          receivable: formData.type === "receivable" ? amount : 0,
          debt: formData.type === "debt" ? amount : 0,
        })
        .select("*, categories(*), accounts(*)")
        .single()

      if (error) throw error
      if (!newEntry) throw new Error("Kayıt oluşturulamadı")

      const entryWithRelations = newEntry as LedgerEntryWithRelations

      // Optimistic update: Add to local state immediately
      setData((prev) => [entryWithRelations, ...prev])
      
      // Mark as new row for animation
      setNewRowIds((prev) => new Set([...prev, entryWithRelations.id]))
      
      // Remove animation class after animation completes
      setTimeout(() => {
        setNewRowIds((prev) => {
          const next = new Set(prev)
          next.delete(entryWithRelations.id)
          return next
        })
      }, 500)

      // Notify parent component for totals and chart updates
      if (onEntryAdded) {
        onEntryAdded(entryWithRelations)
      }

      toast.success("Kayıt başarıyla oluşturuldu")
      setIsCreateDialogOpen(false)
      resetForm()
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
                Düzenle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => openDeleteDialog(row.original)}
              >
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

  const renderEntryForm = (isEdit: boolean = false) => (
    <div className="space-y-6 py-6">
      <div className="space-y-2">
        <Label>Tarih</Label>
        <DatePicker
          date={formData.date}
          onDateChange={(date) => setFormData(prev => ({ ...prev, date }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Hesap</Label>
        <AccountCombobox
          accounts={accounts}
          value={formData.account_id}
          onValueChange={handleAccountChange}
        />
        <p className="text-xs text-muted-foreground">
          Kategori hesap seçimine göre otomatik belirlenir
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-statement" : "statement"}>
          Açıklama (İsteğe bağlı)
        </Label>
        <Textarea
          id={isEdit ? "edit-statement" : "statement"}
          placeholder="İşlem açıklaması"
          value={formData.statement}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, statement: e.target.value }))
          }
          rows={4}
          className="resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
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
            <ToggleGroupItem value="receivable" className="flex-1">
              Alacak
            </ToggleGroupItem>
            <ToggleGroupItem value="debt" className="flex-1">
              Borç
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-2">
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
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconLayoutColumns />
                  <span className="hidden lg:inline">Sütunlar</span>
                  <IconChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" &&
                      column.getCanHide()
                  )
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
                        <TableHead className="text-right">Alacak</TableHead>
                        <TableHead className="text-right">Borç</TableHead>
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
                            {entry.receivable > 0
                              ? formatCurrency(entry.receivable)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.debt > 0 ? formatCurrency(entry.debt) : "-"}
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
                                  Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => openDeleteDialog(entry)}
                                >
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
                          {formatCurrency(group.totalReceivable)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(group.totalDebt)}
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

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Defter Kaydı</DialogTitle>
            <DialogDescription>
              Yeni bir alacak veya borç kaydı ekleyin.
            </DialogDescription>
          </DialogHeader>
          {renderEntryForm(false)}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              İptal
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Oluşturuluyor..." : "Oluştur"}
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
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? "Güncelleniyor..." : "Güncelle"}
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
