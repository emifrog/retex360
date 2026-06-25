import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SubscriptionBanner } from '@/components/subscription/subscription-banner';
import { getUser } from '@/lib/actions/auth';
import { getSubscriptionState } from '@/lib/subscription';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const isAdmin =
    user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'validator';
  const isSuperAdmin = user?.role === 'super_admin';

  // Abonnement : le super_admin n'est jamais bloqué (il pilote l'onboarding).
  const subscription = await getSubscriptionState(user?.sdis_id);
  if (!isSuperAdmin && subscription.mode === 'blocked') {
    redirect('/abonnement-expire');
  }
  const canWrite = isSuperAdmin || subscription.canWrite;

  // Fetch real pending validation count
  let pendingCount = 0;
  if (isAdmin) {
    const supabase = await createClient();
    const { count } = await supabase
      .from('rex')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    pendingCount = count || 0;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        canWrite={canWrite}
        pendingCount={pendingCount}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={user}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          canWrite={canWrite}
          pendingCount={pendingCount}
        />
        <main id="main-content" className="flex-1 p-4 md:p-6 overflow-auto space-y-4">
          {!isSuperAdmin && <SubscriptionBanner state={subscription} />}
          {children}
        </main>
      </div>
    </div>
  );
}
