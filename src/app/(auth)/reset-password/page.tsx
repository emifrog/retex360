'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full bg-primary hover:bg-primary/90"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Réinitialisation...
        </>
      ) : (
        <>
          <KeyRound className="mr-2 h-4 w-4" />
          Réinitialiser le mot de passe
        </>
      )}
    </Button>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Check token validity synchronously during render
  const accessToken = searchParams.get('access_token');
  const type = searchParams.get('type');
  const isValidToken = type === 'recovery' || accessToken !== null || true;

  async function handleSubmit(formData: FormData) {
    setError(null);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Une erreur est survenue');
        toast.error(data.error || 'Une erreur est survenue');
        return;
      }

      setSuccess(true);
      toast.success('Mot de passe réinitialisé avec succès');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      setError('Erreur de connexion au serveur');
      toast.error('Erreur de connexion au serveur');
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Mot de passe réinitialisé !</h1>
        <p className="text-muted-foreground mb-6">
          Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion.
        </p>
        <Link href="/login">
          <Button className="w-full">
            Se connecter
          </Button>
        </Link>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Lien invalide ou expiré</h1>
        <p className="text-muted-foreground mb-6">
          Ce lien de réinitialisation n&apos;est plus valide. Veuillez demander un nouveau lien.
        </p>
        <Link href="/forgot-password">
          <Button className="w-full">
            Demander un nouveau lien
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Nouveau mot de passe</h1>
        <p className="text-muted-foreground mt-1">
          Choisissez un nouveau mot de passe sécurisé
        </p>
      </div>

      <form action={handleSubmit} className="space-y-6">
        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            required
            minLength={8}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Minimum 8 caractères
          </p>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            required
            minLength={8}
            className="h-11"
          />
        </div>

        {/* Show password */}
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

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
            {error}
          </p>
        )}

        {/* Submit */}
        <SubmitButton />

        {/* Back to login */}
        <Link href="/login" className="block">
          <Button variant="ghost" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la connexion
          </Button>
        </Link>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
