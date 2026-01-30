"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Category } from "@/types/database"
import {
  IconDotsVertical,
  IconPlus,
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
import { toast } from "sonner"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ id: "", name: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("id")

      if (error) throw error
      setCategories(data || [])
    } catch {
      toast.error("Kategoriler yüklenirken bir hata oluştu")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories
    const query = searchQuery.toLowerCase()
    return categories.filter((category) => {
      const matchesId = category.id.toLowerCase().includes(query)
      const matchesName = category.name.toLowerCase().includes(query)
      return matchesId || matchesName
    })
  }, [categories, searchQuery])

  const clearFilters = () => {
    setSearchQuery("")
  }

  const handleCreate = async () => {
    if (!formData.id || !formData.name) {
      toast.error("Lütfen tüm alanları doldurun")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from("categories").insert({
        id: formData.id,
        name: formData.name,
      })

      if (error) {
        if (error.code === "23505") {
          toast.error("Bu kategori kodu zaten mevcut")
        } else {
          throw error
        }
        return
      }

      toast.success("Kategori başarıyla oluşturuldu")
      setIsCreateDialogOpen(false)
      setFormData({ id: "", name: "" })
      fetchCategories()
    } catch {
      toast.error("Kategori oluşturulurken bir hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedCategory || !formData.name) {
      toast.error("Lütfen tüm alanları doldurun")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("categories")
        .update({ name: formData.name })
        .eq("id", selectedCategory.id)

      if (error) throw error

      toast.success("Kategori başarıyla güncellendi")
      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      setFormData({ id: "", name: "" })
      fetchCategories()
    } catch {
      toast.error("Kategori güncellenirken bir hata oluştu")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCategory) return

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", selectedCategory.id)

      if (error) throw error

      toast.success("Kategori ve ilişkili tüm veriler silindi")
      setIsDeleteDialogOpen(false)
      setSelectedCategory(null)
      fetchCategories()
    } catch {
      toast.error("Kategori silinirken bir hata oluştu")
    }
  }

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category)
    setFormData({ id: category.id, name: category.name })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="search"
            placeholder="Kategori ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[250px]"
          />
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <IconX className="size-4" />
              Filtreyi Temizle
            </Button>
          )}
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => setFormData({ id: "", name: "" })}
            >
              <IconPlus className="size-4" />
              <span className="hidden lg:inline">Yeni Kategori</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Kategori Oluştur</DialogTitle>
              <DialogDescription>
                Yeni bir muhasebe kategorisi ekleyin. Kod alanı resmi muhasebe
                kodunu temsil eder.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kategori Kodu</Label>
                <Input
                  id="code"
                  placeholder="Örn: 102"
                  value={formData.id}
                  onChange={(e) =>
                    setFormData({ ...formData, id: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Kategori Adı</Label>
                <Input
                  id="name"
                  placeholder="Örn: Banka"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
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

      <div className="rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            {categories.length === 0 ? (
              <>
                <p className="text-muted-foreground">Henüz kategori bulunmuyor</p>
                <Button
                  variant="link"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  İlk kategoriyi oluşturun
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  &quot;{searchQuery}&quot; için sonuç bulunamadı
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
                <TableHead>Kod</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Oluşturulma Tarihi</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-mono font-medium">
                    {category.id}
                  </TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>
                    {new Date(category.created_at).toLocaleDateString("tr-TR")}
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
                        <DropdownMenuItem onClick={() => openEditDialog(category)}>
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => openDeleteDialog(category)}
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
            <DialogTitle>Kategoriyi Düzenle</DialogTitle>
            <DialogDescription>
              Kategori adını güncelleyin. Kategori kodu değiştirilemez.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Kategori Kodu</Label>
              <Input id="edit-code" value={formData.id} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Kategori Adı</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
          </div>
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
            <AlertDialogTitle>Kategoriyi Sil</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                <strong>{selectedCategory?.name}</strong> ({selectedCategory?.id})
                kategorisini silmek üzeresiniz.
              </span>
              <span className="block text-destructive font-medium">
                Bu işlem, bu kategoriye ait tüm hesapları ve defter kayıtlarını
                kalıcı olarak silecektir.
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
