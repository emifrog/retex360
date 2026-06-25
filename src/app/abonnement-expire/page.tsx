import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { getUser, logout } from '@/lib/actions/auth';
import { getSubscriptionState } from '@/lib/subscription';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Abonnement expiré | RETEX360',
  description: 'Votre abonnement a expiré',
};

export default async function SubscriptionExpiredPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  // Page réservée aux comptes effectivement bloqués (évite un cul-de-sac
  // pour les utilisateurs dont l'abonnement est encore valide).
  const state = await getSubscriptionState(user.sdis_id);
  if (state.mode !== 'blocked') redirect('/');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <Lock className="w-7 h-7 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Votre abonnement a expiré</h1>
          <p className="text-sm text-muted-foreground">
            L&apos;accès à RETEX360 pour {user.sdis?.name ?? 'votre SDIS'} est suspendu. Pour
            rétablir l&apos;accès, contactez votre référent RETEX ou l&apos;administrateur de votre
            SDIS afin de régulariser l&apos;abonnement.
          </p>
        </div>
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Vos données sont conservées et seront de nouveau accessibles dès la réactivation.
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" className="w-full">
            Se déconnecter
          </Button>
        </form>
      </div>
    </div>
  );
}
