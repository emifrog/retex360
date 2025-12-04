'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Répartition par gravité
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value} REX (${((value / total) * 100).toFixed(1)}%)`, '']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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
              <p className="text-[10px] text-muted-foreground">{item.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
