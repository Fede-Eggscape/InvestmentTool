import CountdownTimer from '../shared/CountdownTimer';
import { fmtTime } from '../../utils/formatters';

export default function StatusBar({ updatedAt, intervalMs, isLoading, isStale }) {
  return (
    <div className="flex items-center justify-between px-6 py-2 bg-slate-950 border-b border-slate-800 text-xs text-slate-500">
      <div className="flex items-center gap-4">
        <span>
          Actualizado: <span className="text-slate-300">{updatedAt ? fmtTime(updatedAt) : '—'}</span>
        </span>
        {isStale && (
          <span className="text-yellow-500">· datos desactualizados</span>
        )}
        {isLoading && (
          <span className="text-blue-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            actualizando...
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span>próx. refresh</span>
        <CountdownTimer intervalMs={intervalMs} lastUpdated={updatedAt} />
      </div>
    </div>
  );
}
