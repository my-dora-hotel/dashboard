"use client"

import * as React from "react"
import { IconChevronRight, IconDotsVertical, IconShare, IconTrash } from "@tabler/icons-react"
import { format, parseISO } from "date-fns"
import { tr } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { ShareDialog } from "./share-dialog"
import { createClient } from "@/lib/supabase/client"
import type { Report } from "@/types/reports"

export interface UserProfile {
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
}

interface ReportsListTableProps {
  reports: Report[]
  currentUserId: string
  userProfiles: Record<string, UserProfile>
  onRefresh: () => void
}

function getUserDisplayName(profile: UserProfile | undefined): string {
  if (!profile) return "Bilinmeyen"
  if (profile.firstName || profile.lastName) {
    return `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
  }
  return "Bilinmeyen"
}

function getUserInitials(profile: UserProfile | undefined): string {
  if (!profile) return "?"
  if (profile.firstName && profile.lastName) {
    return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
  }
  if (profile.firstName) {
    return profile.firstName.slice(0, 2).toUpperCase()
  }
  return "?"
}

export function ReportsListTable({
  reports,
  currentUserId,
  userProfiles,
  onRefresh,
}: ReportsListTableProps) {
  const router = useRouter()
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false)
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [reportToDelete, setReportToDelete] = React.useState<Report | null>(null)
  const supabase = createClient()

  const handleDelete = async () => {
    if (!reportToDelete) return

    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportToDelete.id)

      if (error) throw error

      toast.success("Rapor başarıyla silindi")
      setDeleteDialogOpen(false)
      setReportToDelete(null)
      onRefresh()
    } catch (error) {
      toast.error("Rapor silinirken bir hata oluştu")
    }
  }

  const getReportTypeLabel = (type: string) => {
    return type === "account_statement" ? "Hesap Ekstresi" : "Hesap Özeti"
  }

  const formatDateRange = (params: any) => {
    try {
      const startDate = format(parseISO(params.startDate), "dd.MM.yyyy", {
        locale: tr,
      })
      const endDate = format(parseISO(params.endDate), "dd.MM.yyyy", {
        locale: tr,
      })
      return `${startDate} - ${endDate}`
    } catch {
      return "-"
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Başlık</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead>Tarih Aralığı</TableHead>
              <TableHead>Oluşturan</TableHead>
              <TableHead>Oluşturulma</TableHead>
              <TableHead className="text-right"><span className="sr-only">İşlemler</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Rapor bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => {
                const canDelete = report.user_id === currentUserId
                return (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getReportTypeLabel(report.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateRange(report.parameters)}</TableCell>
                    <TableCell>
                      {(() => {
                        const profile = userProfiles[report.user_id]
                        const displayName = getUserDisplayName(profile)
                        const initials = getUserInitials(profile)
                        return (
                          <Badge variant="outline" className="gap-2 py-1 pl-1 pr-3">
                            <Avatar className="size-5">
                              <AvatarImage
                                src={profile?.avatarUrl || undefined}
                                alt={displayName}
                              />
                              <AvatarFallback className="text-[10px]">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {displayName}
                          </Badge>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(report.created_at), "dd MMM yyyy", {
                        locale: tr,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="data-[state=open]:bg-muted text-muted-foreground size-8"
                              size="icon"
                            >
                              <IconDotsVertical />
                              <span className="sr-only">Diğer işlemler</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedReportId(report.id)
                                setShareDialogOpen(true)
                              }}
                            >
                              <IconShare className="mr-2 size-4" />
                              Paylaş
                            </DropdownMenuItem>
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    setReportToDelete(report)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <IconTrash className="mr-2 size-4" />
                                  Sil
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          className="text-muted-foreground size-8"
                          size="icon"
                          onClick={() =>
                            router.push(`/accounting/reports/${report.id}`)
                          }
                        >
                          <IconChevronRight />
                          <span className="sr-only">Rapora git</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        reportId={selectedReportId || ""}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Raporu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu raporu silmek istediğinizden emin misiniz? Bu işlem geri
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
