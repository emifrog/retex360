'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  User,
  MoreHorizontal,
  Search,
  Filter
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ROLES } from '@/types';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  grade: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  sdis: { id: string; code: string; name: string } | null;
}

interface UsersTableProps {
  users: UserProfile[];
  currentUserId: string;
  isSuperAdmin: boolean;
  sdisList: { id: string; code: string; name: string }[];
}

const roleConfig = {
  user: { 
    label: 'Utilisateur', 
    icon: User, 
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/30' 
  },
  validator: { 
    label: 'Validateur', 
    icon: ShieldCheck, 
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' 
  },
  admin: { 
    label: 'Admin', 
    icon: Shield, 
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' 
  },
  super_admin: { 
    label: 'Super Admin', 
    icon: ShieldAlert, 
    color: 'bg-red-500/10 text-red-500 border-red-500/30' 
  },
};

export function UsersTable({ users, currentUserId, isSuperAdmin, sdisList }: UsersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sdisFilter, setSdisFilter] = useState<string>('all');
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.grade?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesSdis = sdisFilter === 'all' || user.sdis?.id === sdisFilter;
    
    return matchesSearch && matchesRole && matchesSdis;
  });

  // Stats
  const stats = {
    total: users.length,
    users: users.filter(u => u.role === 'user').length,
    validators: users.filter(u => u.role === 'validator').length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/users/role', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedUser.id,
            role: newRole,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erreur lors de la modification');
        }

        toast.success(`Rôle modifié pour ${selectedUser.full_name || selectedUser.email}`);
        setIsDialogOpen(false);
        setSelectedUser(null);
        setNewRole('');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur lors de la modification');
      }
    });
  };

  const openRoleDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total utilisateurs</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-gray-500">{stats.users}</p>
            <p className="text-sm text-muted-foreground">Utilisateurs</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-500">{stats.validators}</p>
            <p className="text-sm text-muted-foreground">Validateurs</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-orange-500">{stats.admins}</p>
            <p className="text-sm text-muted-foreground">Administrateurs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, grade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleConfig[role].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {isSuperAdmin && sdisList.length > 0 && (
            <Select value={sdisFilter} onValueChange={setSdisFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="SDIS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les SDIS</SelectItem>
                {sdisList.map((sdis) => (
                  <SelectItem key={sdis.id} value={sdis.id}>
                    SDIS {sdis.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>SDIS</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Inscrit</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const role = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.user;
                const RoleIcon = role.icon;
                const initials = user.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || user.email[0].toUpperCase();

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.grade && <span className="text-muted-foreground">{user.grade} </span>}
                            {user.full_name || 'Sans nom'}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.sdis ? (
                        <span className="text-sm">SDIS {user.sdis.code}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('gap-1', role.color)}>
                        <RoleIcon className="w-3 h-3" />
                        {role.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell>
                      {user.id !== currentUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                              <Shield className="w-4 h-4 mr-2" />
                              Modifier le rôle
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
            <DialogDescription>
              Changer le rôle de {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.filter(role => isSuperAdmin || role !== 'super_admin').map((role) => {
                  const config = roleConfig[role];
                  const Icon = config.icon;
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Permissions par rôle :</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><strong>Utilisateur</strong> : Créer/éditer ses REX, commenter</li>
                <li><strong>Validateur</strong> : + Valider/rejeter les REX</li>
                <li><strong>Admin</strong> : + Gérer les utilisateurs du SDIS</li>
                {isSuperAdmin && (
                  <li><strong>Super Admin</strong> : Accès total, tous les SDIS</li>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleRoleChange} 
              disabled={isPending || newRole === selectedUser?.role}
            >
              {isPending ? 'Modification...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
