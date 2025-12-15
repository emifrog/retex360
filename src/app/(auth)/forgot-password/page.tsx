'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

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
          Envoi en cours...
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Envoyer le lien
        </>
      )}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  async function handleSubmit(formData: FormData) {
    setError(null);
    const emailValue = formData.get('email') as string;
    setEmail(emailValue);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Une erreur est survenue');
        toast.error(data.error || 'Une erreur est survenue');
        return;
      }

      setSuccess(true);
      toast.success('Email envoyé avec succès');
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
        <h1 className="text-2xl font-bold text-foreground mb-2">Email envoyé !</h1>
        <p className="text-muted-foreground mb-6">
          Si un compte existe avec l&apos;adresse <strong>{email}</strong>, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Vérifiez également votre dossier spam si vous ne voyez pas l&apos;email.
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la connexion
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Mot de passe oublié</h1>
        <p className="text-muted-foreground mt-1">
          Entrez votre adresse email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <form action={handleSubmit} className="space-y-6">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Adresse email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="xavier.durand@sdis06.fr"
            required
            className="h-11"
          />
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
