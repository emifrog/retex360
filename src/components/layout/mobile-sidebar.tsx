'use client';

import { useState, useRef, useEffect } from 'react';
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
  Search,
  Info,
  Users,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Recherche', href: '/search', icon: Search },
  { name: 'Liste REX', href: '/rex', icon: FileText },
  { name: 'Nouveau REX', href: '/rex/new', icon: PlusCircle },
  { name: 'Favoris', href: '/favorites', icon: Star },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

const adminNavigation = [
  { name: 'Validation', href: '/admin/validation', icon: CheckCircle, badge: true },
  { name: 'Utilisateurs', href: '/admin/users', icon: Users },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

const bottomNavigation = [
  { name: 'À propos', href: '/about', icon: Info },
];

interface MobileSidebarProps {
  pendingCount?: number;
  isAdmin?: boolean;
}

export function MobileSidebar({ pendingCount = 0, isAdmin = false }: MobileSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const prevPathnameRef = useRef(pathname);

  // Close sidebar on route change
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setIsOpen(false);
      });
    }
  }, [pathname]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
        <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
        
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-red-900 rounded-lg flex items-center justify-center shadow-lg shadow-primary/30 border border-white/10 shrink-0">
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
              <h1 className="text-lg font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent tracking-wider">
                RETEX360
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
                Plateforme
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-sidebar-accent border border-primary/40 text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground border border-transparent'
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
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
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all',
                      isActive
                        ? 'bg-sidebar-accent border border-primary/40 text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground border border-transparent'
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
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

        {/* Bottom Navigation */}
        <div className="border-t border-border p-3">
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
