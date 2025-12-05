import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';

const severityColors = {
  critique: 'bg-red-500',
  majeur: 'bg-orange-500',
  significatif: 'bg-yellow-500',
};

type Severity = 'critique' | 'majeur' | 'significatif';

interface RexFromDB {
  id: string;
  title: string;
  intervention_date: string;
  type: string;
  severity: Severity;
  status: string;
  views_count: number;
  tags: string[];
  sdis: { code: string; name: string } | null;
}

export async function RecentRex() {
  const supabase = await createClient();
  
  const { data: rexList } = await supabase
    .from('rex')
    .select(`
      id,
      title,
      intervention_date,
      type,
      severity,
      status,
      views_count,
      tags,
      sdis:sdis_id(code, name)
    `)
    .in('status', ['validated', 'pending'])
    .order('created_at', { ascending: false })
    .limit(5);

  // Transform the data to handle the sdis relation
  const recentRex: RexFromDB[] = (rexList || []).map((rex) => ({
    ...rex,
    sdis: Array.isArray(rex.sdis) ? rex.sdis[0] : rex.sdis,
  })) as RexFromDB[];

  if (recentRex.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Aucun RETEX disponible</p>
        <Link href="/rex/new" className="text-primary hover:underline text-sm mt-2 inline-block">
          Créer le premier RETEX →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentRex.map((rex) => (
        <Link
          key={rex.id}
          href={`/rex/${rex.id}`}
          className="block bg-card border border-border hover:border-primary/40 rounded-xl p-4 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  severityColors[rex.severity]
                )}
                style={{
                  boxShadow: `0 0 10px ${
                    rex.severity === 'critique'
                      ? '#ef4444'
                      : rex.severity === 'majeur'
                      ? '#f97316'
                      : '#eab308'
                  }40`,
                }}
              />
              <span className="text-xs text-muted-foreground uppercase">
                {rex.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {rex.status === 'validated' && (
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-500 border-green-500/30 text-[10px]"
                >
                  ✓ Validé
                </Badge>
              )}
              {rex.status === 'pending' && (
                <Badge
                  variant="outline"
                  className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-[10px]"
                >
                  En attente
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {rex.views_count}
              </span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-foreground mb-2 line-clamp-2">
            {rex.title}
          </h3>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>SDIS {rex.sdis?.code}</span>
            <span>{new Date(rex.intervention_date).toLocaleDateString('fr-FR')}</span>
            <div className="flex gap-1.5 ml-auto">
              {rex.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-muted rounded text-[10px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
