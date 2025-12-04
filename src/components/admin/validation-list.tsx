'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Building2,
  User,
  AlertTriangle,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Rex, Sdis, Profile } from '@/types';

interface ValidationListProps {
  initialRex: (Rex & {
    author?: Profile;
    sdis?: Sdis;
  })[];
}

const severityConfig = {
  critique: {
    label: 'Critique',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  majeur: {
    label: 'Majeur',
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  significatif: {
    label: 'Significatif',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
};

export function ValidationList({ initialRex }: ValidationListProps) {
  const [rexList, setRexList] = useState(initialRex);
  const [selectedRex, setSelectedRex] = useState<typeof initialRex[0] | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleValidate = async (rexId: string) => {
    setIsValidating(true);
    try {
      const response = await fetch(`/api/admin/rex/${rexId}/validate`, {
        method: 'POST',
      });

      if (response.ok) {
        setRexList((prev) => prev.filter((r) => r.id !== rexId));
        toast.success('REX validé avec succès');
      } else {
        toast.error('Erreur lors de la validation');
      }
    } catch {
      toast.error('Erreur lors de la validation');
    } finally {
      setIsValidating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRex) return;
    
    setIsRejecting(true);
    try {
      const response = await fetch(`/api/admin/rex/${selectedRex.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (response.ok) {
        setRexList((prev) => prev.filter((r) => r.id !== selectedRex.id));
        setShowRejectDialog(false);
        setSelectedRex(null);
        setRejectReason('');
        toast.success('REX rejeté');
      } else {
        toast.error('Erreur lors du rejet');
      }
    } catch {
      toast.error('Erreur lors du rejet');
    } finally {
      setIsRejecting(false);
    }
  };

  if (rexList.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="py-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucun REX en attente</h3>
          <p className="text-sm text-muted-foreground">
            Tous les retours d&apos;expérience ont été traités
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {rexList.map((rex) => {
          const severity = severityConfig[rex.severity];

          return (
            <Card key={rex.id} className="border-border/50 bg-card/80 overflow-hidden">
              <div className={cn('h-1', severity.color)} />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(severity.bgColor, severity.textColor, severity.borderColor)}
                      >
                        {severity.label}
                      </Badge>
                      <Badge variant="outline" className="bg-muted/50">
                        {rex.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-orange-500/10 text-orange-500 border-orange-500/30"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        En attente
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{rex.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {rex.sdis && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      SDIS {rex.sdis.code}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(rex.intervention_date).toLocaleDateString('fr-FR')}
                  </span>
                  {rex.author && (
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      {rex.author.full_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Soumis le {new Date(rex.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                {/* Tags */}
                {rex.tags && rex.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rex.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Link href={`/rex/${rex.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Voir le détail
                    </Button>
                  </Link>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:bg-red-500/10"
                    onClick={() => {
                      setSelectedRex(rex);
                      setShowRejectDialog(true);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeter
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleValidate(rex.id)}
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Valider
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter ce REX</DialogTitle>
            <DialogDescription>
              Indiquez la raison du rejet. L&apos;auteur sera notifié.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Raison du rejet (optionnel)..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedRex(null);
                setRejectReason('');
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
