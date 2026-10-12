'use client';

import { FileText, Building2, Clock, Sparkles, Loader2 } from 'lucide-react';
import { useDashboardStats, type DashboardStats } from '@/lib/hooks/use-dashboard-data';

// Une seule rangée, quatre chiffres qui répondent chacun à une question.
// La seconde rangée de tuiles (contributeurs, commentaires, favoris sur 7 jours)
// a été retirée : elle répétait « en attente » et affichait trois zéros en
// ouverture de page. Un compteur à zéro n'informe pas, il fait vide.
const statsConfig = [
  {
    key: 'totalRex' as keyof DashboardStats,
    label: 'REX',
    icon: FileText,
    color: '#3b82f6',
  },
  {
    // `activeSdis`, pas `sdisCount` : ce dernier est la taille de la table de
    // référence — 97, tous les SDIS de France — et se lisait comme un nombre
    // de clients.
    key: 'activeSdis' as keyof DashboardStats,
    label: 'SDIS contributeurs',
    icon: Building2,
    color: '#22c55e',
  },
  {
    key: 'pendingValidation' as keyof DashboardStats,
    label: 'En attente de validation',
    icon: Clock,
    color: '#f97316',
  },
  {
    key: 'validatedLastYear' as keyof DashboardStats,
    label: 'Validés sur 12 mois',
    icon: Sparkles,
    color: '#a855f7',
  },
];

export function StatsCards() {
  const { stats, isLoading } = useDashboardStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsConfig.map((stat) => (
        <div
          key={stat.key}
          className="relative bg-card border border-border rounded-xl p-5 overflow-hidden"
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
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  (stats?.[stat.key] ?? 0).toLocaleString('fr-FR')
                )}
              </p>
            </div>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${stat.color}20` }}>
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
