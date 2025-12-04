'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TimelineData {
  month: string;
  rex: number;
  validated: number;
  [key: string]: string | number;
}

interface RexTimelineChartProps {
  data?: TimelineData[];
}

const DEFAULT_DATA: TimelineData[] = [
  { month: 'Jan', rex: 45, validated: 38 },
  { month: 'Fév', rex: 52, validated: 45 },
  { month: 'Mar', rex: 61, validated: 55 },
  { month: 'Avr', rex: 48, validated: 42 },
  { month: 'Mai', rex: 73, validated: 65 },
  { month: 'Juin', rex: 89, validated: 78 },
  { month: 'Juil', rex: 112, validated: 95 },
  { month: 'Août', rex: 98, validated: 88 },
  { month: 'Sep', rex: 76, validated: 68 },
  { month: 'Oct', rex: 84, validated: 75 },
  { month: 'Nov', rex: 91, validated: 82 },
  { month: 'Déc', rex: 67, validated: 58 },
];

export function RexTimelineChart({ data = DEFAULT_DATA }: RexTimelineChartProps) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Évolution des REX (12 derniers mois)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRex" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorValidated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="rex"
                name="REX créés"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorRex)"
              />
              <Area
                type="monotone"
                dataKey="validated"
                name="REX validés"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorValidated)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-muted-foreground">REX créés</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">REX validés</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
