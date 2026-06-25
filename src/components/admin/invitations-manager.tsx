'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Mail, Copy, Check, Trash2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  sdis: { code: string; name: string } | null;
}

interface Props {
  invitations: Invitation[];
  isSuperAdmin: boolean;
  sdisList: { id: string; code: string; name: string }[];
}

const ROLE_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  validator: 'Validateur',
  admin: 'Administrateur',
  super_admin: 'Super admin',
};

function invitationStatus(inv: Invitation): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (inv.accepted_at) return { label: 'Accepté', variant: 'default' };
  if (new Date(inv.expires_at).getTime() <= Date.now()) return { label: 'Expiré', variant: 'destructive' };
  return { label: 'En attente', variant: 'secondary' };
}

export function InvitationsManager({ invitations, isSuperAdmin, sdisList }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [sdisId, setSdisId] = useState('');
  const [inviteResult, setInviteResult] = useState<{ url: string; emailSent: boolean; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const roleOptions = isSuperAdmin
    ? ['user', 'validator', 'admin', 'super_admin']
    : ['user', 'validator'];

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email requis');
      return;
    }
    if (isSuperAdmin && !sdisId) {
      toast.error('Veuillez sélectionner un SDIS');
      return;
    }

    const targetEmail = email.trim();
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail, role, ...(isSuperAdmin ? { sdisId } : {}) }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Erreur lors de la création de l'invitation");
      return;
    }

    setInviteResult({ url: data.inviteUrl, emailSent: !!data.emailSent, email: targetEmail });
    setCopied(false);
    setEmail('');
    toast.success(data.emailSent ? `Invitation envoyée à ${targetEmail}` : 'Invitation créée');
    startTransition(() => router.refresh());
  }

  async function copyLink() {
    if (!inviteResult) return;
    try {
      await navigator.clipboard.writeText(inviteResult.url);
      setCopied(true);
      toast.success('Lien copié');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copie impossible — copiez le lien manuellement');
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/admin/invitations/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Erreur lors de la révocation');
      return;
    }
    toast.success('Invitation révoquée');
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de création */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="w-5 h-5 text-primary" />
            Nouvelle invitation
          </CardTitle>
          <CardDescription>
            L&apos;invité recevra un lien à usage unique (valable 7 jours). Le SDIS et le rôle
            sont définis ici.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="prenom.nom@sdis.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Rôle</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="invite-sdis">SDIS</Label>
                <Select value={sdisId} onValueChange={setSdisId}>
                  <SelectTrigger id="invite-sdis">
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
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Inviter'}
            </Button>
          </form>

          {inviteResult && (
            <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-sm font-medium">
                {inviteResult.emailSent
                  ? `Email envoyé à ${inviteResult.email}. Lien (au cas où) :`
                  : "Lien d'invitation à transmettre :"}
              </p>
              <div className="flex gap-2">
                <Input readOnly value={inviteResult.url} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ce lien n&apos;est affiché qu&apos;une fois — copiez-le maintenant.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invitations ({invitations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Mail className="w-8 h-8 opacity-40" />
              Aucune invitation pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    {isSuperAdmin && <TableHead className="hidden md:table-cell">SDIS</TableHead>}
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden sm:table-cell">Expire</TableHead>
                    <TableHead className="hidden lg:table-cell">Créée</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => {
                    const status = invitationStatus(inv);
                    const pending = !inv.accepted_at;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.email}</TableCell>
                        <TableCell>{ROLE_LABELS[inv.role] ?? inv.role}</TableCell>
                        {isSuperAdmin && (
                          <TableCell className="hidden md:table-cell">
                            {inv.sdis ? inv.sdis.code : '—'}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {format(new Date(inv.expires_at), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          {pending && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Révoquer cette invitation ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Le lien envoyé à <strong>{inv.email}</strong> deviendra
                                    immédiatement inutilisable. Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => revoke(inv.id)}
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                  >
                                    Révoquer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
