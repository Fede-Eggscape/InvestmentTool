export function fmtPercent(val, decimals = 2) {
  if (val == null || isNaN(val)) return '—';
  return `${parseFloat(val).toFixed(decimals)}%`;
}

export function fmtPrice(val) {
  if (val == null || isNaN(val) || val === 0) return '—';
  if (val >= 100) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (val >= 1) return `$${val.toFixed(2)}`;
  if (val >= 0.01) return `$${val.toFixed(4)}`;
  return `$${val.toFixed(6)}`;
}

export function fmtCompact(val) {
  if (val == null || isNaN(val) || val === 0) return '—';
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000)     return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)         return `$${(val / 1_000).toFixed(2)}K`;
  return `$${val.toFixed(2)}`;
}

export function fmtChange(val) {
  if (val == null || isNaN(val)) return '—';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

export function fmtDays(val) {
  if (val == null || isNaN(val)) return '—';
  return val === 1 ? '1 día' : `${val} días`;
}

export function fmtTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function fmtApr(val) {
  if (val == null || isNaN(val)) return '—';
  return `${parseFloat(val).toFixed(2)}%`;
}
