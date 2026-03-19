'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ExternalLink } from 'lucide-react';
import { RESSOURCE_TYPES, type RessourceComplementaire, type RessourceType } from '@/types';

interface RessourcesListProps {
  ressources: RessourceComplementaire[];
}

const getTypeLabel = (type: RessourceType) =>
  RESSOURCE_TYPES.find((t) => t.value === type)?.label || type;

export function RessourcesList({ ressources }: RessourcesListProps) {
  if (!ressources || ressources.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Pour aller plus loin ({ressources.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ressources.map((ressource) => {
          const isUrl = ressource.url_ou_reference.startsWith('http');
          return (
            <div
              key={ressource.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Badge variant="outline" className="text-xs shrink-0">
                {getTypeLabel(ressource.type)}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{ressource.titre}</p>
                {ressource.url_ou_reference && (
                  <p className="text-xs text-muted-foreground truncate">
                    {ressource.url_ou_reference}
                  </p>
                )}
              </div>
              {isUrl && (
                <a
                  href={ressource.url_ou_reference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-primary hover:text-primary/80"
                  aria-label={`Ouvrir ${ressource.titre}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
