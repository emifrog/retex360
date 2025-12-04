import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ValidationList } from '@/components/admin/validation-list';

export default async function ValidationPage() {
  const supabase = await createClient();

  // Check auth and role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['validator', 'admin', 'super_admin'].includes(profile.role)) {
    redirect('/');
  }

  // Fetch pending REX
  const { data: pendingRex } = await supabase
    .from('rex')
    .select(`
      *,
      author:profiles!author_id(id, full_name, grade, email),
      sdis:sdis!sdis_id(id, code, name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Validation des RETEX</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Examinez et validez les retours d&apos;expérience en attente
        </p>
      </div>

      <ValidationList initialRex={pendingRex || []} />
    </div>
  );
}
