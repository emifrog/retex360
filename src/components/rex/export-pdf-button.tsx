'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, Loader2, ChevronDown, User, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface ExportPdfButtonProps {
  rexId: string;
  rexTitle?: string;
}

/**
 * Message lisible pour une réponse en échec.
 *
 * Le statut porte l'essentiel ; le corps JSON de la route le précise. Les deux
 * sont utilisés, avec un repli si le corps n'est pas exploitable — une réponse
 * 502 d'un proxy, par exemple, ne contient pas le JSON de l'application.
 */
async function describeFailure(response: Response): Promise<string> {
  if (response.status === 401) {
    return 'Session expirée — reconnectez-vous pour exporter ce REX.';
  }
  if (response.status === 429) {
    const seconds = Number(response.headers.get('Retry-After'));
    return Number.isFinite(seconds) && seconds > 0
      ? `Trop d'exports demandés. Réessayez dans ${seconds} seconde${seconds > 1 ? 's' : ''}.`
      : "Trop d'exports demandés. Réessayez dans un instant.";
  }

  const serverMessage = await response
    .json()
    .then((body: { error?: string }) => body?.error)
    .catch(() => null);

  return serverMessage || `Export impossible (erreur ${response.status}).`;
}

export function ExportPdfButton({ rexId, rexTitle }: ExportPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async (anonymize: boolean = false) => {
    setIsLoading(true);
    try {
      const url = `/api/rex/${rexId}/pdf${anonymize ? '?anonymize=true' : ''}`;
      let response = await fetch(url);

      // La route répond 304 à une requête conditionnelle (cache ETag sur
      // `updated_at`). Le navigateur sert alors normalement la réponse mise en
      // cache et le code ne voit qu'un 200 — mais si le 304 remonte jusqu'ici,
      // il n'y a aucun corps à télécharger, et `response.ok` est faux. Une
      // seule reprise en contournant le cache : le serveur regénère, ce qui est
      // exactement ce que l'utilisateur a demandé.
      if (response.status === 304) {
        response = await fetch(url, { cache: 'reload' });
      }

      if (!response.ok) {
        // `!response.ok` recouvrait SIX situations distinctes — session
        // expirée, quota atteint, REX introuvable, REX trop volumineux, panne
        // serveur, et jusqu'au 304 du cache ETag, qui n'est même pas une erreur.
        // Toutes affichaient « Erreur lors de la génération du PDF », ce qui
        // rendait le diagnostic impossible pour l'utilisateur comme pour nous.
        //
        // La route renvoie déjà un motif précis dans `{ error }` : on le lit.
        throw new Error(await describeFailure(response));
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const suffix = anonymize ? '-anonyme' : '';
      link.download = `rex-${rexTitle?.toLowerCase().replace(/\s+/g, '-').slice(0, 50) || rexId}${suffix}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success(anonymize ? "PDF sans nom d'auteur téléchargé" : 'PDF téléchargé');
    } catch (error) {
      logger.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération du PDF');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4 mr-2" />
          )}
          Exporter PDF
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport(false)}>
          <User className="w-4 h-4 mr-2" />
          Export standard
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* Libellé aligné sur le traitement réel. « Export anonymisé » laissait
            entendre un document diffusable en l'état : seuls le nom de l'auteur
            et les responsables de prescriptions sont remplacés. Les noms cités
            dans les textes et les personnes visibles sur les photos ne le sont
            pas — le PDF le rappelle lui-même en tête de document. */}
        <DropdownMenuItem
          onClick={() => handleExport(true)}
          className="flex-col items-start gap-0.5"
        >
          <span className="flex items-center">
            <UserX className="w-4 h-4 mr-2" />
            Export sans nom d&apos;auteur
          </span>
          <span className="text-xs text-muted-foreground pl-6">
            Masque l&apos;auteur et les responsables — relire avant diffusion
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
