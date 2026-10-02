import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
};

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:opacity-90',
  secondary: 'bg-surface text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'text-accent hover:bg-surface',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold
        transition-opacity disabled:opacity-50 disabled:pointer-events-none
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
        ${VARIANTS[variant]} ${className}`}
      {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
