import type { Metadata } from 'next';
import { StatsCards } from '@/components/dashboard/stats-cards';

export const metadata: Metadata = {
  title: 'Tableau de bord',
  description: 'Vue d\'ensemble des RETEX, statistiques et analyses pour votre SDIS.',
};
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { ChartsContainer, RexByTypeChartContainer } from '@/components/dashboard/charts';
import { RecentRex } from '@/components/dashboard/recent-rex';
import { AiInsights } from '@/components/dashboard/ai-insights';
import { TopContributors } from '@/components/dashboard/top-contributors';
import { ExportStatsButton } from '@/components/dashboard/export-stats-button';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsCards />

      {/* KPIs */}
      <KpiCards />

      {/* Charts Row */}
      <ChartsContainer />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - REX List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              RETEX Récents
            </h2>
            <Link href="/rex">
              <Button variant="ghost" size="sm" className="text-xs">
                Voir tout →
              </Button>
            </Link>
          </div>
          <RecentRex />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* REX by Type Chart */}
          <RexByTypeChartContainer />

          {/* AI Insights */}
          <AiInsights />

          {/* Top Contributors */}
          <TopContributors />

          {/* Quick Actions */}
          <div className="bg-card/80 border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Actions rapides
            </h3>
            <div className="space-y-2">
              <Link href="/rex/new" className="block">
                <Button className="w-full bg-gradient-to-r from-primary to-red-800 hover:from-primary/90 hover:to-red-800/90">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Créer un RETEX
                </Button>
              </Link>
              <ExportStatsButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
