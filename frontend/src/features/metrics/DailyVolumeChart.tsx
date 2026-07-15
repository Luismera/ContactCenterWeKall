import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyVolumePoint } from '../../api/types';

function formatDayLabel(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

export function DailyVolumeChart({ data }: { data: DailyVolumePoint[] }) {
  return (
    <div className="volume-chart">
      <style>{`
        .volume-chart {
          --bar-fill: #2a78d6;
          --axis-ink: #898781;
          --grid-line: #e1e0d9;
          --tooltip-bg: #fcfcfb;
          --tooltip-text: #0b0b0b;
        }
        @media (prefers-color-scheme: dark) {
          .volume-chart {
            --bar-fill: #3987e5;
            --grid-line: #2c2c2a;
            --tooltip-bg: #1a1a19;
            --tooltip-text: #ffffff;
          }
        }
      `}</style>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid-line)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayLabel}
            stroke="var(--axis-ink)"
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: 'var(--grid-line)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            stroke="var(--axis-ink)"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            formatter={(value) => [String(value ?? 0), 'Interacciones']}
            labelFormatter={(label) => `Día ${formatDayLabel(String(label ?? ''))}`}
            contentStyle={{
              background: 'var(--tooltip-bg)',
              color: 'var(--tooltip-text)',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" fill="var(--bar-fill)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
