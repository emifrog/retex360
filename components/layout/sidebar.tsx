"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  FileText,
  Search,
  BarChart3,
  Users,
  Flame,
  Ambulance,
  MoreVertical,
  LogOut,
  Settings,
  Bell,
} from "lucide-react"
import { LogoutButton } from "@/components/auth/logout-button"

interface SidebarProps {
  user: {
    name: string | null
    email: string
    role: string | null
    sdisCode?: string | null
  }
  rexCount?: number
}

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/rex", label: "Mes REX", icon: FileText, showBadge: true },
  { href: "/recherche", label: "Recherche", icon: Search },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/equipe", label: "Équipe", icon: Users },
]

const favoriteItems = [
  { href: "/rex?category=INCENDIE", label: "Incendies", icon: Flame, color: "text-orange-500" },
  { href: "/rex?category=SECOURS", label: "Secours", icon: Ambulance, color: "text-blue-500" },
]

export function Sidebar({ user, rexCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href.split("?")[0])
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900">REX Platform</div>
            <div className="text-xs text-gray-500">{user.sdisCode || "SDIS"}</div>
          </div>
        </Link>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                active
                  ? "bg-red-50 text-red-700 border-l-3 border-red-500"
                  : "text-gray-700 hover:bg-gray-100"
              )}
              style={active ? { borderLeftWidth: "3px", borderLeftColor: "#ef4444" } : {}}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.showBadge && rexCount > 0 && (
                <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                  {rexCount}
                </span>
              )}
            </Link>
          )
        })}

        {/* Favoris */}
        <div className="pt-4 border-t border-gray-200 mt-4">
          <div className="text-xs font-semibold text-gray-400 px-4 mb-2 uppercase">
            Favoris
          </div>
          {favoriteItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                  active
                    ? "bg-red-50 text-red-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                style={active ? { borderLeftWidth: "3px", borderLeftColor: "#ef4444" } : {}}
              >
                <Icon className={cn("w-5 h-5", item.color)} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
            {user.name?.substring(0, 2).toUpperCase() || user.email.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {user.name || user.email}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {user.role?.toLowerCase() || "Agent"}
            </div>
          </div>
          <MoreVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="mt-2">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
