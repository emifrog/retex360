'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Trash2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Domain {
  id: string;
  domain: string;
  created_at: string;
  sdis: { code: string; name: string } | null;
}

interface Props {
  domains: Domain[];
  isSuperAdmin: boolean;
  sdisList: { id: string; code: string; name: string }[];
}

export function DomainsManager({ domains, isSuperAdmin, sdisList }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [domain, setDomain] = useState('');
  const [sdisId, setSdisId] = useState('');

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!domain.trim()) {
      toast.error('Domaine requis');
      return;
    }
    if (isSuperAdmin && !sdisId) {
      toast.error('Veuillez sélectionner un SDIS');
      return;
    }

    const res = await fetch('/api/admin/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: domain.trim(), ...(isSuperAdmin ? { sdisId } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Erreur lors de l'ajout du domaine");
      return;
    }
    setDomain('');
    toast.success('Domaine ajouté');
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/domains/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Erreur lors de la suppression');
      return;
    }
    toast.success('Domaine supprimé');
    startTransition(() => router.refresh());
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="w-5 h-5 text-primary" />
          Domaines email autorisés
        </CardTitle>
        <CardDescription>
          Restriction secondaire : si au moins un domaine est défini, une invitation ne peut viser
          qu&apos;une adresse de l&apos;un de ces domaines. Sans aucun domaine, toute adresse est
          permise.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="domain">Domaine</Label>
            <Input
              id="domain"
              placeholder="sdis06.fr"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
          </div>
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label htmlFor="domain-sdis">SDIS</Label>
              <Select value={sdisId} onValueChange={setSdisId}>
                <SelectTrigger id="domain-sdis">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {sdisList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" disabled={isPending} variant="outline" className="w-full">
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </>
            )}
          </Button>
        </form>

        {domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun domaine configuré — toute adresse email peut être invitée.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-md border border-border/60">
            {domains.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="font-mono">{d.domain}</span>
                <div className="flex items-center gap-3">
                  {isSuperAdmin && d.sdis && (
                    <span className="text-muted-foreground">{d.sdis.code}</span>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce domaine ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Les futures invitations ne seront plus restreintes à{' '}
                          <strong>{d.domain}</strong>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => remove(d.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
