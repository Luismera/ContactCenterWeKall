import { useState } from 'react';
import { InteractionsView } from './features/interactions/InteractionsView';
import { MetricsView } from './features/metrics/MetricsView';

type Tab = 'interactions' | 'metrics';

export default function App() {
  const [tab, setTab] = useState<Tab>('metrics');

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-lg font-semibold text-neutral-900">
            Engage 360 · Mini panel de Contact Center
          </h1>
          <nav className="mt-3 flex gap-1">
            <button
              type="button"
              className={`rounded-t px-4 py-2 text-sm font-medium ${
                tab === 'metrics'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
              onClick={() => setTab('metrics')}
            >
              Métricas
            </button>
            <button
              type="button"
              className={`rounded-t px-4 py-2 text-sm font-medium ${
                tab === 'interactions'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
              onClick={() => setTab('interactions')}
            >
              Interacciones
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'metrics' ? <MetricsView /> : <InteractionsView />}
      </main>
    </div>
  );
}
