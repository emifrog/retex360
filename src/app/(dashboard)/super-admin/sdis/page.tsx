import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SdisClientsTable, type ClientRow } from '@/components/super-admin/sdis-clients-table';
import type { Plan, SubscriptionStatus } from '@/types';

export const metadata = {
  title: 'SDIS clients | RETEX360',
  description: 'Onboarding et gestion des SDIS clients',
};

interface SdisRel {
  id: string;
  code: string;
  name: string;
}

export default async function SuperAdminSdisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!currentProfile || currentProfile.role !== 'super_admin') redirect('/');

  const admin = createAdminClient();

  const { data: subsRaw } = await admin
    .from('subscriptions')
    .select(
      'sdis_id, plan, status, suspended_reason, trial_ends_at, current_period_end, max_users, max_rex_per_month, sdis:sdis_id(id, code, name)'
    )
    .order('created_at', { ascending: false });

  const subs = (subsRaw || []) as Array<{
    sdis_id: string;
    plan: Plan;
    status: SubscriptionStatus;
    suspended_reason: string | null;
    trial_ends_at: string | null;
    current_period_end: string | null;
    max_users: number | null;
    max_rex_per_month: number | null;
    sdis: SdisRel | SdisRel[] | null;
  }>;

  const clientIds = subs.map((s) => s.sdis_id);

  // Profils des SDIS clients (compteur + liste des admins pour la réinit. MDP).
  let profiles: { email: string; full_name: string | null; role: string; sdis_id: string }[] = [];
  if (clientIds.length > 0) {
    const { data } = await admin
      .from('profiles')
      .select('email, full_name, role, sdis_id')
      .in('sdis_id', clientIds);
    profiles = data || [];
  }

  // Compteur de REX par SDIS (table volumineuse → count ciblé, en parallèle).
  const rexEntries = await Promise.all(
    clientIds.map(async (id) => {
      const { count } = await admin
        .from('rex')
        .select('*', { count: 'exact', head: true })
        .eq('sdis_id', id);
      return [id, count ?? 0] as const;
    })
  );
  const rexCountMap = new Map(rexEntries);

  const rows: ClientRow[] = subs.map((s) => {
    const sdisRel = (Array.isArray(s.sdis) ? s.sdis[0] : s.sdis) as SdisRel | null;
    const sdisProfiles = profiles.filter((p) => p.sdis_id === s.sdis_id);
    return {
      sdisId: s.sdis_id,
      code: sdisRel?.code ?? '',
      name: sdisRel?.name ?? '',
      plan: s.plan,
      status: s.status,
      suspendedReason: s.suspended_reason,
      trialEndsAt: s.trial_ends_at,
      currentPeriodEnd: s.current_period_end,
      maxUsers: s.max_users,
      maxRexPerMonth: s.max_rex_per_month,
      userCount: sdisProfiles.length,
      rexCount: rexCountMap.get(s.sdis_id) ?? 0,
      admins: sdisProfiles
        .filter((p) => p.role === 'admin')
        .map((p) => ({ email: p.email, full_name: p.full_name })),
    };
  });

  // SDIS de la liste non encore clients (pour le wizard « SDIS existant »).
  const { data: allSdis } = await admin.from('sdis').select('id, code, name').order('code');
  const clientIdSet = new Set(clientIds);
  const availableSdis = (allSdis || []).filter((s) => !clientIdSet.has(s.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary" />
          SDIS clients
        </h1>
        <p className="text-muted-foreground mt-1">
          Onboarding et gestion des abonnements (plan, statut, limites, compte admin).
        </p>
      </div>

      <SdisClientsTable rows={rows} availableSdis={availableSdis} />
    </div>
  );
}
