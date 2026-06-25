import type { LucideIcon } from 'lucide-react';

export interface Metric {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

/** Cartes de métriques globales du dashboard super_admin (présentationnel). */
export function SuperAdminMetrics({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className="relative bg-card border border-border rounded-xl p-5 overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: `linear-gradient(90deg, ${m.color} 0%, transparent 100%)` }}
            />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  {m.label}
                </p>
                <p className="text-3xl font-bold text-foreground">{m.value}</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${m.color}20` }}>
                <Icon className="w-5 h-5" style={{ color: m.color }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
