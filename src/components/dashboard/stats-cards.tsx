import { FileText, Building2, Clock, Sparkles } from 'lucide-react';

interface StatsCardsProps {
  totalRex: number;
  sdisCount: number;
  pendingValidation: number;
  aiPatterns: number;
}

const stats = [
  {
    key: 'totalRex',
    label: 'RETEX Total',
    icon: FileText,
    color: '#3b82f6',
    trend: '+23 ce mois',
  },
  {
    key: 'sdisCount',
    label: 'SDIS Participants',
    icon: Building2,
    color: '#22c55e',
    trend: 'Région PACA',
  },
  {
    key: 'pendingValidation',
    label: 'En attente validation',
    icon: Clock,
    color: '#f97316',
    trend: '3 urgents',
  },
  {
    key: 'aiPatterns',
    label: 'Patterns IA détectés',
    icon: Sparkles,
    color: '#a855f7',
    trend: '+5 cette semaine',
  },
] as const;

export function StatsCards({
  totalRex = 1247,
  sdisCount = 14,
  pendingValidation = 8,
  aiPatterns = 47,
}: Partial<StatsCardsProps>) {
  const values = {
    totalRex,
    sdisCount,
    pendingValidation,
    aiPatterns,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.key}
          className="relative bg-card/80 border border-border rounded-xl p-5 overflow-hidden"
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{
              background: `linear-gradient(90deg, ${stat.color} 0%, transparent 100%)`,
            }}
          />
          
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                {stat.label}
              </p>
              <p className="text-3xl font-bold text-foreground">
                {values[stat.key].toLocaleString('fr-FR')}
              </p>
              <p className="text-xs mt-1" style={{ color: stat.color }}>
                {stat.trend}
              </p>
            </div>
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${stat.color}20` }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
