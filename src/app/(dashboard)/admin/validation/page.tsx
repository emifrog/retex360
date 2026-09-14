import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ValidationList } from '@/components/admin/validation-list';
import { logger } from '@/lib/logger';

export default async function ValidationPage() {
  const supabase = await createClient();

  // Check auth and role
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  // Fetch pending REX.
  // Pas d'`email` dans la jointure : la colonne n'est plus lisible par le rôle
  // applicatif (migration 024). PostgREST rejette la requête ENTIÈRE dès qu'une
  // colonne interdite y figure — la file de validation revenait donc vide, sans
  // erreur à l'écran, ce qui est le pire des deux mondes pour un valideur.
  const { data: pendingRex, error } = await supabase
    .from('rex')
    .select(
      `
      *,
      author:profiles!author_id(id, full_name, grade),
      sdis:sdis!sdis_id(id, code, name)
    `
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Validation queue fetch failed:', error);
  }

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
