'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

/**
 * Diálogos con API de promesas, sobre el <dialog> nativo.
 *
 * El elemento nativo ya trae foco atrapado, cierre con Esc y backdrop, así
 * que no hay que reimplementar nada de eso.
 */

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta el botón en rojo: borrados y acciones irreversibles. */
  destructive?: boolean;
}

export interface PromptOptions extends ConfirmOptions {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  prefix?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
}

interface DialogApi {
  alert: (title: string, message?: string) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resuelve con el texto escrito, o null si se cancela. */
  prompt: (options: PromptOptions) => Promise<string | null>;
}

type Request =
  | { kind: 'alert'; options: ConfirmOptions; resolve: () => void }
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

const DialogContext = createContext<DialogApi | null>(null);

/** Resuelve una petición pendiente como "cancelada" según su tipo. */
function cancelRequest(request: Request): void {
  if (request.kind === 'prompt') request.resolve(null);
  else if (request.kind === 'confirm') request.resolve(false);
  else request.resolve();
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (request && !dialog.open) dialog.showModal();
    if (!request && dialog.open) dialog.close();
  }, [request]);

  const open = useCallback((next: Request, initialValue = '') => {
    // Si llega un diálogo encima de otro, el anterior cuenta como cancelado.
    setRequest((previous) => {
      if (previous) cancelRequest(previous);
      return next;
    });
    setValue(initialValue);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      alert: (title, message) =>
        new Promise<void>((resolve) => open({ kind: 'alert', options: { title, message }, resolve })),

      confirm: (options) =>
        new Promise<boolean>((resolve) => open({ kind: 'confirm', options, resolve })),

      prompt: (options) =>
        new Promise<string | null>((resolve) =>
          open({ kind: 'prompt', options, resolve }, options.defaultValue ?? ''),
        ),
    }),
    [open],
  );

  function handleCancel() {
    if (request) cancelRequest(request);
    setRequest(null);
  }

  function handleConfirm() {
    if (!request) return;

    if (request.kind === 'prompt') request.resolve(value);
    else if (request.kind === 'confirm') request.resolve(true);
    else request.resolve();

    setRequest(null);
  }

  const options = request?.options;

  return (
    <DialogContext.Provider value={api}>
      {children}

      <dialog
        ref={ref}
        // Esc y el backdrop disparan `cancel`; sin esto quedaría una promesa colgada.
        onCancel={(event) => {
          event.preventDefault();
          handleCancel();
        }}
        className="m-auto w-[min(380px,calc(100vw-2rem))] rounded-2xl bg-bg p-6 text-fg backdrop:backdrop-blur-[2px]">
        {request && options && (
          <form
            method="dialog"
            onSubmit={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
            className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">{options.title}</h2>

            {options.message && <p className="text-sm text-muted">{options.message}</p>}

            {request.kind === 'prompt' && (
              <TextField
                label={request.options.label}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={request.options.placeholder}
                prefix={request.options.prefix}
                inputMode={request.options.inputMode}
                autoFocus
              />
            )}

            <div className="mt-1 flex flex-col gap-2">
              <Button type="submit" variant={options.destructive ? 'danger' : 'primary'}>
                {options.confirmLabel ?? 'Aceptar'}
              </Button>

              {request.kind !== 'alert' && (
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  {options.cancelLabel ?? 'Cancelar'}
                </Button>
              )}
            </div>
          </form>
        )}
      </dialog>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog debe usarse dentro de <DialogProvider>.');
  return api;
}
