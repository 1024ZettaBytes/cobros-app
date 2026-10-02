/**
 * Aviso de que algo falló. Se muestra encima de los datos en vez de vaciar la
 * pantalla: ver cifras con una advertencia es mejor que una app vacía que
 * parece decir "no tienes nada".
 */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-xl border border-danger px-3 py-2">
      <p className="text-sm text-danger">{message}</p>

      {onRetry && (
        <button type="button" onClick={onRetry} className="text-sm font-bold text-danger underline">
          Reintentar
        </button>
      )}
    </div>
  );
}
