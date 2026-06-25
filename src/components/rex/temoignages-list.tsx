'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Quote } from 'lucide-react';
import type { Temoignage } from '@/types';

interface TemoignagesListProps {
  temoignages: Temoignage[];
}

export function TemoignagesList({ temoignages }: TemoignagesListProps) {
  if (!temoignages || temoignages.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Quote className="w-5 h-5 text-amber-500" />
          Témoignages ({temoignages.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {temoignages.map((temoignage) => (
          <blockquote
            key={temoignage.id}
            className="border-l-4 border-amber-500/50 pl-4 py-2 space-y-1"
          >
            <p className="italic text-foreground leading-relaxed">
              &laquo; {temoignage.citation} &raquo;
            </p>
            <footer className="text-sm text-muted-foreground">
              {temoignage.auteur_fonction && (
                <span className="font-medium">{temoignage.auteur_fonction}</span>
              )}
              {temoignage.contexte && <span> — {temoignage.contexte}</span>}
            </footer>
          </blockquote>
        ))}
      </CardContent>
    </Card>
  );
}
