'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  PLANS,
  PLAN_CONFIG,
  SUBSCRIPTION_STATUSES,
  type Plan,
  type SubscriptionStatus,
} from '@/types';

interface Props {
  availableSdis: { id: string; code: string; name: string }[];
}

const STEPS = ['SDIS', 'Domaines', 'Abonnement', 'Admin'];
const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: 'Essai',
  active: 'Actif',
  suspended: 'Suspendu',
  expired: 'Expiré',
};

export function AddSdisWizard({ availableSdis }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ url: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  // Étape 1 — SDIS
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [sdisId, setSdisId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [departement, setDepartement] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Étape 2 — Domaines
  const [domains, setDomains] = useState<string[]>([]);

  // Étape 3 — Abonnement
  const [plan, setPlan] = useState<Plan>('essentiel');
  const [status, setStatus] = useState<SubscriptionStatus>('trial');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [maxUsers, setMaxUsers] = useState<string>(String(PLAN_CONFIG.essentiel.maxUsers ?? ''));
  const [maxRex, setMaxRex] = useState<string>('');

  // Étape 4 — Admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminFullName, setAdminFullName] = useState('');

  function resetAll() {
    setStep(0);
    setResult(null);
    setCopied(false);
    setMode('existing');
    setSdisId('');
    setCode('');
    setName('');
    setRegion('');
    setDepartement('');
    setLogoUrl('');
    setDomains([]);
    setPlan('essentiel');
    setStatus('trial');
    setTrialEndsAt('');
    setPeriodStart('');
    setPeriodEnd('');
    setMaxUsers(String(PLAN_CONFIG.essentiel.maxUsers ?? ''));
    setMaxRex('');
    setAdminEmail('');
    setAdminFullName('');
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetAll();
  }

  function onPlanChange(p: Plan) {
    setPlan(p);
    const def = PLAN_CONFIG[p];
    setMaxUsers(def.maxUsers === null ? '' : String(def.maxUsers));
    setMaxRex(def.maxRexPerMonth === null ? '' : String(def.maxRexPerMonth));
  }

  function canAdvance(): boolean {
    if (step === 0) {
      return mode === 'existing' ? Boolean(sdisId) : Boolean(code.trim() && name.trim());
    }
    return true;
  }

  async function handleSubmit() {
    if (!adminEmail.trim()) {
      toast.error("Email de l'administrateur requis");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        domains: domains.map((d) => d.trim()).filter(Boolean),
        plan,
        status,
        adminEmail: adminEmail.trim(),
        maxUsers: maxUsers.trim() === '' ? null : Number(maxUsers),
        maxRexPerMonth: maxRex.trim() === '' ? null : Number(maxRex),
      };
      if (mode === 'existing') payload.sdisId = sdisId;
      else {
        payload.code = code.trim();
        payload.name = name.trim();
      }
      if (region.trim()) payload.region = region.trim();
      if (departement.trim()) payload.departement = departement.trim();
      if (logoUrl.trim()) payload.logoUrl = logoUrl.trim();
      if (adminFullName.trim()) payload.adminFullName = adminFullName.trim();
      if (trialEndsAt) payload.trialEndsAt = trialEndsAt;
      if (periodStart) payload.currentPeriodStart = periodStart;
      if (periodEnd) payload.currentPeriodEnd = periodEnd;

      const res = await fetch('/api/super-admin/sdis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'onboarding");
        return;
      }
      setResult({ url: data.inviteUrl, emailSent: !!data.emailSent });
      toast.success(
        data.emailSent
          ? `SDIS créé — invitation envoyée à ${adminEmail.trim()}`
          : "SDIS créé — lien d'invitation à transmettre"
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      toast.success('Lien copié');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copie impossible — copiez le lien manuellement');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-1" />
          Ajouter un SDIS
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Ajouter un SDIS client
          </DialogTitle>
          <DialogDescription>
            Infos SDIS, domaines autorisés, plan d&apos;abonnement et compte administrateur initial.
          </DialogDescription>
        </DialogHeader>

        {/* Étape réussie : afficher le lien d'invitation */}
        {result ? (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-sm font-medium">
                {result.emailSent
                  ? "SDIS créé et email d'invitation envoyé à l'administrateur. Lien (au cas où) :"
                  : "SDIS créé. Lien d'invitation de l'administrateur à transmettre :"}
              </p>
              <div className="flex gap-2">
                <Input readOnly value={result.url} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Lien à usage unique, valable 7 jours — copiez-le maintenant.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Terminer</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-2 py-2">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-md',
                      i === step
                        ? 'bg-primary/10 text-primary'
                        : i < step
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[11px] border',
                        i <= step ? 'border-primary text-primary' : 'border-border'
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {i < STEPS.length - 1 && <span className="text-muted-foreground/40">·</span>}
                </div>
              ))}
            </div>

            <div className="py-2 min-h-[220px] space-y-4">
              {/* Étape 1 — SDIS */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={mode === 'existing' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMode('existing')}
                    >
                      SDIS existant
                    </Button>
                    <Button
                      type="button"
                      variant={mode === 'new' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMode('new')}
                    >
                      Nouveau SDIS
                    </Button>
                  </div>

                  {mode === 'existing' ? (
                    <div className="space-y-2">
                      <Label htmlFor="wiz-sdis">SDIS (non encore client)</Label>
                      <Select value={sdisId} onValueChange={setSdisId}>
                        <SelectTrigger id="wiz-sdis">
                          <SelectValue placeholder="Sélectionner un SDIS" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSdis.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.code} — {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableSdis.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Tous les SDIS de la liste sont déjà clients. Utilisez « Nouveau SDIS ».
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="wiz-code">Code</Label>
                        <Input
                          id="wiz-code"
                          placeholder="06"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="wiz-name">Nom</Label>
                        <Input
                          id="wiz-name"
                          placeholder="SDIS des Alpes-Maritimes"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wiz-dep">Département (optionnel)</Label>
                      <Input
                        id="wiz-dep"
                        placeholder="06"
                        value={departement}
                        onChange={(e) => setDepartement(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wiz-region">Région (optionnel)</Label>
                      <Input
                        id="wiz-region"
                        placeholder="PACA"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wiz-logo">URL du logo (optionnel)</Label>
                    <Input
                      id="wiz-logo"
                      placeholder="https://…/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Étape 2 — Domaines */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Domaines email autorisés pour les invitations de ce SDIS (optionnel). Sans
                    domaine, toute adresse pourra être invitée.
                  </p>
                  {domains.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="sdis06.fr"
                        value={d}
                        onChange={(e) => {
                          const next = [...domains];
                          next[i] = e.target.value;
                          setDomains(next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() => setDomains(domains.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDomains([...domains, ''])}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter un domaine
                  </Button>
                </div>
              )}

              {/* Étape 3 — Abonnement */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wiz-plan">Plan</Label>
                      <Select value={plan} onValueChange={(v) => onPlanChange(v as Plan)}>
                        <SelectTrigger id="wiz-plan">
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
                    <div className="space-y-2">
                      <Label htmlFor="wiz-status">Statut</Label>
                      <Select
                        value={status}
                        onValueChange={(v) => setStatus(v as SubscriptionStatus)}
                      >
                        <SelectTrigger id="wiz-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBSCRIPTION_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {status === 'trial' && (
                    <div className="space-y-2">
                      <Label htmlFor="wiz-trial">
                        Fin de période d&apos;essai (défaut : +30 jours)
                      </Label>
                      <Input
                        id="wiz-trial"
                        type="date"
                        value={trialEndsAt}
                        onChange={(e) => setTrialEndsAt(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wiz-pstart">Début de période</Label>
                      <Input
                        id="wiz-pstart"
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wiz-pend">Fin de période</Label>
                      <Input
                        id="wiz-pend"
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wiz-maxusers">Max utilisateurs (vide = illimité)</Label>
                      <Input
                        id="wiz-maxusers"
                        type="number"
                        min={1}
                        value={maxUsers}
                        onChange={(e) => setMaxUsers(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wiz-maxrex">Max REX / mois (vide = illimité)</Label>
                      <Input
                        id="wiz-maxrex"
                        type="number"
                        min={1}
                        value={maxRex}
                        onChange={(e) => setMaxRex(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 4 — Admin */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Un lien d&apos;invitation à usage unique sera créé pour le compte administrateur
                    initial du SDIS (rôle <strong>Administrateur</strong>).
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="wiz-admin-email">Email de l&apos;administrateur</Label>
                    <Input
                      id="wiz-admin-email"
                      type="email"
                      placeholder="referent.retex@sdis06.fr"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wiz-admin-name">Nom complet (optionnel)</Label>
                    <Input
                      id="wiz-admin-name"
                      placeholder="Capitaine Dupont"
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-row justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || submitting}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={() =>
                    canAdvance() ? setStep((s) => s + 1) : toast.error('Complétez cette étape')
                  }
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer le SDIS'}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
