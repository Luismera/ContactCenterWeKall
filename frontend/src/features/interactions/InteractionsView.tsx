import { useState } from 'react';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { StatusBadge } from '../../components/StatusBadge';
import { useAgents } from '../../hooks/useAgents';
import { useInteractions } from '../../hooks/useInteractions';
import type { InteractionFilters, InteractionStatus } from '../../api/types';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: InteractionStatus; label: string }[] = [
  { value: 'open', label: 'Abierta' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'resolved', label: 'Resuelta' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function InteractionsView() {
  const { agents } = useAgents();
  const [filters, setFilters] = useState<InteractionFilters>({
    page: 1,
    limit: PAGE_SIZE,
  });

  const { result, loading, error } = useInteractions(filters);

  function updateFilter<K extends keyof InteractionFilters>(
    key: K,
    value: InteractionFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <label className="flex flex-col text-sm text-neutral-600">
          Agente
          <select
            className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            value={filters.agentId ?? ''}
            onChange={(e) => updateFilter('agentId', e.target.value || undefined)}
          >
            <option value="">Todos</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm text-neutral-600">
          Estado
          <select
            className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            value={filters.status ?? ''}
            onChange={(e) =>
              updateFilter('status', (e.target.value || undefined) as InteractionStatus)
            }
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm text-neutral-600">
          Desde
          <input
            type="date"
            className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            value={filters.dateFrom ?? ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
          />
        </label>

        <label className="flex flex-col text-sm text-neutral-600">
          Hasta
          <input
            type="date"
            className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            value={filters.dateTo ?? ''}
            onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
          />
        </label>
      </div>

      {loading && <LoadingState label="Cargando interacciones…" />}
      {error && <ErrorState message={error} />}

      {!loading && !error && result && (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Agente</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Apertura</th>
                <th className="px-4 py-2 font-medium">Cierre</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((interaction) => {
                const agent = agents.find((a) => a.id === interaction.agentId);
                return (
                  <tr key={interaction.id} className="border-b border-neutral-100">
                    <td className="px-4 py-2 capitalize">{interaction.type}</td>
                    <td className="px-4 py-2">{agent?.name ?? interaction.agentId}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={interaction.status} />
                    </td>
                    <td className="px-4 py-2 text-neutral-600">
                      {formatDate(interaction.openedAt)}
                    </td>
                    <td className="px-4 py-2 text-neutral-600">
                      {interaction.closedAt ? formatDate(interaction.closedAt) : '—'}
                    </td>
                  </tr>
                );
              })}
              {result.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No hay interacciones con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-sm text-neutral-600">
            <span>
              Página {result.meta.page} de {Math.max(result.meta.totalPages, 1)} ·{' '}
              {result.meta.total} interacciones
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-40"
                disabled={result.meta.page <= 1}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))
                }
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-40"
                disabled={result.meta.page >= result.meta.totalPages}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
