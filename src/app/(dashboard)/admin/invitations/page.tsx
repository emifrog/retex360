import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Mail } from 'lucide-react';
import { InvitationsManager } from '@/components/admin/invitations-manager';
import { DomainsManager } from '@/components/admin/domains-manager';

export const metadata = {
  title: 'Invitations | RETEX360',
  description: 'Inviter de nouveaux utilisateurs',
};

export default async function AdminInvitationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, sdis_id')
    .eq('id', user.id)
    .single();

  if (!currentProfile || !['admin', 'super_admin'].includes(currentProfile.role)) {
    redirect('/');
  }
  const isSuperAdmin = currentProfile.role === 'super_admin';

  // RLS verrouillée sur `invitations` : lecture via le rôle service, scopée au SDIS.
  const admin = createAdminClient();
  let query = admin
    .from('invitations')
    .select('id, email, role, sdis_id, expires_at, accepted_at, created_at, sdis:sdis_id(code, name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (!isSuperAdmin) {
    query = query.eq('sdis_id', currentProfile.sdis_id);
  }
  const { data: invRaw } = await query;
  const invitations = (invRaw || []).map((i) => ({
    id: i.id as string,
    email: i.email as string,
    role: i.role as string,
    expires_at: i.expires_at as string,
    accepted_at: i.accepted_at as string | null,
    created_at: i.created_at as string,
    sdis: (Array.isArray(i.sdis) ? i.sdis[0] : i.sdis) as { code: string; name: string } | null,
  }));

  // Domaines email autorisés (restriction secondaire des invitations).
  let domQuery = admin
    .from('allowed_domains')
    .select('id, domain, sdis_id, created_at, sdis:sdis_id(code, name)')
    .order('domain');
  if (!isSuperAdmin) {
    domQuery = domQuery.eq('sdis_id', currentProfile.sdis_id);
  }
  const { data: domRaw } = await domQuery;
  const domains = (domRaw || []).map((d) => ({
    id: d.id as string,
    domain: d.domain as string,
    created_at: d.created_at as string,
    sdis: (Array.isArray(d.sdis) ? d.sdis[0] : d.sdis) as { code: string; name: string } | null,
  }));

  let sdisList: { id: string; code: string; name: string }[] = [];
  if (isSuperAdmin) {
    const { data } = await admin.from('sdis').select('id, code, name').order('code');
    sdisList = data || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Mail className="w-7 h-7 text-primary" />
          Invitations
        </h1>
        <p className="text-muted-foreground mt-1">
          {isSuperAdmin
            ? 'Invitez des utilisateurs sur n’importe quel SDIS'
            : 'Invitez des utilisateurs de votre SDIS'}
        </p>
      </div>

      <InvitationsManager
        invitations={invitations}
        isSuperAdmin={isSuperAdmin}
        sdisList={sdisList}
      />

      <DomainsManager domains={domains} isSuperAdmin={isSuperAdmin} sdisList={sdisList} />
    </div>
  );
}
