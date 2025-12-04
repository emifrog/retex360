'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RexByTypeData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface RexByTypeChartProps {
  data?: RexByTypeData[];
}

const DEFAULT_DATA: RexByTypeData[] = [
  { name: 'Incendie', value: 342, color: '#ef4444' },
  { name: 'SAV', value: 256, color: '#3b82f6' },
  { name: 'NRBC', value: 89, color: '#a855f7' },
  { name: 'FDF', value: 178, color: '#f97316' },
  { name: 'Sauvetage', value: 145, color: '#22c55e' },
  { name: 'Autre', value: 237, color: '#6b7280' },
];

export function RexByTypeChart({ data = DEFAULT_DATA }: RexByTypeChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          REX par type d&apos;intervention
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value} REX`, '']}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-2">
          <p className="text-2xl font-bold">{total.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-muted-foreground">Total des REX</p>
        </div>
      </CardContent>
    </Card>
  );
}
