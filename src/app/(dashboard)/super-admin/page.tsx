import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Building2,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Euro,
  Crown,
  ArrowRight,
} from 'lucide-react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { SuperAdminMetrics, type Metric } from '@/components/super-admin/super-admin-metrics';
import { AuditLogTable, type AuditRow } from '@/components/super-admin/audit-log-table';
import { PLAN_CONFIG, type Plan } from '@/types';

export const metadata = {
  title: 'Super administration | RETEX360',
  description: 'Tableau de bord super_admin — métriques globales et audit',
};

export default async function SuperAdminPage() {
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

  const [{ data: subsRaw }, usersRes, rexRes, { data: auditRaw }] = await Promise.all([
    admin.from('subscriptions').select('plan, status'),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('rex').select('*', { count: 'exact', head: true }),
    admin
      .from('admin_audit_log')
      .select('id, action, actor_email, target_label, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const subs = (subsRaw || []) as { plan: Plan; status: string }[];
  const clients = subs.length;
  const active = subs.filter((s) => s.status === 'active').length;
  const trial = subs.filter((s) => s.status === 'trial').length;
  const mrr = subs
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (PLAN_CONFIG[s.plan]?.monthlyPrice ?? 0), 0);

  const metrics: Metric[] = [
    {
      label: 'SDIS clients',
      value: clients.toLocaleString('fr-FR'),
      icon: Building2,
      color: '#3b82f6',
    },
    { label: 'Actifs', value: active.toLocaleString('fr-FR'), icon: CheckCircle, color: '#22c55e' },
    { label: 'En essai', value: trial.toLocaleString('fr-FR'), icon: Clock, color: '#f97316' },
    {
      label: 'Utilisateurs',
      value: (usersRes.count ?? 0).toLocaleString('fr-FR'),
      icon: Users,
      color: '#a855f7',
    },
    {
      label: 'REX totaux',
      value: (rexRes.count ?? 0).toLocaleString('fr-FR'),
      icon: FileText,
      color: '#06b6d4',
    },
    {
      label: 'MRR estimé',
      value: `${mrr.toLocaleString('fr-FR')} €`,
      icon: Euro,
      color: '#16a34a',
    },
  ];

  const auditRows = (auditRaw || []) as AuditRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Crown className="w-7 h-7 text-primary" />
            Super administration
          </h1>
          <p className="text-muted-foreground mt-1">
            Métriques globales de la plateforme et journal d&apos;audit.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/super-admin/sdis">
            Gérer les SDIS clients
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>

      <SuperAdminMetrics metrics={metrics} />

      <p className="text-xs text-muted-foreground">
        MRR estimé à partir des prix de plan (configurables dans <code>PLAN_CONFIG</code>), pour les
        abonnements au statut « Actif » uniquement.
      </p>

      <AuditLogTable rows={auditRows} />
    </div>
  );
}
