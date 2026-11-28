'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import dynamic from 'next/dynamic';
import { REX_TYPES, SEVERITIES, VISIBILITIES } from '@/types';
import { ImageUpload } from './image-upload';
import { ProductionTypePicker } from './production-type-picker';
import { FocusThematiqueEditor } from './focus-thematique-editor';
import { KeyFiguresEditor } from './key-figures-editor';
import { TimelineEditor } from './timeline-editor';
import { PrescriptionsEditor } from './prescriptions-editor';
import { TemoignagesEditor } from './temoignages-editor';
import { RessourcesEditor } from './ressources-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Save, Send, X, Plus, ChevronDown, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SEVERITY_CONFIG,
  VISIBILITY_LABELS,
  VISIBILITY_CONFIG,
  badgeClasses,
} from '@/lib/constants';
import { getRequiredFieldsForType } from '@/lib/validators/rex';
import { rexFormDefaults, type RexFormData } from '@/lib/rex-form-data';
import {
  rexFieldErrors,
  fieldErrorsFromServer,
  rexFieldHint,
  REX_FIELD_LABELS,
  type RexFieldErrors,
} from '@/lib/rex-form-errors';
import {
  draftKey,
  browserDraftStorage,
  saveLocalDraft,
  parseLocalDraft,
  clearLocalDraft,
  hasUnsavedChanges,
  type LocalDraft,
} from '@/lib/rex-draft-storage';

// Lazy-load TiptapEditor (@tiptap ~150KB)
const TiptapEditor = dynamic(() => import('./tiptap-editor').then((m) => m.TiptapEditor), {
  ssr: false,
  loading: () => (
    <div className="border border-border rounded-lg bg-background/50 min-h-[150px] flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-label="Chargement" />
    </div>
  ),
});

type FieldName = keyof RexFormData;

/** Ordre des champs à l'écran : c'est celui dans lequel on amène au premier en erreur. */
const FIELD_ORDER: FieldName[] = [
  'title',
  'intervention_date',
  'intervention_heure',
  'type',
  'severity',
  'localisation',
  'commune',
  'visibility',
  'tags',
  'description',
  'message_ambiance',
  'sitac',
  'context',
  'means_deployed',
  'elements_favorables',
  'elements_defavorables',
  'difficulties',
  'lessons_learned',
  'focus_thematiques',
  'objectifs',
  'donnees_sources',
  'methode_argumentation',
  'documentation_operationnelle',
];

/** Champs de chaque section repliable : une erreur dans l'une d'elles la déplie. */
const SECTION_FIELDS: Record<string, FieldName[]> = {
  context: ['message_ambiance', 'sitac', 'context', 'means_deployed'],
  analysis: ['elements_favorables', 'elements_defavorables', 'difficulties', 'lessons_learned'],
};

const LEAVE_MESSAGE =
  'Des modifications ne sont pas enregistrées. Elles resteront proposées sur cet appareil ' +
  'pendant sept jours. Quitter la page ?';

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// --- Saisie retrouvée sur l'appareil ------------------------------------------
//
// Lue UNE fois par montage du formulaire. `useSyncExternalStore` plutôt qu'un
// effet : le rendu serveur et l'hydratation voient « rien », puis le navigateur
// voit la saisie — sans écart d'hydratation ni état posé depuis un effet.
// Mémorisée ici pour que la sauvegarde automatique, qui réécrit la même clé, ne
// fasse pas réapparaître le bandeau en cours de frappe.
const firstRead = new Map<string, string | null>();
const noopSubscribe = () => () => {};

function readOnce(key: string): string | null {
  if (!firstRead.has(key)) {
    let raw: string | null = null;
    try {
      raw = browserDraftStorage()?.getItem(key) ?? null;
    } catch {
      raw = null;
    }
    firstRead.set(key, raw);
  }
  return firstRead.get(key) ?? null;
}

interface RexFormProps {
  initialData?: Partial<RexFormData>;
  rexId?: string;
  mode?: 'create' | 'edit';
  /** Utilisateur connecté : la saisie conservée sur l'appareil lui est propre. */
  userId?: string;
  /**
   * Statut du REX modifié. Hors brouillon (un admin qui corrige un REX en
   * attente ou validé), le formulaire enregistre sans toucher au statut.
   */
  currentStatus?: string;
}

export function RexForm({
  initialData,
  rexId,
  mode = 'create',
  userId,
  currentStatus = 'draft',
}: RexFormProps) {
  const baseline = useMemo(() => rexFormDefaults(initialData), [initialData]);
  const storageKey = userId ? draftKey(userId, rexId ?? null) : null;

  const [openedAt] = useState(() => Date.now());
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => (storageKey ? readOnce(storageKey) : null),
    () => null
  );
  useEffect(() => {
    if (!storageKey) return;
    return () => {
      firstRead.delete(storageKey);
    };
  }, [storageKey]);

  const [decision, setDecision] = useState<'pending' | 'restored' | 'ignored'>('pending');
  const [start, setStart] = useState<{ data: RexFormData; version: number; restoredAt?: number }>({
    data: baseline,
    version: 0,
  });

  // Proposée seulement si elle diffère de ce qui est enregistré : après un
  // enregistrement réussi, la copie locale est effacée, mais un onglet fermé
  // dans la seconde peut en laisser une identique.
  const found: LocalDraft | null = useMemo(() => {
    if (decision !== 'pending' || !raw) return null;
    const draft = parseLocalDraft(raw, openedAt);
    return draft && hasUnsavedChanges(baseline, draft.data) ? draft : null;
  }, [decision, raw, openedAt, baseline]);

  return (
    <>
      {found && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-sm"
        >
          <div className="min-w-[240px] flex-1">
            <p className="font-semibold text-foreground">
              Une saisie non enregistrée a été retrouvée sur cet appareil.
            </p>
            <p className="mt-1 text-muted-foreground">
              Dernière frappe le{' '}
              {new Date(found.savedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
              })}{' '}
              à {formatTime(found.savedAt)}.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setStart({ data: found.data, version: 1, restoredAt: found.savedAt });
              setDecision('restored');
            }}
          >
            Reprendre cette saisie
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (storageKey) clearLocalDraft(browserDraftStorage(), storageKey);
              setDecision('ignored');
            }}
          >
            L&apos;ignorer
          </Button>
        </div>
      )}

      <RexFormFields
        // Reprendre une saisie remonte le formulaire : les éditeurs de texte
        // riche ne lisent leur contenu qu'à leur création.
        key={start.version}
        startData={start.data}
        baseline={baseline}
        rexId={rexId}
        mode={mode}
        currentStatus={currentStatus}
        storageKey={storageKey}
        // Tant que l'utilisateur n'a pas choisi, on n'écrit pas par-dessus la
        // saisie retrouvée.
        autosave={!found}
        restoredAt={start.restoredAt}
      />
    </>
  );
}

// --- Petits composants de champ -----------------------------------------------

function RequiredMark() {
  return (
    <>
      <span className="text-destructive" aria-hidden="true">
        *
      </span>
      <span className="sr-only"> (requis)</span>
    </>
  );
}

/** Aide et erreur d'un champ. Leurs identifiants sont ceux que vise `aria-describedby`. */
function FieldMessage({
  name,
  hint,
  error,
}: {
  name: string;
  hint?: string | null;
  error?: string;
}) {
  return (
    <>
      {hint && (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </>
  );
}

const describedBy = (name: string, hint?: string | null, error?: string) =>
  [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean).join(' ') ||
  undefined;

/** En-tête d'une section repliable : un vrai bouton, donc utilisable au clavier. */
function SectionTrigger({ title, description }: { title: string; description: string }) {
  return (
    <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 rounded-xl px-6 py-6 text-left transition-colors hover:bg-muted/50">
      <span>
        <span className="block text-lg font-semibold leading-none">{title}</span>
        <span className="mt-2 block text-sm text-muted-foreground">{description}</span>
      </span>
      <ChevronDown
        className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </CollapsibleTrigger>
  );
}

// --- Formulaire -----------------------------------------------------------------

interface RexFormFieldsProps {
  startData: RexFormData;
  baseline: RexFormData;
  rexId?: string;
  mode: 'create' | 'edit';
  currentStatus: string;
  storageKey: string | null;
  autosave: boolean;
  restoredAt?: number;
}

type Action = 'draft' | 'pending' | 'save';

function RexFormFields({
  startData,
  baseline,
  rexId,
  mode,
  currentStatus,
  storageKey,
  autosave,
  restoredAt,
}: RexFormFieldsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<Action | null>(null);
  const isSubmitting = submitting !== null;
  const [tagInput, setTagInput] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['context', 'analysis'])
  );
  const [fieldErrors, setFieldErrors] = useState<RexFieldErrors>({});
  const [localSavedAt, setLocalSavedAt] = useState<number | null>(restoredAt ?? null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    {
      id: string;
      file_name: string;
      file_type: string;
      file_size: number;
      storage_path: string;
      url: string;
    }[]
  >([]);

  const { register, setValue, watch, getValues } = useForm<RexFormData>({
    // Liste unique des champs, partagée avec la page d'édition : voir
    // `rex-form-data.ts` pour ce qu'a coûté d'en tenir deux.
    defaultValues: startData,
  });

  const values = watch();
  const typeProduction = values.type_production;
  const tags = values.tags ?? [];

  // Ce que le serveur a enregistré : la référence de « modifié ou non ».
  const savedRef = useRef<RexFormData>(baseline);
  // Levé juste avant une sortie voulue (abandon confirmé).
  const leavingRef = useRef(false);

  const unsaved = () => !leavingRef.current && hasUnsavedChanges(savedRef.current, getValues());

  // --- Copie de la saisie sur l'appareil ---------------------------------------
  // Aucune sauvegarde automatique n'existait : un onglet fermé ou une session
  // expirée, et la saisie était perdue. Voir `rex-draft-storage.ts` pour le
  // choix d'une copie locale plutôt qu'un enregistrement serveur.
  const flushRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!storageKey || !autosave) return;
    const storage = browserDraftStorage();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      const current = getValues();
      if (!leavingRef.current && hasUnsavedChanges(savedRef.current, current)) {
        if (saveLocalDraft(storage, storageKey, current)) setLocalSavedAt(Date.now());
      } else {
        clearLocalDraft(storage, storageKey);
        setLocalSavedAt(null);
      }
    };
    flushRef.current = flush;

    const subscription = watch(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 800);
    });

    return () => {
      subscription.unsubscribe();
      // Une frappe en attente d'écriture ne doit pas se perdre au démontage.
      if (timer) {
        clearTimeout(timer);
        const current = getValues();
        if (!leavingRef.current && hasUnsavedChanges(savedRef.current, current)) {
          saveLocalDraft(storage, storageKey, current);
        }
      }
      flushRef.current = () => {};
    };
  }, [storageKey, autosave, watch, getValues]);

  // --- Alerte de sortie ---------------------------------------------------------
  useEffect(() => {
    const hasUnsaved = () =>
      !leavingRef.current && hasUnsavedChanges(savedRef.current, getValues());

    // Fermeture de l'onglet, rechargement, adresse saisie à la main.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsaved()) return;
      flushRef.current();
      event.preventDefault();
      event.returnValue = '';
    };

    // Lien de l'application (menu, fil d'Ariane). Le routeur de Next n'offre pas
    // de moyen de retenir une navigation : on intercepte le clic avant lui.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      if (!hasUnsaved()) return;
      flushRef.current();
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [getValues]);

  // --- Champs -------------------------------------------------------------------

  const clearError = (name: string) =>
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  /** Écrit un champ et retire son erreur : elle ne vaut plus pour la nouvelle valeur. */
  const setField = <K extends FieldName>(name: K, value: RexFormData[K]) => {
    // Le type générique de `setValue` ne suit pas une clé paramétrée.
    (setValue as (n: FieldName, v: unknown, o?: { shouldDirty: boolean }) => void)(name, value, {
      shouldDirty: true,
    });
    clearError(name);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setField('tags', [...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setField(
      'tags',
      tags.filter((tag) => tag !== tagToRemove)
    );
  };

  /**
   * Champs marqués obligatoires dans le formulaire.
   *
   * Délègue à `getRequiredFieldsForType`, source unique partagée avec la
   * validation serveur, l'indicateur de complétion et le bouton de promotion.
   *
   * `severity` est ajoutée ici : le formulaire l'exige de tous les niveaux,
   * alors que le plan type ne la liste pas comme rubrique.
   */
  const isFieldRequired = (field: string): boolean => {
    if (field === 'severity') return true;
    return getRequiredFieldsForType(typeProduction).includes(field);
  };

  const focusField = (name: string) => {
    const element = document.getElementById(name) ?? document.getElementById(`field-${name}`);
    if (!element) return;
    element.scrollIntoView({ block: 'center' });
    element.focus({ preventScroll: true });
  };

  /** Affiche les erreurs sous les champs, déplie ce qui les cache, et amène à la première. */
  const showErrors = (errors: RexFieldErrors) => {
    setFieldErrors(errors);
    setExpandedSections((prev) => {
      const next = new Set(prev);
      for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
        if (fields.some((field) => errors[field])) next.add(section);
      }
      return next;
    });
    const count = Object.keys(errors).length;
    toast.error(count > 1 ? `${count} champs sont à corriger` : 'Un champ est à corriger');
    const first = FIELD_ORDER.find((field) => errors[field]) ?? Object.keys(errors)[0];
    // Après le rendu : la section qui contient le champ vient d'être dépliée.
    window.setTimeout(() => focusField(first), 60);
  };

  // --- Enregistrement -----------------------------------------------------------

  // Hors brouillon, le statut n'est pas envoyé : l'API ne touche alors pas à la
  // colonne. Le formulaire envoyait toujours « brouillon » ou « en attente », si
  // bien qu'un admin ne pouvait pas corriger un REX validé sans le dépublier.
  const keepsStatus = mode === 'edit' && currentStatus !== 'draft';

  const submit = async (action: Action) => {
    const data = getValues();
    const status = action === 'save' ? null : action;

    // Mêmes schémas que le serveur, appliqués avant l'envoi : l'utilisateur
    // voit ce qui manque sous chaque champ, au lieu de « Données invalides ».
    const errors = rexFieldErrors(data, status ?? 'pending');
    if (Object.keys(errors).length > 0) {
      showErrors(errors);
      return;
    }

    setSubmitting(action);
    try {
      const endpoint = mode === 'edit' ? `/api/rex/${rexId}` : '/api/rex';
      const response = await fetch(endpoint, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          ...(status ? { status } : {}),
          attachmentIds: uploadedFiles.map((f) => f.id),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        // Filet : si la validation du serveur refuse ce que celle du
        // navigateur a laissé passer, son détail par champ est affiché aussi.
        const serverErrors = fieldErrorsFromServer(body.errors);
        if (Object.keys(serverErrors).length > 0) {
          showErrors(serverErrors);
          return;
        }
        throw new Error(body.message || "L'enregistrement a échoué");
      }

      const saved = (await response.json()) as { id?: string };
      const savedId = saved.id ?? rexId;

      // Le serveur a désormais cette version : plus rien à reprendre ni à
      // signaler à la sortie.
      savedRef.current = data;
      if (storageKey) clearLocalDraft(browserDraftStorage(), storageKey);
      setLocalSavedAt(null);
      setFieldErrors({});

      if (action === 'draft') {
        toast.success('Brouillon enregistré');
        // On reste sur le formulaire : « Enregistrer brouillon » renvoyait à la
        // liste, et il fallait rouvrir le REX pour continuer à écrire. Un
        // nouveau REX passe sur sa page de modification, où les
        // enregistrements suivants le mettront à jour au lieu d'en créer un autre.
        if (mode === 'create' && savedId) router.replace(`/rex/${savedId}/edit`);
        return;
      }

      toast.success(
        action === 'pending' ? 'REX soumis pour validation' : 'Modifications enregistrées'
      );
      router.push(savedId ? `/rex/${savedId}` : '/rex');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(null);
    }
  };

  const cancel = () => {
    if (unsaved()) {
      setConfirmCancel(true);
      return;
    }
    router.back();
  };

  const abandon = () => {
    leavingRef.current = true;
    if (storageKey) clearLocalDraft(browserDraftStorage(), storageKey);
    router.back();
  };

  // --- Rendu --------------------------------------------------------------------

  const errorFields = FIELD_ORDER.filter((field) => fieldErrors[field]);

  /** Champ de texte riche : libellé, éditeur, seuil annoncé, erreur. */
  const richField = (
    name: FieldName,
    label: string,
    placeholder: string,
    extra: { badge?: ReactNode; note?: ReactNode } = {}
  ) => {
    const hint = rexFieldHint(name, typeProduction);
    const error = fieldErrors[name];
    const labelId = `${name}-label`;
    return (
      <div className="space-y-2" id={`field-${name}`}>
        {/* Pas un <label> : il ne peut pas désigner une zone éditable. Le lien
            se fait par `aria-labelledby`, dans l'éditeur. */}
        <div id={labelId} className="flex items-center gap-2 text-sm font-medium leading-none">
          <span>
            {label} {isFieldRequired(name) && <RequiredMark />}
          </span>
          {extra.badge}
        </div>
        <TiptapEditor
          id={name}
          labelledBy={labelId}
          describedBy={`${name}-hint ${name}-error`}
          invalid={Boolean(error)}
          required={isFieldRequired(name)}
          content={(values[name] as string) || ''}
          onChange={(content) => setField(name, content as RexFormData[typeof name])}
          placeholder={placeholder}
        />
        <FieldMessage name={name} hint={hint} error={error} />
        {extra.note}
      </div>
    );
  };

  const recommended = (
    <Badge variant="outline" className="text-xs font-normal">
      Recommandé
    </Badge>
  );
  const annexNote = (text: string) => (
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      <Info className="w-3 h-3" aria-hidden="true" />
      {text}
    </p>
  );

  return (
    <form className="space-y-6" noValidate onSubmit={(event) => event.preventDefault()}>
      {/* Production Type Picker */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="pt-6">
          <ProductionTypePicker
            value={typeProduction}
            onChange={(value) => setField('type_production', value)}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Informations générales</CardTitle>
          <CardDescription>
            Les champs marqués d&apos;un astérisque sont requis. L&apos;intitulé, la date, le type
            et la criticité le sont aussi pour enregistrer un brouillon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              <span>
                Intitulé de l&apos;intervention <RequiredMark />
              </span>
            </Label>
            <Input
              id="title"
              {...register('title', { onChange: () => clearError('title') })}
              placeholder="Ex: Feu d'habitation R+3 - Centre-ville Nice"
              className="bg-background/50"
              aria-required="true"
              aria-invalid={fieldErrors.title ? true : undefined}
              aria-describedby={describedBy(
                'title',
                rexFieldHint('title', typeProduction),
                fieldErrors.title
              )}
            />
            <FieldMessage
              name="title"
              hint={rexFieldHint('title', typeProduction)}
              error={fieldErrors.title}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="intervention_date">
                <span>
                  Date d&apos;intervention <RequiredMark />
                </span>
              </Label>
              <Input
                id="intervention_date"
                type="date"
                {...register('intervention_date', {
                  onChange: () => clearError('intervention_date'),
                })}
                className="bg-background/50"
                aria-required="true"
                aria-invalid={fieldErrors.intervention_date ? true : undefined}
                aria-describedby={describedBy(
                  'intervention_date',
                  null,
                  fieldErrors.intervention_date
                )}
              />
              <FieldMessage name="intervention_date" error={fieldErrors.intervention_date} />
            </div>

            {/* Heure — plan type PEX (annexe D), rubrique « date et heure ».
                Facultative : beaucoup de signalements ne la connaissent pas,
                mais une intervention de nuit ou d'heure de pointe ne se lit
                pas comme une autre. */}
            <div className="space-y-2">
              <Label htmlFor="intervention_heure">Heure d&apos;intervention</Label>
              <Input
                id="intervention_heure"
                type="time"
                {...register('intervention_heure', {
                  onChange: () => clearError('intervention_heure'),
                })}
                className="bg-background/50"
                aria-invalid={fieldErrors.intervention_heure ? true : undefined}
                aria-describedby={describedBy(
                  'intervention_heure',
                  null,
                  fieldErrors.intervention_heure
                )}
              />
              <FieldMessage name="intervention_heure" error={fieldErrors.intervention_heure} />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                <span>
                  Type d&apos;intervention <RequiredMark />
                </span>
              </Label>
              <Select value={values.type} onValueChange={(value) => setField('type', value)}>
                <SelectTrigger
                  id="type"
                  className="bg-background/50"
                  aria-required="true"
                  aria-invalid={fieldErrors.type ? true : undefined}
                  aria-describedby={describedBy('type', null, fieldErrors.type)}
                >
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {REX_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldMessage name="type" error={fieldErrors.type} />
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label htmlFor="severity">
                <span>
                  Niveau de criticité <RequiredMark />
                </span>
              </Label>
              <Select
                value={values.severity}
                onValueChange={(value) => setField('severity', value)}
              >
                <SelectTrigger
                  id="severity"
                  className="bg-background/50"
                  aria-required="true"
                  aria-invalid={fieldErrors.severity ? true : undefined}
                  aria-describedby={describedBy('severity', null, fieldErrors.severity)}
                >
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((sev) => (
                    <SelectItem key={sev} value={sev}>
                      <div className="flex items-center gap-2">
                        <div
                          aria-hidden="true"
                          className={cn('w-2 h-2 rounded-full', SEVERITY_CONFIG[sev].color)}
                        />
                        {SEVERITY_CONFIG[sev].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldMessage name="severity" error={fieldErrors.severity} />
            </div>
          </div>

          {/* Lieu — plan type PEX (annexe D) et RETEX (annexe E), rubrique
              « lieu de l'intervention ». La commune est séparée du libellé :
              c'est elle qui rend le REX filtrable et cartographiable, là où le
              lieu écrit dans le titre ne l'était pas. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="localisation">Lieu de l&apos;intervention</Label>
              <Input
                id="localisation"
                {...register('localisation', { onChange: () => clearError('localisation') })}
                placeholder="Parking souterrain Nice Étoile, 30 av. Jean Médecin"
                className="bg-background/50"
                aria-invalid={fieldErrors.localisation ? true : undefined}
                aria-describedby={describedBy('localisation', null, fieldErrors.localisation)}
              />
              <FieldMessage name="localisation" error={fieldErrors.localisation} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commune">Commune</Label>
              <Input
                id="commune"
                {...register('commune', { onChange: () => clearError('commune') })}
                placeholder="Nice"
                className="bg-background/50"
                aria-invalid={fieldErrors.commune ? true : undefined}
                aria-describedby={describedBy('commune', null, fieldErrors.commune)}
              />
              <FieldMessage name="commune" error={fieldErrors.commune} />
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label htmlFor="visibility">Visibilité</Label>
            <Select
              value={values.visibility}
              onValueChange={(value) => setField('visibility', value)}
            >
              <SelectTrigger
                id="visibility"
                className="bg-background/50 w-full md:w-1/3"
                aria-describedby="visibility-hint"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITIES.map((vis) => (
                  <SelectItem key={vis} value={vis}>
                    {VISIBILITY_LABELS[vis]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Ce que le choix entraîne : le validateur le verra aussi avant d'approuver. */}
            <p id="visibility-hint" className="text-xs text-muted-foreground">
              {VISIBILITY_CONFIG[values.visibility as keyof typeof VISIBILITY_CONFIG]?.description}
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tag-input">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Ajouter un tag puis Entrée..."
                className="bg-background/50"
                aria-describedby="tag-input-hint"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag} aria-label="Ajouter le tag">
                <Plus className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
            <p id="tag-input-hint" className="text-xs text-muted-foreground">
              Appuyez sur Entrée ou sur le bouton + pour ajouter un tag
            </p>
            {tags.length > 0 && (
              <ul className="flex flex-wrap gap-2 mt-2" aria-label="Tags ajoutés">
                {tags.map((tag) => (
                  <li key={tag}>
                    {/* Un bouton, et non un badge cliquable : retirer un tag
                        était impossible au clavier. */}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Retirer le tag ${tag}`}
                      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-destructive/20"
                    >
                      {tag}
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chiffres clés */}
      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <KeyFiguresEditor
          value={values.key_figures ?? {}}
          onChange={(value) => setField('key_figures', value)}
        />
      </Card>

      {/* Synthèse */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Synthèse</CardTitle>
          <CardDescription>Description générale de l&apos;intervention</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {richField(
            'description',
            'Description',
            "Décrivez brièvement l'intervention et ses enjeux principaux..."
          )}
        </CardContent>
      </Card>

      {/* Section Contexte - Visible pour PEX et RETEX */}
      {(typeProduction === 'pex' || typeProduction === 'retex') && (
        <Collapsible
          open={expandedSections.has('context')}
          onOpenChange={() => toggleSection('context')}
        >
          <Card className="border-border/50 bg-card/80 gap-0 py-0">
            <SectionTrigger
              title="Contexte opérationnel"
              description="Message d'ambiance, situation tactique, moyens engagés"
            />
            <CollapsibleContent>
              <CardContent className="space-y-6 pb-6">
                {typeProduction === 'retex' &&
                  richField(
                    'message_ambiance',
                    "Message d'ambiance",
                    "Perception du premier COS à son arrivée, 'bande sons' ou expression de sa perception SLLX...",
                    { badge: recommended, note: annexNote("Selon l'Annexe F du mémento DGSCGC") }
                  )}

                {typeProduction === 'retex' &&
                  richField(
                    'sitac',
                    'SITAC (Situation Tactique)',
                    'Description de la situation tactique, cartographie, représentation schématique du bâtiment...',
                    { badge: recommended }
                  )}

                <Separator />

                {richField(
                  'context',
                  'Contexte opérationnel',
                  "Décrivez le contexte de l'intervention (lieu, conditions, situation initiale)..."
                )}

                {richField(
                  'means_deployed',
                  'Moyens engagés',
                  'Listez les moyens humains et matériels engagés...'
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Section Analyse - Visible pour PEX et RETEX */}
      {(typeProduction === 'pex' || typeProduction === 'retex') && (
        <Collapsible
          open={expandedSections.has('analysis')}
          onOpenChange={() => toggleSection('analysis')}
        >
          <Card className="border-border/50 bg-card/80 gap-0 py-0">
            <SectionTrigger
              title="Analyse"
              description="Éléments favorables/défavorables, difficultés, enseignements"
            />
            <CollapsibleContent>
              <CardContent className="space-y-6 pb-6">
                {richField(
                  'elements_favorables',
                  'Éléments favorables',
                  "Éléments facilitateurs pour la gestion de l'intervention...",
                  {
                    badge: (
                      <Badge
                        variant="outline"
                        className={cn('text-xs font-normal', badgeClasses('green'))}
                      >
                        Facilitateurs
                      </Badge>
                    ),
                  }
                )}

                {richField(
                  'elements_defavorables',
                  'Éléments défavorables',
                  "Éléments perturbateurs et déstabilisants pour la gestion de l'intervention...",
                  {
                    badge: (
                      <Badge
                        variant="outline"
                        className={cn('text-xs font-normal', badgeClasses('red'))}
                      >
                        Perturbateurs
                      </Badge>
                    ),
                  }
                )}

                <Separator />

                {richField(
                  'difficulties',
                  'Difficultés rencontrées',
                  'Décrivez les difficultés et obstacles rencontrés...'
                )}

                {richField(
                  'lessons_learned',
                  'Enseignements',
                  'Quels sont les enseignements à retenir de cette intervention ?'
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Timeline chronologique - Visible pour PEX et RETEX */}
      {(typeProduction === 'pex' || typeProduction === 'retex') && (
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <TimelineEditor
            value={values.chronologie ?? []}
            onChange={(value) => setField('chronologie', value)}
          />
        </Card>
      )}

      {/* Focus Thématiques - Requis pour RETEX */}
      {typeProduction === 'retex' && (
        <Card
          id="field-focus_thematiques"
          tabIndex={-1}
          className={cn(
            'border-border/50 bg-card/80',
            fieldErrors.focus_thematiques && 'border-destructive'
          )}
        >
          <CardHeader>
            <CardTitle className="text-lg">Focus thématiques</CardTitle>
            <CardDescription>Analyse détaillée par thème selon le mémento DGSCGC</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FocusThematiqueEditor
              value={values.focus_thematiques ?? []}
              onChange={(value) => setField('focus_thematiques', value)}
              disabled={isSubmitting}
              required={isFieldRequired('focus_thematiques')}
            />
            <FieldMessage name="focus_thematiques" error={fieldErrors.focus_thematiques} />
          </CardContent>
        </Card>
      )}

      {/* Prescriptions - Visible pour PEX et RETEX */}
      {(typeProduction === 'pex' || typeProduction === 'retex') && (
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <PrescriptionsEditor
            value={values.prescriptions ?? []}
            onChange={(value) => setField('prescriptions', value)}
          />
        </Card>
      )}

      {/* Témoignages / Verbatims - Visible pour PEX et RETEX */}
      {(typeProduction === 'pex' || typeProduction === 'retex') && (
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <TemoignagesEditor
            value={values.temoignages ?? []}
            onChange={(value) => setField('temoignages', value)}
          />
        </Card>
      )}

      {/* Description de l'ouvrage/site - Visible pour PEX et RETEX */}
      {(typeProduction === 'pex' || typeProduction === 'retex') && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">Description de l&apos;ouvrage / site</CardTitle>
            <CardDescription>
              Tunnels, bâtiments ERP, sites industriels, ETARE... Dimensions, équipements de
              sécurité, plans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {richField(
              'description_site',
              "Description de l'ouvrage ou du site",
              "Décrivez l'ouvrage ou le site concerné par l'intervention..."
            )}
          </CardContent>
        </Card>
      )}

      {/* Démarche RETEX — rubriques 2, 4 et 6 du plan type (annexe E).
          Affichées pour le seul RETEX : le mémento veut un PEX léger, et les
          imposer à une synthèse de quatre pages contredirait la doctrine. */}
      {typeProduction === 'retex' && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">Démarche du RETEX</CardTitle>
            <CardDescription>
              Ce qui distingue un RETEX d&apos;une synthèse : pourquoi il est mené, d&apos;où
              viennent les informations, et comment elles ont été analysées
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {richField(
              'objectifs',
              'Objectifs du RETEX',
              'Ce que la démarche cherche à établir, et pourquoi cette intervention a été retenue...',
              { note: annexNote('Plan type RETEX — Annexe E, rubrique 2') }
            )}

            {richField(
              'donnees_sources',
              'Données et sources',
              "Nature des données et méthodes de collecte : entretiens, rapports d'intervention, enregistrements radio, main courante...",
              { note: annexNote('Plan type RETEX — Annexe E, rubrique 4') }
            )}

            {richField(
              'methode_argumentation',
              'Argumentation de la méthode',
              "Justification de la démarche d'analyse retenue, et ses limites...",
              { note: annexNote('Plan type RETEX — Annexe E, rubrique 6') }
            )}
          </CardContent>
        </Card>
      )}

      {/* Documentation opérationnelle - Visible pour RETEX */}
      {typeProduction === 'retex' && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">Documentation opérationnelle</CardTitle>
            <CardDescription>Références bibliographiques (GNR, GDO, GTO, RO...)</CardDescription>
          </CardHeader>
          <CardContent>
            {richField(
              'documentation_operationnelle',
              'Références documentaires',
              'Listez les références documentaires utilisées ou à consulter...'
            )}
          </CardContent>
        </Card>
      )}

      {/* Ressources complémentaires - Visible pour PEX et RETEX */}
      {(typeProduction === 'pex' || typeProduction === 'retex') && (
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <RessourcesEditor
            value={values.ressources_complementaires ?? []}
            onChange={(value) => setField('ressources_complementaires', value)}
          />
        </Card>
      )}

      {/* Attachments */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Pièces jointes</CardTitle>
          <CardDescription>Photos, schémas, documents complémentaires</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            rexId={rexId}
            files={uploadedFiles}
            onFilesChange={setUploadedFiles}
            maxFiles={10}
            maxSizeMB={5}
          />
        </CardContent>
      </Card>

      {/* Barre d'actions, collée en bas de l'écran pendant toute la saisie.
          `flex-wrap` : les libellés complets demandent plus de 500 px, un
          téléphone en offre 375. */}
      <div className="sticky bottom-4 space-y-3 rounded-lg border border-border/50 bg-background/90 p-3 backdrop-blur-sm sm:p-4">
        {/* Résumé des erreurs. `role="alert"` ici seulement : annoncer chaque
            message sous son champ ferait parler le lecteur d'écran dix fois. */}
        {errorFields.length > 0 && (
          <div role="alert" className="text-sm">
            <p className="flex items-center gap-1.5 font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {errorFields.length > 1
                ? `${errorFields.length} champs sont à corriger avant l'enregistrement :`
                : "Un champ est à corriger avant l'enregistrement :"}
            </p>
            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {errorFields.map((field) => (
                <li key={field}>
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-destructive"
                    onClick={() => focusField(field)}
                  >
                    {REX_FIELD_LABELS[field] ?? field}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Témoin de la copie locale. Pas de `aria-live` : il change à chaque
            pause de frappe, et serait lu en boucle. */}
        {storageKey && (
          <p className="text-xs text-muted-foreground sm:text-right">
            {localSavedAt
              ? `Saisie conservée sur cet appareil à ${formatTime(localSavedAt)}`
              : 'Votre saisie est conservée sur cet appareil au fil de la frappe'}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Button type="button" variant="outline" onClick={cancel} disabled={isSubmitting}>
            Annuler
          </Button>
          {keepsStatus ? (
            <Button type="button" onClick={() => submit('save')} disabled={isSubmitting}>
              {submitting === 'save' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="w-4 h-4 mr-2" aria-hidden="true" />
              )}
              <span className="sm:hidden">Enregistrer</span>
              <span className="hidden sm:inline">Enregistrer les modifications</span>
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => submit('draft')}
                disabled={isSubmitting}
              >
                {submitting === 'draft' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                )}
                <span className="sm:hidden">Brouillon</span>
                <span className="hidden sm:inline">Enregistrer le brouillon</span>
              </Button>
              <Button
                type="button"
                onClick={() => submit('pending')}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-primary to-red-800"
              >
                {submitting === 'pending' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="w-4 h-4 mr-2" aria-hidden="true" />
                )}
                <span className="sm:hidden">Soumettre</span>
                <span className="hidden sm:inline">Soumettre pour validation</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* « Annuler » faisait un retour arrière sans rien demander. */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce que vous avez saisi depuis le dernier enregistrement sera perdu, y compris la copie
              conservée sur cet appareil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer la saisie</AlertDialogCancel>
            <AlertDialogAction onClick={abandon}>Abandonner</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
