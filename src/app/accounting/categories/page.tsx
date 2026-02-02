"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Category } from "@/types/database"
import {
  IconDotsVertical,
  IconPlus,
  IconX,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { normalizeForSearch } from "@/lib/search-utils"

const ENTRY_TYPE_OPTIONS: { value: "debt" | "receivable" | "both"; label: string }[] = [
  { value: "debt", label: "Borç" },
  { value: "receivable", label: "Alacak" },
  { value: "both", label: "Borç & Alacak" },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<{
    id: string
    name: string
    entry_type: "debt" | "receivable" | "both"
    advance_period_weeks: number | ""
  }>({ id: "", name: "", entry_type: "both", advance_period_weeks: "" })
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
    const query = normalizeForSearch(searchQuery)
    return categories.filter((category) => {
      const matchesId = normalizeForSearch(category.id).includes(query)
      const matchesName = normalizeForSearch(category.name).includes(query)
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
      const advancePeriodDays =
        formData.advance_period_weeks === ""
          ? null
          : Number(formData.advance_period_weeks) * 7

      const { error } = await supabase.from("categories").insert({
        id: formData.id,
        name: formData.name,
        entry_type: formData.entry_type,
        advance_period_days: advancePeriodDays,
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
      setFormData({ id: "", name: "", entry_type: "both", advance_period_weeks: "" })
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
      const advancePeriodDays =
        formData.advance_period_weeks === ""
          ? null
          : Number(formData.advance_period_weeks) * 7

      const updatePayload: {
        name: string
        entry_type?: "debt" | "receivable" | "both"
        advance_period_days?: number | null
      } = {
        name: formData.name,
        advance_period_days: advancePeriodDays,
      }
      if ("entry_type" in selectedCategory && selectedCategory.entry_type !== undefined) {
        updatePayload.entry_type = formData.entry_type
      }

      const { error } = await supabase
        .from("categories")
        .update(updatePayload)
        .eq("id", selectedCategory.id)

      if (error) throw error

      toast.success("Kategori başarıyla güncellendi")
      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      setFormData({ id: "", name: "", entry_type: "both", advance_period_weeks: "" })
      fetchCategories()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kategori güncellenirken bir hata oluştu"
      toast.error(message)
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
    const advanceWeeks =
      category.advance_period_days != null
        ? Math.round(category.advance_period_days / 7)
        : ""
    setFormData({
      id: category.id,
      name: category.name,
      entry_type: category.entry_type ?? "both",
      advance_period_weeks: advanceWeeks,
    })
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
              onClick={() => setFormData({ id: "", name: "", entry_type: "both", advance_period_weeks: "" })}
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
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="code">Kod</Label>
                  <Input
                    id="code"
                    placeholder="Örn: 102"
                    value={formData.id}
                    onChange={(e) =>
                      setFormData({ ...formData, id: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="name">Ad</Label>
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
              <div className="space-y-3">
                <Label htmlFor="entry_type">İşlem Türü</Label>
                <Select
                  value={formData.entry_type}
                  onValueChange={(value: "debt" | "receivable" | "both") =>
                    setFormData({ ...formData, entry_type: value })
                  }
                >
                  <SelectTrigger id="entry_type" className="w-full">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Bu kategorideki hesaplar için Defter kaydında yalnızca seçilen
                  tür (Borç / Alacak) kullanılabilir.
                </p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="advance_period_weeks">Avans süresi (hafta)</Label>
                <Input
                  id="advance_period_weeks"
                  type="number"
                  min={0}
                  placeholder="Örn: 2"
                  value={formData.advance_period_weeks === "" ? "" : formData.advance_period_weeks}
                  onChange={(e) => {
                    const v = e.target.value
                    setFormData({
                      ...formData,
                      advance_period_weeks: v === "" ? "" : Number(v),
                    })
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  İsteğe bağlı. Bu kategorideki işlemlerin ne kadar süre önceden
                  planlanabileceğini (hafta cinsinden) belirtir.
                </p>
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
                <TableHead>İşlem Türü</TableHead>
                <TableHead>Avans süresi</TableHead>
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
                    <Badge variant="outline" className="text-muted-foreground px-1.5">
                      {ENTRY_TYPE_OPTIONS.find((o) => o.value === (category.entry_type ?? "both"))?.label ?? "Borç & Alacak"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.advance_period_days != null
                      ? `${Math.round(category.advance_period_days / 7)} hafta`
                      : "—"}
                  </TableCell>
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
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Kategoriyi Düzenle</DialogTitle>
            <DialogDescription>
              Kategori adını güncelleyin. Kategori kodu değiştirilemez.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="edit-code">Kod</Label>
                <Input id="edit-code" value={formData.id} disabled />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-name">Ad</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-entry_type">İşlem Türü</Label>
              <Select
                value={formData.entry_type}
                onValueChange={(value: "debt" | "receivable" | "both") =>
                  setFormData({ ...formData, entry_type: value })
                }
              >
                <SelectTrigger id="edit-entry_type" className="w-full">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Bu kategorideki hesaplar için Defter kaydında yalnızca seçilen
                tür kullanılabilir.
              </p>
            </div>
            <div className="space-y-3">
              <Label htmlFor="edit-advance_period_weeks">Avans süresi (hafta)</Label>
              <Input
                id="edit-advance_period_weeks"
                type="number"
                min={0}
                placeholder="Örn: 2"
                value={formData.advance_period_weeks === "" ? "" : formData.advance_period_weeks}
                onChange={(e) => {
                  const v = e.target.value
                  setFormData({
                    ...formData,
                    advance_period_weeks: v === "" ? "" : Number(v),
                  })
                }}
              />
              <p className="text-xs text-muted-foreground">
                İsteğe bağlı. Bu kategorideki işlemlerin ne kadar süre önceden
                planlanabileceğini (hafta cinsinden) belirtir.
              </p>
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
