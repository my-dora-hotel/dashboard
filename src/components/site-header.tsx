"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const pageTitles: Record<string, string> = {
  "/muhasebe": "Genel Bakış",
  "/muhasebe/defter": "Defter",
  "/muhasebe/kategoriler": "Kategoriler",
  "/muhasebe/hesaplar": "Hesaplar",
  "/dashboard": "Dashboard",
}

// Modül isimleri - route prefix'ine göre
const moduleNames: Record<string, string> = {
  "/muhasebe": "Muhasebe",
  "/dashboard": "Dashboard",
}

function getModuleName(pathname: string): string | null {
  // En uzun eşleşen prefix'i bul
  const matchingPrefixes = Object.keys(moduleNames).filter((prefix) =>
    pathname.startsWith(prefix)
  )
  
  if (matchingPrefixes.length === 0) return null
  
  // En uzun eşleşeni seç (daha spesifik olan)
  const bestMatch = matchingPrefixes.reduce((a, b) =>
    a.length > b.length ? a : b
  )
  
  return moduleNames[bestMatch]
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || "My Dora"
  const moduleName = getModuleName(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {moduleName && (
            <span className="text-sm text-muted-foreground hidden sm:flex">
              {moduleName}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
