'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function DataExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const response = await fetch('/api/profile/export');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'export');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retex360-donnees-personnelles-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Vos données ont été exportées');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Exporter mes données
        </CardTitle>
        <CardDescription>
          Conformément au RGPD (Article 20 - Droit à la portabilité), vous pouvez télécharger
          l&apos;ensemble de vos données personnelles au format JSON.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleExport} disabled={isExporting} variant="outline" className="gap-2">
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Export en cours...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Télécharger mes données
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
