'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Building2,
  MoreHorizontal,
  Pause,
  Play,
  KeyRound,
  SlidersHorizontal,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  PLANS,
  PLAN_CONFIG,
  SUBSCRIPTION_STATUS_CONFIG,
  type Plan,
  type SubscriptionStatus,
} from '@/types';
import { AddSdisWizard } from './add-sdis-wizard';

interface AdminContact {
  email: string;
  full_name: string | null;
}

export interface ClientRow {
  sdisId: string;
  code: string;
  name: string;
  plan: Plan;
  status: SubscriptionStatus;
  suspendedReason: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  maxUsers: number | null;
  maxRexPerMonth: number | null;
  userCount: number;
  rexCount: number;
  admins: AdminContact[];
}

interface Props {
  rows: ClientRow[];
  availableSdis: { id: string; code: string; name: string }[];
}

type ActionKind = 'edit' | 'suspend' | 'reset' | null;

function expirationDate(row: ClientRow): string {
  const d = row.status === 'trial' ? row.trialEndsAt : row.currentPeriodEnd;
  return d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '—';
}

export function SdisClientsTable({ rows, availableSdis }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const [action, setAction] = useState<ActionKind>(null);
  const [selected, setSelected] = useState<ClientRow | null>(null);

  // Édition d'abonnement
  const [editPlan, setEditPlan] = useState<Plan>('essentiel');
  const [editMaxUsers, setEditMaxUsers] = useState('');
  const [editMaxRex, setEditMaxRex] = useState('');
  const [editPeriodEnd, setEditPeriodEnd] = useState('');

  // Suspension
  const [suspendReason, setSuspendReason] = useState('');

  // Réinitialisation MDP
  const [resetEmail, setResetEmail] = useState('');
  const [resetResult, setResetResult] = useState<{ url: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  function close() {
    setAction(null);
    setSelected(null);
    setResetResult(null);
    setCopied(false);
    setSuspendReason('');
  }

  function openEdit(row: ClientRow) {
    setSelected(row);
    setEditPlan(row.plan);
    setEditMaxUsers(row.maxUsers === null ? '' : String(row.maxUsers));
    setEditMaxRex(row.maxRexPerMonth === null ? '' : String(row.maxRexPerMonth));
    setEditPeriodEnd(row.currentPeriodEnd ? row.currentPeriodEnd.slice(0, 10) : '');
    setAction('edit');
  }

  function openSuspend(row: ClientRow) {
    setSelected(row);
    setSuspendReason(row.suspendedReason ?? '');
    setAction('suspend');
  }

  function openReset(row: ClientRow) {
    setSelected(row);
    setResetEmail(row.admins[0]?.email ?? '');
    setResetResult(null);
    setAction('reset');
  }

  async function patchSubscription(sdisId: string, body: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/super-admin/sdis/${sdisId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la mise à jour');
        return;
      }
      toast.success(successMsg);
      close();
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  async function confirmEdit() {
    if (!selected) return;
    await patchSubscription(
      selected.sdisId,
      {
        plan: editPlan,
        maxUsers: editMaxUsers.trim() === '' ? null : Number(editMaxUsers),
        maxRexPerMonth: editMaxRex.trim() === '' ? null : Number(editMaxRex),
        ...(editPeriodEnd ? { currentPeriodEnd: editPeriodEnd } : {}),
      },
      'Abonnement mis à jour'
    );
  }

  async function confirmSuspendToggle() {
    if (!selected) return;
    if (selected.status === 'suspended') {
      await patchSubscription(selected.sdisId, { status: 'active' }, 'SDIS réactivé');
    } else {
      await patchSubscription(
        selected.sdisId,
        { status: 'suspended', suspendedReason: suspendReason.trim() || null },
        'SDIS suspendu'
      );
    }
  }

  async function confirmReset() {
    if (!selected || !resetEmail) {
      toast.error('Sélectionnez un administrateur');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/super-admin/sdis/${selected.sdisId}/reset-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la réinitialisation');
        return;
      }
      setResetResult({ url: data.resetUrl, emailSent: !!data.emailSent });
      toast.success(data.emailSent ? 'Email de réinitialisation envoyé' : 'Lien de réinitialisation généré');
    } finally {
      setBusy(false);
    }
  }

  async function copyReset() {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.url);
      setCopied(true);
      toast.success('Lien copié');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copie impossible — copiez le lien manuellement');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            SDIS clients ({rows.length})
          </h2>
        </div>
        <AddSdisWizard availableSdis={availableSdis} />
      </div>

      <Card className="bg-card border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SDIS</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="hidden sm:table-cell">Utilisateurs</TableHead>
              <TableHead className="hidden md:table-cell">REX</TableHead>
              <TableHead className="hidden lg:table-cell">Expiration</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Aucun SDIS client. Utilisez « Ajouter un SDIS » pour démarrer l&apos;onboarding.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const statusCfg = SUBSCRIPTION_STATUS_CONFIG[row.status];
                return (
                  <TableRow key={row.sdisId}>
                    <TableCell>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-sm text-muted-foreground">SDIS {row.code}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{PLAN_CONFIG[row.plan].label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('gap-1', statusCfg.color)}>
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {row.userCount}
                      {row.maxUsers !== null && (
                        <span className="text-muted-foreground"> / {row.maxUsers}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{row.rexCount}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {expirationDate(row)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEdit(row)}>
                            <SlidersHorizontal className="w-4 h-4 mr-2" />
                            Modifier l&apos;abonnement
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openSuspend(row)}>
                            {row.status === 'suspended' ? (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Réactiver
                              </>
                            ) : (
                              <>
                                <Pause className="w-4 h-4 mr-2" />
                                Suspendre
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openReset(row)}
                            disabled={row.admins.length === 0}
                          >
                            <KeyRound className="w-4 h-4 mr-2" />
                            Réinitialiser MDP admin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog — Modifier l'abonnement */}
      <Dialog open={action === 'edit'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;abonnement</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.code} — ${selected.name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-plan">Plan</Label>
              <Select value={editPlan} onValueChange={(v) => setEditPlan(v as Plan)}>
                <SelectTrigger id="edit-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PLAN_CONFIG[p].label} — {PLAN_CONFIG[p].monthlyPrice} €/mois
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-maxusers">Max utilisateurs (vide = illimité)</Label>
                <Input
                  id="edit-maxusers"
                  type="number"
                  min={1}
                  value={editMaxUsers}
                  onChange={(e) => setEditMaxUsers(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-maxrex">Max REX / mois (vide = illimité)</Label>
                <Input
                  id="edit-maxrex"
                  type="number"
                  min={1}
                  value={editMaxRex}
                  onChange={(e) => setEditMaxRex(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pend">Fin de période</Label>
              <Input
                id="edit-pend"
                type="date"
                value={editPeriodEnd}
                onChange={(e) => setEditPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>
              Annuler
            </Button>
            <Button onClick={confirmEdit} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Suspendre / Réactiver */}
      <Dialog open={action === 'suspend'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected?.status === 'suspended' ? 'Réactiver le SDIS' : 'Suspendre le SDIS'}
            </DialogTitle>
            <DialogDescription>
              {selected ? `${selected.code} — ${selected.name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {selected?.status === 'suspended' ? (
              <p className="text-sm text-muted-foreground">
                Le SDIS repassera au statut <strong>Actif</strong>.
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="suspend-reason">Motif (optionnel)</Label>
                <Textarea
                  id="suspend-reason"
                  placeholder="Impayé, fin de contrat…"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>
              Annuler
            </Button>
            <Button
              onClick={confirmSuspendToggle}
              disabled={busy}
              className={selected?.status === 'suspended' ? '' : 'bg-orange-600 hover:bg-orange-600/90 text-white'}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : selected?.status === 'suspended' ? (
                'Réactiver'
              ) : (
                'Suspendre'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Réinitialiser MDP admin */}
      <Dialog open={action === 'reset'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe admin</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.code} — ${selected.name}` : ''}
            </DialogDescription>
          </DialogHeader>
          {resetResult ? (
            <div className="py-2 space-y-3">
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-sm font-medium">
                  {resetResult.emailSent
                    ? 'Email envoyé. Lien (au cas où) :'
                    : 'Lien de réinitialisation à transmettre :'}
                </p>
                <div className="flex gap-2">
                  <Input readOnly value={resetResult.url} className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={copyReset}>
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={close}>Terminer</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="py-2 space-y-2">
                <Label htmlFor="reset-email">Administrateur</Label>
                <Select value={resetEmail} onValueChange={setResetEmail}>
                  <SelectTrigger id="reset-email">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selected?.admins ?? []).map((a) => (
                      <SelectItem key={a.email} value={a.email}>
                        {a.full_name ? `${a.full_name} — ${a.email}` : a.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={close} disabled={busy}>
                  Annuler
                </Button>
                <Button onClick={confirmReset} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Générer le lien'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {isPending && <span className="sr-only">Actualisation…</span>}
    </div>
  );
}
