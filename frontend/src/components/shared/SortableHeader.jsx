export default function SortableHeader({ label, field, currentSort, onSort, align = 'left' }) {
  const isActive = currentSort?.field === field;
  const isAsc    = isActive && currentSort?.dir === 'asc';

  const thAlign   = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const flexAlign = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-3 ${thAlign} text-xs font-semibold uppercase tracking-wider
        cursor-pointer select-none whitespace-nowrap transition-colors
        ${isActive ? 'text-blue-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'}`}
    >
      <span className={`flex items-center gap-1 ${flexAlign}`}>
        {label}
        <span className="opacity-60 text-xs">
          {isActive ? (isAsc ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}
