import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RexForm } from '@/components/rex/rex-form';
import { getUser } from '@/lib/actions/auth';
import { getSubscriptionState } from '@/lib/subscription';

export const metadata: Metadata = {
  title: 'Nouveau RETEX',
  description: 'Créez un nouveau retour d\'expérience pour partager les enseignements de votre intervention.',
};
import { Breadcrumb } from '@/components/ui/breadcrumb';

export default async function NewRexPage() {
  // Mode lecture seule (abonnement suspendu/expiré) : pas de création de REX.
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.role !== 'super_admin') {
    const state = await getSubscriptionState(user.sdis_id);
    if (!state.canWrite) redirect('/rex');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'REX', href: '/rex' },
        { label: 'Nouveau RETEX' },
      ]} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Nouveau RETEX</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Partagez votre retour d&apos;expérience avec la communauté
        </p>
      </div>

      {/* Form */}
      <RexForm />
    </div>
  );
}
