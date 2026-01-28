"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Account, Category, AccountWithCategory } from "@/types/database"
import {
  IconDotsVertical,
  IconPlus,
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
import { toast } from "sonner"

interface AccountFormData {
  category_id: string
  name: string
  description: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
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
      const [accountsRes, categoriesRes] = await Promise.all([
        supabase.from("accounts").select("*, categories(*)").order("name"),
        supabase.from("categories").select("*").order("id"),
      ])

      if (accountsRes.error) throw accountsRes.error
      if (categoriesRes.error) throw categoriesRes.error

      setAccounts((accountsRes.data as AccountWithCategory[]) || [])
      setCategories(categoriesRes.data || [])
    } catch {
      toast.error("Veriler yüklenirken bir hata oluştu")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">Muhasebe hesaplarını yönetin</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={resetForm}>
              <IconPlus className="size-4" />
              <span className="hidden lg:inline">Yeni Hesap</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Hesap Oluştur</DialogTitle>
              <DialogDescription>
                Yeni bir muhasebe hesabı ekleyin ve bir kategoriye atayın.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <CategoryCombobox
                  categories={categories}
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: value })
                  }
                />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? "Oluşturuluyor..." : "Oluştur"}
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
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
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
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Hesap Adı</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Oluşturulma Tarihi</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {account.categories.id} - {account.categories.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.description || "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(account.created_at).toLocaleDateString("tr-TR")}
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
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => openDeleteDialog(account)}
                        >
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <CategoryCombobox
                categories={categories}
                value={formData.category_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Hesap Adı</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
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
