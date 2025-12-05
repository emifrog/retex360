'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Star,
  BarChart3,
  CheckCircle,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      'bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 relative',
      collapsed ? 'w-[72px]' : 'w-60'
    )}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-md hover:bg-sidebar-accent"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
      {/* Logo */}
      <div className={cn('border-b border-sidebar-border', collapsed ? 'p-3' : 'p-5')}>
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-red-900 rounded-lg flex items-center justify-center shadow-lg shadow-primary/30 border border-white/10 flex-shrink-0">
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
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent tracking-wider">
                RETEX360
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
                Plateforme
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 p-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            
            const linkContent = (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg text-sm transition-all',
                  collapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3',
                  isActive
                    ? 'bg-sidebar-accent border border-primary/40 text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground border border-transparent'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && item.name}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}

          {/* Admin section */}
          {isAdmin && (
            <>
              {!collapsed && (
                <div className="pt-4 pb-2">
                  <p className="px-4 text-xs text-muted-foreground uppercase tracking-wider">
                    Administration
                  </p>
                </div>
              )}
              {collapsed && <div className="pt-4" />}
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href;
                
                const linkContent = (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg text-sm transition-all',
                      collapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3',
                      isActive
                        ? 'bg-sidebar-accent border border-primary/40 text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground border border-transparent'
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && item.name}
                    {!collapsed && item.badge && pendingCount > 0 && (
                      <span className="ml-auto bg-orange-500/20 text-orange-500 text-xs px-2 py-0.5 rounded-full border border-orange-500/30">
                        {pendingCount}
                      </span>
                    )}
                    {collapsed && item.badge && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <div className="relative">{linkContent}</div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </>
          )}
        </nav>
      </TooltipProvider>

      {/* AI Insight Card */}
      {!collapsed ? (
        <div className="p-3">
          <div className="p-4 bg-accent border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <p className="text-xs text-primary font-semibold">INSIGHT IA</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              3 patterns similaires détectés avec votre dernière intervention
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 bg-accent border border-primary/20 rounded-lg flex items-center justify-center cursor-pointer">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-semibold">INSIGHT IA</p>
                <p className="text-xs text-muted-foreground">3 patterns similaires détectés</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </aside>
  );
}
