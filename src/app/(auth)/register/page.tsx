'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { register } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Liste des SDIS (UUIDs valides RFC 4122 v4)
const SDIS_LIST = [
  { id: 'a0000000-0000-4000-a000-000000000001', code: '06', name: 'SDIS des Alpes-Maritimes' },
  { id: 'a0000000-0000-4000-a000-000000000002', code: '13', name: 'SDIS des Bouches-du-Rhône' },
  { id: 'a0000000-0000-4000-a000-000000000003', code: '83', name: 'SDIS du Var' },
  { id: 'a0000000-0000-4000-a000-000000000004', code: '84', name: 'SDIS de Vaucluse' },
];

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

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [sdisId, setSdisId] = useState('');

  async function handleSubmit(formData: FormData) {
    setError(null);
    
    // Vérifier que le SDIS est sélectionné
    if (!sdisId) {
      setError('Veuillez sélectionner un SDIS');
      toast.error('Veuillez sélectionner un SDIS');
      return;
    }
    
    formData.set('sdisId', sdisId);
    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
    }
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <form action={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="votre.email@sdis.fr"
              required
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sdisId">SDIS</Label>
            <Select value={sdisId} onValueChange={setSdisId} required>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Sélectionnez votre SDIS" />
              </SelectTrigger>
              <SelectContent>
                {SDIS_LIST.map((sdis) => (
                  <SelectItem key={sdis.id} value={sdis.id}>
                    {sdis.code} - {sdis.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              type="password"
              placeholder="••••••••"
              required
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              className="bg-background/50"
            />
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
