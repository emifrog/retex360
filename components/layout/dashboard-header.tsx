"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Bell, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  showSearch?: boolean
  showNewRex?: boolean
}

export function DashboardHeader({
  title,
  subtitle,
  showSearch = true,
  showNewRex = true,
}: DashboardHeaderProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/rex?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
        </div>
        <div className="flex items-center space-x-4">
          {showSearch && (
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Rechercher un REX..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80 pl-10 pr-4 py-2"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </form>
          )}
          <button className="p-2 hover:bg-gray-100 rounded-lg relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {showNewRex && (
            <Link href="/rex/new">
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau REX
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
