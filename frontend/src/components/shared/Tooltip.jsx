/**
 * Tooltip — muestra una explicación al hacer hover sobre un elemento.
 * Uso: <Tooltip text="Explicación aquí"><span>Label</span></Tooltip>
 */
export default function Tooltip({ text, children, position = 'top', width = 'w-56' }) {
  const posClass = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full  left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full  top-1/2 -translate-y-1/2 ml-2',
  }[position] || 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  const arrowClass = {
    top:    'top-full left-1/2 -translate-x-1/2 border-t-slate-700',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-700',
    left:   'left-full top-1/2 -translate-y-1/2 border-l-slate-700',
    right:  'right-full top-1/2 -translate-y-1/2 border-r-slate-700',
  }[position] || 'top-full left-1/2 -translate-x-1/2 border-t-slate-700';

  return (
    <span className="relative inline-flex items-center group">
      {children}
      <span className={`
        absolute ${posClass} ${width}
        bg-slate-800 border border-slate-600
        text-slate-200 text-xs rounded-lg px-3 py-2
        shadow-xl pointer-events-none z-[200]
        opacity-0 group-hover:opacity-100
        transition-opacity duration-150
        whitespace-normal leading-relaxed text-center
      `}>
        {text}
        <span className={`absolute ${arrowClass} border-4 border-transparent`} />
      </span>
    </span>
  );
}

/** Ícono de ayuda ⓘ envuelto en Tooltip */
export function InfoTip({ text, position }) {
  return (
    <Tooltip text={text} position={position}>
      <span className="text-slate-600 hover:text-slate-400 text-[11px] ml-1 cursor-help select-none transition-colors">
        ⓘ
      </span>
    </Tooltip>
  );
}
