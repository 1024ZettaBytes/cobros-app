import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Prefijo fijo dentro del campo, ej. "$". */
  prefix?: string;
};

export function TextField({ label, error, hint, prefix, className = '', ...rest }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>

      <div
        className={`flex min-h-12 items-center gap-1 rounded-xl border bg-surface px-3
          focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent
          ${error ? 'border-danger' : 'border-line'}`}>
        {prefix && (
          <span aria-hidden className="text-muted">
            {prefix}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full bg-transparent py-2 text-base outline-none placeholder:text-muted ${className}`}
          {...rest}
        />
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
