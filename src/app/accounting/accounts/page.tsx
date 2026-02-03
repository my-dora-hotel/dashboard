"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Account, Category, AccountWithCategory } from "@/types/database"
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconDotsVertical,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { CategoryCombobox } from "@/components/category-combobox"
import { normalizeForSearch } from "@/lib/search-utils"
import { toast } from "sonner"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount)
}

interface AccountFormData {
  category_id: string
  name: string
  description: string
}

type LedgerRow = { account_id: string; receivable: number; debt: number }

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<LedgerRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterCategoryId, setFilterCategoryId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [sortColumn, setSortColumn] = useState<"receivable" | "debt" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState<AccountFormData>({
    category_id: "",
    name: "",
    description: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [accountsRes, categoriesRes, entriesRes] = await Promise.all([
        supabase.from("accounts").select("*, categories(*)").order("name"),
        supabase.from("categories").select("*").order("id"),
        supabase
          .from("ledger_entries")
          .select("account_id, receivable, debt"),
      ])

      if (accountsRes.error) throw accountsRes.error
      if (categoriesRes.error) throw categoriesRes.error
      if (entriesRes.error) throw entriesRes.error

      setAccounts((accountsRes.data as AccountWithCategory[]) || [])
      setCategories(categoriesRes.data || [])
      setLedgerEntries(entriesRes.data || [])
    } catch {
      toast.error("Veriler yüklenirken bir hata oluştu")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      // Category filter
      if (filterCategoryId && account.category_id !== filterCategoryId) {
        return false
      }
      // Search filter
      if (searchQuery) {
        const query = normalizeForSearch(searchQuery)
        const matchesName = normalizeForSearch(account.name).includes(query)
        const matchesDescription = account.description
          ? normalizeForSearch(account.description).includes(query)
          : false
        const matchesCategory = normalizeForSearch(
          account.categories.name
        ).includes(query)
        if (!matchesName && !matchesDescription && !matchesCategory) {
          return false
        }
      }
      return true
    })
  }, [accounts, filterCategoryId, searchQuery])

  const accountTotals = useMemo(() => {
    const totals: Record<
      string,
      { totalReceivable: number; totalDebt: number }
    > = {}
    for (const entry of ledgerEntries) {
      if (!totals[entry.account_id]) {
        totals[entry.account_id] = { totalReceivable: 0, totalDebt: 0 }
      }
      totals[entry.account_id].totalReceivable += entry.receivable ?? 0
      totals[entry.account_id].totalDebt += entry.debt ?? 0
    }
    return totals
  }, [ledgerEntries])

  const sortedAccounts = useMemo(() => {
    if (!sortColumn) return filteredAccounts

    return [...filteredAccounts].sort((a, b) => {
      const aValue =
        sortColumn === "receivable"
          ? accountTotals[a.id]?.totalReceivable ?? 0
          : accountTotals[a.id]?.totalDebt ?? 0
      const bValue =
        sortColumn === "receivable"
          ? accountTotals[b.id]?.totalReceivable ?? 0
          : accountTotals[b.id]?.totalDebt ?? 0

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    })
  }, [filteredAccounts, accountTotals, sortColumn, sortDirection])

  const toggleSort = (column: "receivable" | "debt") => {
    if (sortColumn === column) {
      if (sortDirection === "desc") {
        setSortDirection("asc")
      } else {
        // Reset sorting
        setSortColumn(null)
        setSortDirection("desc")
      }
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const clearFilters = () => {
    setFilterCategoryId("")
    setSearchQuery("")
  }

  const resetForm = () => {
    setFormData({ category_id: "", name: "", description: "" })
  }

  const handleCreate = async () => {
    if (!formData.category_id || !formData.name) {
      toast.error("Lütfen kategori ve hesap adını girin")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from("accounts").insert({
        category_id: formData.category_id,
        name: formData.name,
        description: formData.description || null,
      })

      if (error) throw error

      toast.success("Hesap başarıyla oluşturuldu")
      setIsCreateDialogOpen(false)
      resetForm()
      fetchData()
    } catch {
      toast.error("Hesap oluşturulurken bir hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedAccount || !formData.category_id || !formData.name) {
      toast.error("Lütfen tüm zorunlu alanları doldurun")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("accounts")
        .update({
          category_id: formData.category_id,
          name: formData.name,
          description: formData.description || null,
        })
        .eq("id", selectedAccount.id)

      if (error) throw error

      toast.success("Hesap başarıyla güncellendi")
      setIsEditDialogOpen(false)
      setSelectedAccount(null)
      resetForm()
      fetchData()
    } catch {
      toast.error("Hesap güncellenirken bir hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAccount) return

    try {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", selectedAccount.id)

      if (error) throw error

      toast.success("Hesap ve ilişkili defter kayıtları silindi")
      setIsDeleteDialogOpen(false)
      setSelectedAccount(null)
      fetchData()
    } catch {
      toast.error("Hesap silinirken bir hata oluştu")
    }
  }

  const openEditDialog = (account: AccountWithCategory) => {
    setSelectedAccount(account)
    setFormData({
      category_id: account.category_id,
      name: account.name,
      description: account.description || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (account: Account) => {
    setSelectedAccount(account)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="search"
            placeholder="Hesap ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[250px]"
          />
          <div className="w-[200px]">
            <CategoryCombobox
              categories={categories}
              value={filterCategoryId}
              onValueChange={setFilterCategoryId}
              placeholder="Tüm kategoriler"
              includeAllOption
            />
          </div>
          {(filterCategoryId || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <IconX className="size-4" />
              Filtreyi Temizle
            </Button>
          )}
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={resetForm}>
              <IconPlus className="size-4" />
              <span className="hidden lg:inline">Hesap</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Hesap Oluştur</DialogTitle>
              <DialogDescription>
                Yeni bir muhasebe hesabı ekleyin ve bir kategoriye atayın.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label>Kategori</Label>
                <CategoryCombobox
                  categories={categories}
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: value })
                  }
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="name">Hesap Adı</Label>
                <Input
                  id="name"
                  placeholder="Örn: Ziraat Bankası"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="description">Açıklama (İsteğe bağlı)</Label>
                <Input
                  id="description"
                  placeholder="Hesap hakkında açıklama"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                İptal
              </Button>
              <Button onClick={handleCreate} loading={isSubmitting}>
                Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            {accounts.length === 0 ? (
              <>
                <p className="text-muted-foreground">Henüz hesap bulunmuyor</p>
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Önce bir kategori oluşturmalısınız
                  </p>
                ) : (
                  <Button
                    variant="link"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    İlk hesabı oluşturun
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? `"${searchQuery}" için sonuç bulunamadı`
                    : "Bu kategoride hesap bulunmuyor"}
                </p>
                <Button variant="link" onClick={clearFilters}>
                  Filtreyi temizle
                </Button>
              </>
            )}
          </div>
        ) : (
          <Table stickyHeader>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead>Hesap Adı</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    className="-mr-3 h-8"
                    onClick={() => toggleSort("receivable")}
                  >
                    Alacak
                    {sortColumn === "receivable" ? (
                      sortDirection === "asc" ? (
                        <IconArrowUp className="ml-2 h-4 w-4" />
                      ) : (
                        <IconArrowDown className="ml-2 h-4 w-4" />
                      )
                    ) : (
                      <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    className="-mr-3 h-8"
                    onClick={() => toggleSort("debt")}
                  >
                    Borç
                    {sortColumn === "debt" ? (
                      sortDirection === "asc" ? (
                        <IconArrowUp className="ml-2 h-4 w-4" />
                      ) : (
                        <IconArrowDown className="ml-2 h-4 w-4" />
                      )
                    ) : (
                      <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {account.categories.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.description || "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(
                      accountTotals[account.id]?.totalReceivable ?? 0
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(accountTotals[account.id]?.totalDebt ?? 0)}
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
                          <span className="sr-only">Menü</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => openEditDialog(account)}>
                          <IconPencil className="mr-2 size-4" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => openDeleteDialog(account)}
                        >
                          <IconTrash className="mr-2 size-4" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hesabı Düzenle</DialogTitle>
            <DialogDescription>Hesap bilgilerini güncelleyin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Kategori</Label>
              <CategoryCombobox
                categories={categories}
                value={formData.category_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: value })
                }
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-name">Hesap Adı</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-description">Açıklama (İsteğe bağlı)</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
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
            <AlertDialogTitle>Hesabı Sil</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                <strong>{selectedAccount?.name}</strong> hesabını silmek
                üzeresiniz.
              </span>
              <span className="block text-destructive font-medium">
                Bu işlem, bu hesaba ait tüm defter kayıtlarını kalıcı olarak
                silecektir.
              </span>
              <span className="block">Bu işlem geri alınamaz.</span>
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
    </div>
  )
}
