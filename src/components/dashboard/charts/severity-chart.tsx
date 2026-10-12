'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART_AXIS, CHART_TOOLTIP } from './chart-theme';

interface SeverityData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface SeverityChartProps {
  data?: SeverityData[];
}

const DEFAULT_DATA: SeverityData[] = [
  { name: 'Critique', value: 156, color: '#ef4444' },
  { name: 'Majeur', value: 423, color: '#f97316' },
  { name: 'Significatif', value: 668, color: '#eab308' },
];

export function SeverityChart({ data = DEFAULT_DATA }: SeverityChartProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Répartition par gravité
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[150px] sm:h-[180px] min-w-0 text-foreground">
          <ResponsiveContainer width="100%" height="100%" minWidth={1}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              barCategoryGap="28%"
            >
              <XAxis type="number" hide />
              {/* `width` 96 : « Significatif » en 12 px dépasse les 80 px
                  précédents et se faisait rogner par la gauche. */}
              <YAxis
                type="category"
                dataKey="name"
                tick={CHART_AXIS.tick}
                axisLine={false}
                tickLine={false}
                width={96}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                contentStyle={CHART_TOOLTIP.content}
                formatter={(value: number) => [
                  `${value} REX (${((value / total) * 100).toFixed(1)}%)`,
                  '',
                ]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {data.map((item) => (
            <div key={item.name} className="text-center">
              <p className="text-lg font-bold" style={{ color: item.color }}>
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground">{item.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
