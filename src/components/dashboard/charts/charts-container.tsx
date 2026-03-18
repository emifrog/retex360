'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardCharts } from '@/lib/hooks/use-dashboard-data';

function ChartSkeleton() {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="flex items-center justify-center h-[320px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

// Lazy-load chart components (recharts ~200KB)
const RexTimelineChart = dynamic(
  () => import('./rex-timeline-chart').then((m) => m.RexTimelineChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const SeverityChart = dynamic(
  () => import('./severity-chart').then((m) => m.SeverityChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const RexByTypeChart = dynamic(
  () => import('./rex-by-type-chart').then((m) => m.RexByTypeChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export function ChartsContainer() {
  const { data, isLoading } = useDashboardCharts();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><ChartSkeleton /></div>
        <div><ChartSkeleton /></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <RexTimelineChart data={data?.timeline} />
      </div>
      <div>
        <SeverityChart data={data?.bySeverity} />
      </div>
    </div>
  );
}

export function RexByTypeChartContainer() {
  const { data } = useDashboardCharts();

  return <RexByTypeChart data={data?.byType} />;
}
