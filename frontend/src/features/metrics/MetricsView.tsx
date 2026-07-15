import { useState } from 'react';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { useMetrics } from '../../hooks/useMetrics';
import { DailyVolumeChart } from './DailyVolumeChart';

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  return { dateFrom: toDateOnly(thirtyDaysAgo), dateTo: toDateOnly(today) };
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '—';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}min`;
}

export function MetricsView() {
  const [range, setRange] = useState(defaultRange);
  const { metrics, loading, error } = useMetrics(range.dateFrom, range.dateTo);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <label className="flex flex-col text-sm text-neutral-600">
          Desde
          <input
            type="date"
            className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            value={range.dateFrom}
            max={range.dateTo}
            onChange={(e) => setRange((prev) => ({ ...prev, dateFrom: e.target.value }))}
          />
        </label>
        <label className="flex flex-col text-sm text-neutral-600">
          Hasta
          <input
            type="date"
            className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            value={range.dateTo}
            min={range.dateFrom}
            onChange={(e) => setRange((prev) => ({ ...prev, dateTo: e.target.value }))}
          />
        </label>
      </div>

      {loading && <LoadingState label="Cargando métricas…" />}
      {error && <ErrorState message={error} />}

      {!loading && !error && metrics && (
        <>
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Agente</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Resueltas</th>
                  <th className="px-4 py-2 font-medium">Tasa de resolución</th>
                  <th className="px-4 py-2 font-medium">Tiempo promedio</th>
                </tr>
              </thead>
              <tbody>
                {metrics.byAgent.map((agent) => (
                  <tr key={agent.agentId} className="border-b border-neutral-100">
                    <td className="px-4 py-2">{agent.agentName}</td>
                    <td className="px-4 py-2">{agent.total}</td>
                    <td className="px-4 py-2">{agent.resolved}</td>
                    <td className="px-4 py-2">{(agent.resolutionRate * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2">{formatSeconds(agent.avgResolutionSeconds)}</td>
                  </tr>
                ))}
                {metrics.byAgent.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                      No hay agentes registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-medium text-neutral-700">
              Volumen de interacciones por día ({range.dateFrom} a {range.dateTo})
            </h3>
            <DailyVolumeChart data={metrics.dailyVolume} />
          </div>
        </>
      )}
    </div>
  );
}
