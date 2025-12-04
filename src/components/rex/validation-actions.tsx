'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { CheckCircle, XCircle, Loader2, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ValidationActionsProps {
  rexId: string;
  currentStatus: string;
  isAdmin: boolean;
  isAuthor: boolean;
}

export function ValidationActions({ 
  rexId, 
  currentStatus, 
  isAdmin,
  isAuthor 
}: ValidationActionsProps) {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const response = await fetch(`/api/rex/${rexId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate' }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la validation');
      }

      toast.success('REX validé avec succès');
      router.refresh();
    } catch {
      toast.error('Erreur lors de la validation');
    } finally {
      setIsValidating(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Veuillez indiquer une raison');
      return;
    }

    setIsRejecting(true);
    try {
      const response = await fetch(`/api/rex/${rexId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject',
          reason: rejectReason 
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du rejet');
      }

      toast.success('REX rejeté');
      setShowRejectDialog(false);
      setRejectReason('');
      router.refresh();
    } catch {
      toast.error('Erreur lors du rejet');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/rex/${rexId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      toast.success('REX supprimé');
      router.push('/rex');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Only show for pending REX to admins, or for authors on their drafts
  const showValidationActions = isAdmin && currentStatus === 'pending';
  const showDeleteAction = isAuthor || isAdmin;

  if (!showValidationActions && !showDeleteAction) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {showValidationActions && (
            <>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleValidate}
                disabled={isValidating}
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Valider ce REX
              </Button>
              <Button
                variant="outline"
                className="w-full border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                onClick={() => setShowRejectDialog(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejeter
              </Button>
            </>
          )}

          {showDeleteAction && (
            <Button
              variant="outline"
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeter ce REX ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;auteur sera notifié et pourra modifier son REX avant de le soumettre à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-reason">Raison du rejet</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Expliquez pourquoi ce REX est rejeté..."
              className="mt-2"
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isRejecting || !rejectReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRejecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Rejeter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce REX ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le REX et tous ses commentaires seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
