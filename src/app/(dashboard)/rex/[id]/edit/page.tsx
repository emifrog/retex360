import { createClient } from '@/lib/supabase/server';
import { isSdisAdmin } from '@/lib/api-auth';
import { notFound, redirect } from 'next/navigation';
import { RexForm } from '@/components/rex/rex-form';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { getSubscriptionState } from '@/lib/subscription';
import { rexToFormData } from '@/lib/rex-form-data';

interface EditRexPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRexPage({ params }: EditRexPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get REX data
  const { data: rex, error } = await supabase.from('rex').select('*').eq('id', id).single();

  if (error || !rex) {
    notFound();
  }

  // Check if user is author or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, sdis_id')
    .eq('id', user.id)
    .single();

  const isAuthor = rex.author_id === user.id;
  const isAdmin = isSdisAdmin(profile, rex.sdis_id);

  if (!isAuthor && !isAdmin) {
    redirect(`/rex/${id}`);
  }

  // Can only edit draft or rejected REX (unless admin)
  if (!isAdmin && rex.status !== 'draft') {
    redirect(`/rex/${id}`);
  }

  // Mode lecture seule (abonnement suspendu/expiré) : édition désactivée.
  if (profile?.role !== 'super_admin') {
    const sub = await getSubscriptionState(profile?.sdis_id);
    if (!sub.canWrite) redirect(`/rex/${id}`);
  }

  // Tous les champs du formulaire, dérivés de sa propre liste. Cette reprise
  // était écrite à la main et avait neuf rubriques de retard : les champs
  // absents arrivaient vides dans le formulaire, et l'enregistrement écrivait
  // ce vide en base (lieu, heure, témoignages, démarche du RETEX…).
  const initialData = rexToFormData(rex);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'REX', href: '/rex' },
          { label: rex.title, href: `/rex/${id}` },
          { label: 'Modifier' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold">Modifier le REX</h1>
        <p className="text-muted-foreground">
          Modifiez les informations de votre retour d&apos;expérience
        </p>
      </div>

      <RexForm
        initialData={initialData}
        rexId={id}
        mode="edit"
        userId={user.id}
        currentStatus={rex.status}
      />
    </div>
  );
}
