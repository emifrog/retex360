'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { register } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const CARD_CLASS = 'border-border/50 bg-card/80 backdrop-blur';

const ROLE_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  validator: 'Validateur',
  admin: 'Administrateur',
  super_admin: 'Super administrateur',
};

type Invitation =
  | { valid: true; email: string; role: string; sdis: { code: string; name: string } | null }
  | { valid: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full bg-gradient-to-r from-primary to-red-800 hover:from-primary/90 hover:to-red-800/90"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Inscription...
        </>
      ) : (
        "S'inscrire"
      )}
    </Button>
  );
}

function LoadingCard() {
  return (
    <Card className={CARD_CLASS}>
      <CardContent className="py-12 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function InvitationUnavailable({ expired }: { expired: boolean }) {
  return (
    <Card className={CARD_CLASS}>
      <CardContent className="pt-6 space-y-3 text-center">
        <p className="text-sm text-muted-foreground">
          L&apos;inscription se fait uniquement sur invitation. Demandez un lien à
          l&apos;administrateur de votre SDIS.
        </p>
        {expired && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
            Ce lien d&apos;invitation est invalide, déjà utilisé ou expiré.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/login" className="text-sm text-primary hover:underline">
          Se connecter
        </Link>
      </CardFooter>
    </Card>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null); // null = chargement

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/auth/invitation?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d: Invitation) => {
        if (!cancelled) setInvitation(d);
      })
      .catch(() => {
        if (!cancelled) setInvitation({ valid: false });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
    }
  }

  if (!token) return <InvitationUnavailable expired={false} />;
  if (invitation === null) return <LoadingCard />;
  if (!invitation.valid) return <InvitationUnavailable expired />;

  return (
    <Card className={CARD_CLASS}>
      <form action={handleSubmit}>
        <input type="hidden" name="token" value={token} />
        <CardContent className="pt-6 space-y-4">
          <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Email : </span>
              {invitation.email}
            </div>
            {invitation.sdis && (
              <div>
                <span className="text-muted-foreground">SDIS : </span>
                {invitation.sdis.code} - {invitation.sdis.name}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Rôle : </span>
              {ROLE_LABELS[invitation.role] ?? invitation.role}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Jean Dupont"
              required
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade">Grade (optionnel)</Label>
            <Input
              id="grade"
              name="grade"
              type="text"
              placeholder="Capitaine, Lieutenant..."
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
              minLength={12}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              12 caractères minimum, avec au moins une majuscule, une minuscule et un chiffre.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
              className="bg-background/50"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showPassword"
              checked={showPassword}
              onCheckedChange={(checked) => setShowPassword(checked === true)}
            />
            <label htmlFor="showPassword" className="text-sm text-muted-foreground cursor-pointer">
              Afficher les mots de passe
            </label>
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <SubmitButton />
          <p className="text-sm text-muted-foreground text-center">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <RegisterForm />
    </Suspense>
  );
}
