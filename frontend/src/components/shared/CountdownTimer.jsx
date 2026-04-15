import { useEffect, useState } from 'react';

export default function CountdownTimer({ intervalMs, lastUpdated }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => {
      const elapsed = Date.now() - lastUpdated;
      const pct = Math.max(0, 100 - (elapsed / intervalMs) * 100);
      setProgress(pct);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdated, intervalMs]);

  const color = progress > 60 ? 'bg-emerald-500' : progress > 30 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ${color}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
