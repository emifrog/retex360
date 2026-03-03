'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-destructive/20">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold">Erreur de chargement</h2>
            <p className="text-sm text-muted-foreground">
              Impossible de charger cette page. Veuillez réessayer.
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && error.message && (
            <pre className="text-xs text-left bg-muted p-3 rounded-lg overflow-auto max-h-24">
              {error.message}
            </pre>
          )}

          <div className="flex items-center justify-center gap-3">
            <Button onClick={reset} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
            <Link href="/rex">
              <Button size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Liste des REX
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
