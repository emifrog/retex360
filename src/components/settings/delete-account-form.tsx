'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const CONFIRMATION_TEXT = 'SUPPRIMER MON COMPTE';

export function DeleteAccountForm() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmation !== CONFIRMATION_TEXT) {
      toast.error('Veuillez saisir le texte de confirmation exactement');
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/profile/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: CONFIRMATION_TEXT }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      toast.success('Votre compte a été supprimé');
      router.push('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="bg-card border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Supprimer mon compte
        </CardTitle>
        {/* Libellé aligné sur ce qui se passe réellement (cf. la route de
            suppression) : les données personnelles sont effacées, les REX et
            commentaires restent, anonymisés. Le texte précédent annonçait la
            suppression des REX — ce que la route ne faisait pas, et n'aurait pas
            dû faire : un REX validé et partagé est la mémoire du service. */}
        <CardDescription>
          Cette action est irréversible. Vos données personnelles seront effacées : nom, adresse
          e-mail, grade, avatar, favoris et notifications. Vos REX et commentaires sont conservés
          pour le service, sans votre nom.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Supprimer mon compte
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Confirmer la suppression du compte
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Cette action est <strong>irréversible</strong>. Votre nom, votre adresse e-mail,
                    votre grade, votre avatar, vos favoris et vos notifications seront effacés, et
                    vous ne pourrez plus vous connecter.
                  </p>
                  <p>
                    Vos REX et vos commentaires restent accessibles au service, attribués à un
                    auteur anonyme.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirmation">
                      Tapez <strong>{CONFIRMATION_TEXT}</strong> pour confirmer :
                    </Label>
                    <Input
                      id="delete-confirmation"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      placeholder={CONFIRMATION_TEXT}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmation('')}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={confirmation !== CONFIRMATION_TEXT || isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  'Supprimer définitivement'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
