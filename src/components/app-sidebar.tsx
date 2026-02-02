"use client"

import * as React from "react"
import {
  IconBook,
  IconBuildingBank,
  IconCategory,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navMain = [
  {
    title: "Kayıtlar",
    url: "/accounting/ledger",
    icon: IconBook,
  },
  {
    title: "Kategoriler",
    url: "/accounting/categories",
    icon: IconCategory,
  },
  {
    title: "Hesaplar",
    url: "/accounting/accounts",
    icon: IconUsers,
  },
]

const navSecondary = [
  {
    title: "Ayarlar",
    url: "#",
    icon: IconSettings,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavMain items={navMain} label="Muhasebe" />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
