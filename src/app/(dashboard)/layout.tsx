import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { getUser } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'validator';

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
      <Sidebar isAdmin={isAdmin} pendingCount={pendingCount} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} isAdmin={isAdmin} pendingCount={pendingCount} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
