'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LogOut, User, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/lib/actions/auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { MobileSidebar } from './mobile-sidebar';
import type { Profile, Sdis } from '@/types';

interface HeaderProps {
  user?: (Profile & { sdis: Sdis }) | null;
  isAdmin?: boolean;
  pendingCount?: number;
}

export function Header({ user, isAdmin = false, pendingCount = 0 }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-6">
      {/* Mobile Menu */}
      <div className="flex items-center gap-3">
        <MobileSidebar isAdmin={isAdmin} pendingCount={pendingCount} />
        
        {/* Logo mobile */}
        <div className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-red-900 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-bold text-sm">RETEX360</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xl mx-4 hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Recherche : type d'intervention, contexte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="pl-10 bg-background/50 border-border"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* SDIS Badge - Hidden on mobile */}
        {user?.sdis && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-md">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-500 font-medium">
              {user.sdis.code} Connecté
            </span>
          </div>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationCenter userId={user?.id || null} />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-900 text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.full_name || 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                {user?.grade && (
                  <p className="text-xs text-muted-foreground">{user.grade}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
