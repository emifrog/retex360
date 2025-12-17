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

interface ExportPdfButtonProps {
  rexId: string;
  rexTitle?: string;
}

export function ExportPdfButton({ rexId, rexTitle }: ExportPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async (anonymize: boolean = false) => {
    setIsLoading(true);
    try {
      const url = `/api/rex/${rexId}/pdf${anonymize ? '?anonymize=true' : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
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
      
      toast.success(anonymize ? 'PDF anonymisé téléchargé' : 'PDF téléchargé');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
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
        <DropdownMenuItem onClick={() => handleExport(true)}>
          <UserX className="w-4 h-4 mr-2" />
          Export anonymisé
          <span className="ml-2 text-xs text-muted-foreground">
            (noms → grades)
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
