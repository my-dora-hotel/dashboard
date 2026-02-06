"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { IconBuildingBank } from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getNavigationItems } from "@/config/routes"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()

  // Prevent hydration mismatch by only rendering theme toggle after mount
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Get navigation items from route config
  const navItems = getNavigationItems("Muhasebe").map((route) => ({
    title: route.title,
    url: route.path,
    icon: route.icon,
  }))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/accounting/ledger">
                <IconBuildingBank className="!size-5" />
                <span className="text-base font-semibold">My Dora</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} label="Muhasebe" />
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Tema</SidebarGroupLabel>
          <SidebarGroupContent>
            <ToggleGroup
              type="single"
              value={mounted ? theme ?? "system" : undefined}
              onValueChange={(v) => v && setTheme(v)}
              className="w-full group-data-[collapsible=icon]:hidden"
              size="xs"
              variant="outline"
            >
              <ToggleGroupItem value="dark" className="flex-1">
                Dark
              </ToggleGroupItem>
              <ToggleGroupItem value="light" className="flex-1">
                Light
              </ToggleGroupItem>
              <ToggleGroupItem value="system" className="flex-1">
                System
              </ToggleGroupItem>
            </ToggleGroup>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
