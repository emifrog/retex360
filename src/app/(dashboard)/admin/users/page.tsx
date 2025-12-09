import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { UsersTable } from '@/components/admin/users-table';

export const metadata = {
  title: 'Gestion des utilisateurs | RETEX360',
  description: 'Administration des utilisateurs et des rôles',
};

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Check auth and admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, sdis_id')
    .eq('id', user.id)
    .single();

  if (!currentProfile || !['admin', 'super_admin'].includes(currentProfile.role)) {
    redirect('/');
  }

  const isSuperAdmin = currentProfile.role === 'super_admin';

  // Fetch users based on role
  let query = supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      grade,
      role,
      avatar_url,
      created_at,
      sdis:sdis_id(id, code, name)
    `)
    .order('created_at', { ascending: false });

  // Admin can only see users from their SDIS
  if (!isSuperAdmin) {
    query = query.eq('sdis_id', currentProfile.sdis_id);
  }

  const { data: usersRaw, error } = await query;

  if (error) {
    console.error('Error fetching users:', error);
  }

  // Transform users to normalize sdis field
  const users = (usersRaw || []).map((user) => ({
    ...user,
    sdis: Array.isArray(user.sdis) ? user.sdis[0] || null : user.sdis,
  }));

  // Fetch SDIS list for super_admin
  let sdisList: { id: string; code: string; name: string }[] = [];
  if (isSuperAdmin) {
    const { data } = await supabase
      .from('sdis')
      .select('id, code, name')
      .order('code');
    sdisList = data || [];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Users className="w-7 h-7 text-primary" />
            Gestion des utilisateurs
          </h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin 
              ? 'Gérez les utilisateurs de tous les SDIS'
              : 'Gérez les utilisateurs de votre SDIS'
            }
          </p>
        </div>
      </div>

      {/* Users Table */}
      <UsersTable 
        users={users || []} 
        currentUserId={user.id}
        isSuperAdmin={isSuperAdmin}
        sdisList={sdisList}
      />
    </div>
  );
}
