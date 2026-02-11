"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ReportsListTable } from "@/components/reports/reports-list-table"
import type { UserProfile } from "@/components/reports/reports-list-table"
import { CreateReportDialog } from "@/components/reports/create-report-dialog"
import type { Report } from "@/types/reports"
import type { AccountWithCategory, Category } from "@/types/database"
import { toast } from "sonner"

const REPORTS_CACHE_KEY = "accounting_reports_list_cache"

interface ReportsCache {
  reports: Report[]
  currentUserId: string
  userProfiles: Record<string, UserProfile>
  categories: Category[]
  accounts: AccountWithCategory[]
}

function loadReportsCache(): ReportsCache | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(REPORTS_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ReportsCache
  } catch {
    return null
  }
}

function saveReportsCache(data: ReportsCache): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export default function ReportsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reports, setReports] = useState<Report[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<AccountWithCategory[]>([])
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})
  const supabase = createClient()

  const fetchReports = useCallback(async () => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setCurrentUserId(user.id)

      const [reportsRes, categoriesRes, accountsRes] = await Promise.all([
        supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("id"),
        supabase.from("accounts").select("*, categories(*)").order("name"),
      ])

      if (reportsRes.error) throw reportsRes.error

      const reportsData = (reportsRes.data || []) as unknown as Report[]
      setReports(reportsData)
      const categoriesData = categoriesRes.data || []
      const accountsData = (accountsRes.data || []) as AccountWithCategory[]
      setCategories(categoriesData)
      setAccounts(accountsData)

      // Fetch unique user profiles for report creators
      const uniqueUserIds = [...new Set(reportsData.map((r) => r.user_id))]
      let profileMap: Record<string, UserProfile> = {}
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .in("id", uniqueUserIds)

        if (profiles) {
          for (const p of profiles) {
            profileMap[p.id] = {
              firstName: p.first_name || null,
              lastName: p.last_name || null,
              avatarUrl: p.avatar_url || null,
            }
          }
          setUserProfiles(profileMap)
        }
      }

      saveReportsCache({
        reports: reportsData,
        currentUserId: user.id,
        userProfiles: profileMap,
        categories: categoriesData,
        accounts: accountsData,
      })
    } catch {
      toast.error("Raporlar yüklenirken bir hata oluştu")
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    const fromDetail = searchParams.get("from") === "detail"
    if (fromDetail) {
      const cached = loadReportsCache()
      if (cached) {
        setReports(cached.reports)
        setCurrentUserId(cached.currentUserId)
        setUserProfiles(cached.userProfiles)
        setCategories(cached.categories)
        setAccounts(cached.accounts)
        setIsLoading(false)
        router.replace("/accounting/reports", { scroll: false })
        return
      }
    }
    fetchReports()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 px-4 lg:px-6">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <IconPlus className="size-4" />
          Rapor
        </Button>
      </div>

      <ReportsListTable
        reports={reports}
        currentUserId={currentUserId}
        userProfiles={userProfiles}
        onRefresh={fetchReports}
      />

      <CreateReportDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        accounts={accounts}
        categories={categories}
      />
    </div>
  )
}
