import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { RexForm } from '@/components/rex/rex-form';

interface EditRexPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRexPage({ params }: EditRexPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get REX data
  const { data: rex, error } = await supabase
    .from('rex')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !rex) {
    notFound();
  }

  // Check if user is author or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAuthor = rex.author_id === user.id;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  if (!isAuthor && !isAdmin) {
    redirect(`/rex/${id}`);
  }

  // Can only edit draft or rejected REX (unless admin)
  if (!isAdmin && rex.status !== 'draft') {
    redirect(`/rex/${id}`);
  }

  // Transform data for form
  const initialData = {
    title: rex.title,
    intervention_date: rex.intervention_date,
    type: rex.type,
    severity: rex.severity as 'critique' | 'majeur' | 'significatif',
    visibility: rex.visibility as 'sdis' | 'inter_sdis' | 'public',
    description: rex.description || '',
    context: rex.context || '',
    means_deployed: rex.means_deployed || '',
    difficulties: rex.difficulties || '',
    lessons_learned: rex.lessons_learned || '',
    tags: rex.tags || [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modifier le REX</h1>
        <p className="text-muted-foreground">
          Modifiez les informations de votre retour d&apos;expérience
        </p>
      </div>

      <RexForm initialData={initialData} rexId={id} mode="edit" />
    </div>
  );
}
