import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { focusEntries } from '@/lib/rex-detail-sections';
import type { FocusThematique } from '@/types';

/**
 * Focus thématiques d'un RETEX, sur la fiche.
 *
 * Rubrique obligatoire pour un RETEX et pourtant absente de la fiche : elle
 * n'existait que dans le PDF. Texte simple, donc rendu par React (échappé), sans
 * passer par l'injection de HTML.
 */
export function FocusThematiquesList({ focus }: { focus: FocusThematique[] }) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle className="text-lg text-primary">Focus thématiques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {focus.map((item) => {
          const entries = focusEntries(item);
          return (
            <section key={item.id} className="space-y-3">
              <h3 className="font-semibold text-foreground">{item.theme}</h3>
              {entries.length > 0 ? (
                <dl className="space-y-3 border-l-2 border-border pl-4">
                  {entries.map((entry) => (
                    <div key={entry.key}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {entry.label}
                      </dt>
                      <dd className="mt-1 text-sm whitespace-pre-wrap">{entry.text}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun contenu saisi pour ce thème.</p>
              )}
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
