'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Star,
  BarChart3,
  CheckCircle,
  Settings,
  Sparkles,
} from 'lucide-react';

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Liste REX', href: '/rex', icon: FileText },
  { name: 'Nouveau REX', href: '/rex/new', icon: PlusCircle },
  { name: 'Favoris', href: '/favorites', icon: Star },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

const adminNavigation = [
  { name: 'Validation', href: '/validation', icon: CheckCircle, badge: true },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

interface SidebarProps {
  pendingCount?: number;
  isAdmin?: boolean;
}

export function Sidebar({ pendingCount = 0, isAdmin = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-red-900 rounded-lg flex items-center justify-center shadow-lg shadow-primary/30 border border-white/10">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-primary bg-clip-text text-transparent tracking-wider">
              MEMO-OPS
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
              Plateforme RETEX
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all',
                isActive
                  ? 'bg-sidebar-accent border border-primary/40 text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground border border-transparent'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-4 text-xs text-muted-foreground uppercase tracking-wider">
                Administration
              </p>
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all',
                    isActive
                      ? 'bg-sidebar-accent border border-primary/40 text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground border border-transparent'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                  {item.badge && pendingCount > 0 && (
                    <span className="ml-auto bg-orange-500/20 text-orange-500 text-xs px-2 py-0.5 rounded-full border border-orange-500/30">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* AI Insight Card */}
      <div className="p-3">
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <p className="text-xs text-primary font-semibold">INSIGHT IA</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            3 patterns similaires détectés avec votre dernière intervention
          </p>
        </div>
      </div>
    </aside>
  );
}
