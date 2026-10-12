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
import { CHART_AXIS, CHART_TOOLTIP } from './chart-theme';

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
        {/* `text-muted-foreground` sur le conteneur : les graduations sont en
            `currentColor` et héritent de cette couleur, dans les deux thèmes. */}
        <div className="h-[200px] sm:h-[250px] min-w-0 text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%" minWidth={1}>
            <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS.grid} vertical={false} />
              <XAxis
                dataKey="month"
                tick={CHART_AXIS.tick}
                axisLine={{ stroke: CHART_AXIS.line }}
                tickLine={false}
              />
              <YAxis
                tick={CHART_AXIS.tick}
                axisLine={false}
                tickLine={false}
                width={32}
                allowDecimals={false}
              />
              <Tooltip contentStyle={CHART_TOOLTIP.content} labelStyle={CHART_TOOLTIP.label} />
              {/* `linear`, pas `monotone` : sur douze mois dont deux seulement
                  portent des données, une courbe lissée dessine des bosses là où
                  il n'y a rien, et laisse croire à une activité intermédiaire. */}
              <Area
                type="linear"
                dataKey="rex"
                name="REX créés"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRex)"
              />
              <Area
                type="linear"
                dataKey="validated"
                name="REX validés"
                stroke="#22c55e"
                strokeWidth={2}
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
