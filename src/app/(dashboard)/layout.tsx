import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { getUser } from '@/lib/actions/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'validator';

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar isAdmin={isAdmin} pendingCount={3} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} isAdmin={isAdmin} pendingCount={3} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
