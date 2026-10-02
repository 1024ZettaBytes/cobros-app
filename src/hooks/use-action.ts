'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { describeError } from '@/api';
import { useDialog } from '@/components/ui/dialog';

/**
 * Ejecuta una mutación contra la API, avisa si falla y revalida los server
 * components para que la pantalla refleje el cambio.
 */
export function useAction() {
  const router = useRouter();
  const dialog = useDialog();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<unknown>, options?: { refresh?: boolean }) => {
      setPending(true);

      try {
        await fn();
        if (options?.refresh !== false) router.refresh();
      } catch (error) {
        await dialog.alert('No se pudo completar', describeError(error));
      } finally {
        setPending(false);
      }
    },
    [router, dialog],
  );

  return { run, pending };
}
