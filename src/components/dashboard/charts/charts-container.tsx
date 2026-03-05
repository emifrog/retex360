'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RexTimelineChart } from './rex-timeline-chart';
import { RexByTypeChart } from './rex-by-type-chart';
import { SeverityChart } from './severity-chart';
import { logger } from '@/lib/logger';

interface ChartsData {
  timeline: { month: string; rex: number; validated: number }[];
  byType: { name: string; value: number; color: string }[];
  bySeverity: { name: string; value: number; color: string }[];
}

function ChartSkeleton() {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="flex items-center justify-center h-[320px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export function ChartsContainer() {
  const [data, setData] = useState<ChartsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCharts() {
      try {
        const res = await fetch('/api/dashboard/charts');
        if (res.ok) {
          const chartsData = await res.json();
          setData(chartsData);
        }
      } catch (error) {
        logger.error('Charts fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCharts();
  }, []);

  if (isLoading) {
    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><ChartSkeleton /></div>
          <div><ChartSkeleton /></div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RexTimelineChart data={data?.timeline} />
        </div>
        <div>
          <SeverityChart data={data?.bySeverity} />
        </div>
      </div>
    </>
  );
}

export function RexByTypeChartContainer() {
  const [data, setData] = useState<ChartsData | null>(null);

  useEffect(() => {
    async function fetchCharts() {
      try {
        const res = await fetch('/api/dashboard/charts');
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        logger.error('Chart fetch error:', error);
      }
    }
    fetchCharts();
  }, []);

  return <RexByTypeChart data={data?.byType} />;
}
