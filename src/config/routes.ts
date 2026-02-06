import {
  IconBook,
  IconCategory,
  IconUsers,
} from "@tabler/icons-react"
import { type Icon } from "@tabler/icons-react"

/**
 * Route configuration for navigation and page titles.
 * Single source of truth for all route metadata.
 */
export interface RouteConfig {
  /** URL path */
  path: string
  /** Display title for navigation and page header */
  title: string
  /** Icon component for sidebar navigation */
  icon?: Icon
  /** Whether this route should appear in sidebar navigation */
  showInNav?: boolean
  /** Order in navigation (lower numbers appear first) */
  navOrder?: number
  /** Module/group name for navigation grouping */
  module?: string
}

/**
 * All application routes with their metadata.
 * This is the single source of truth for route titles and navigation.
 */
export const routes: RouteConfig[] = [
  {
    path: "/accounting/ledger",
    title: "Kayıtlar",
    icon: IconBook,
    showInNav: true,
    navOrder: 1,
    module: "Muhasebe",
  },
  {
    path: "/accounting/categories",
    title: "Ana Hesaplar",
    icon: IconCategory,
    showInNav: true,
    navOrder: 2,
    module: "Muhasebe",
  },
  {
    path: "/accounting/accounts",
    title: "Alt Hesaplar",
    icon: IconUsers,
    showInNav: true,
    navOrder: 3,
    module: "Muhasebe",
  },
  {
    path: "/accounting",
    title: "Genel Bakış",
    showInNav: false,
    module: "Muhasebe",
  },
  {
    path: "/dashboard",
    title: "Dashboard",
    showInNav: false,
    module: "Dashboard",
  },
]

/**
 * Get route config by path
 */
export function getRouteByPath(path: string): RouteConfig | undefined {
  return routes.find((route) => route.path === path)
}

/**
 * Get page title by path
 */
export function getPageTitle(path: string): string {
  return getRouteByPath(path)?.title || "My Dora"
}

/**
 * Get all routes for a specific module
 */
export function getRoutesByModule(module: string): RouteConfig[] {
  return routes.filter((route) => route.module === module)
}

/**
 * Get navigation items (routes that should appear in sidebar)
 */
export function getNavigationItems(module?: string): RouteConfig[] {
  const navRoutes = routes.filter(
    (route) => route.showInNav && (module ? route.module === module : true)
  )
  return navRoutes.sort((a, b) => (a.navOrder || 999) - (b.navOrder || 999))
}

/**
 * Get module name by path
 */
export function getModuleByPath(pathname: string): string | null {
  // Find longest matching prefix
  const matchingRoutes = routes.filter((route) =>
    pathname.startsWith(route.path)
  )

  if (matchingRoutes.length === 0) return null

  // Pick longest match (most specific)
  const bestMatch = matchingRoutes.reduce((a, b) =>
    a.path.length > b.path.length ? a : b
  )

  return bestMatch.module || null
}
