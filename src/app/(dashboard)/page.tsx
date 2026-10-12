import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { ChartsContainer, RexByTypeChartContainer } from '@/components/dashboard/charts';
import { RecentRex } from '@/components/dashboard/recent-rex';
import { AiInsights } from '@/components/dashboard/ai-insights';
import { TopContributors } from '@/components/dashboard/top-contributors';
import { ExportStatsButton } from '@/components/dashboard/export-stats-button';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Tableau de bord',
  description: "Vue d'ensemble des REX, statistiques et analyses pour votre SDIS.",
};

function SectionSkeleton({ height = 'h-48' }: { height?: string }) {
  return (
    <div
      className={`${height} flex items-center justify-center bg-card/50 border border-border/50 rounded-xl`}
    >
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* En-tête : l'action principale est ici, visible sans défiler. Elle
          vivait dans un bloc « Actions rapides » tout en bas de la colonne
          droite — à deux mille pixels du haut, là où personne ne la cherche.
          La liste des REX place déjà « Nouveau REX » à cet endroit. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Activité des retours d&apos;expérience de votre SDIS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportStatsButton />
          <Link href="/rex/new">
            <Button className="bg-gradient-to-r from-primary to-red-800 hover:from-primary/90 hover:to-red-800/90">
              <PlusCircle className="w-4 h-4 mr-2" />
              Nouveau REX
            </Button>
          </Link>
        </div>
      </div>

      {/* Indicateurs — une seule rangée */}
      <StatsCards />

      {/* Charts Row */}
      <ChartsContainer />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - REX List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              REX récents
            </h2>
            <Link href="/rex">
              <Button variant="ghost" size="sm" className="text-xs">
                Voir tout →
              </Button>
            </Link>
          </div>
          <Suspense fallback={<SectionSkeleton height="h-64" />}>
            <RecentRex />
          </Suspense>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <RexByTypeChartContainer />
          <AiInsights />
          <TopContributors />
        </div>
      </div>
    </div>
  );
}
