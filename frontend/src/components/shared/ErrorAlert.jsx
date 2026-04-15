export default function ErrorAlert({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 max-w-md w-full text-center">
        <p className="text-red-400 font-medium mb-1">Error al cargar datos</p>
        <p className="text-slate-400 text-sm">{message || 'No se pudo conectar con el servidor'}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 text-red-200 text-sm rounded-md transition-colors"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
