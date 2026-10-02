'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';

import { describeError, servicesApi } from '@/api';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { TextField } from '@/components/ui/text-field';
import type { NewService } from '@/types';
import { formatCurrency, parseAmount } from '@/utils/format';
import { hasErrors, validateService, type ValidationErrors } from '@/utils/validation';

export function ServiceForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [clientPrice, setClientPrice] = useState('');
  const [monthlyExpense, setMonthlyExpense] = useState('');
  const [billingDay, setBillingDay] = useState('');
  const [errors, setErrors] = useState<ValidationErrors<NewService>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const draft = useMemo<Partial<NewService>>(
    () => ({
      name: name.trim(),
      clientPrice: parseAmount(clientPrice),
      monthlyExpense: parseAmount(monthlyExpense),
      billingDay: Number.parseInt(billingDay, 10),
    }),
    [name, clientPrice, monthlyExpense, billingDay],
  );

  /** Cuántos clientes necesito para que el servicio se pague solo. */
  const clientsToBreakEven = useMemo(() => {
    const price = draft.clientPrice ?? NaN;
    const expense = draft.monthlyExpense ?? NaN;
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(expense) || expense <= 0) {
      return null;
    }
    return Math.ceil(expense / price);
  }, [draft.clientPrice, draft.monthlyExpense]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const validation = validateService(draft);
    setErrors(validation);
    if (hasErrors(validation)) return;

    setIsSaving(true);
    setFailure(null);

    try {
      await servicesApi.create(draft as NewService);
      router.push('/');
      router.refresh();
    } catch (cause) {
      setFailure(describeError(cause));
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {failure && <ErrorBanner message={failure} />}

      <TextField
        label="Nombre del servicio"
        placeholder="Starlink Casa"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
        autoFocus
      />

      <TextField
        label="Cobro por cliente"
        placeholder="350"
        prefix="$"
        inputMode="decimal"
        value={clientPrice}
        onChange={(event) => setClientPrice(event.target.value)}
        error={errors.clientPrice}
        hint="Lo que te paga cada cliente al mes."
      />

      <TextField
        label="Gasto mensual"
        placeholder="1100"
        prefix="$"
        inputMode="decimal"
        value={monthlyExpense}
        onChange={(event) => setMonthlyExpense(event.target.value)}
        error={errors.monthlyExpense}
        hint="Lo que te cuesta el servicio a ti."
      />

      <TextField
        label="Día de corte"
        placeholder="5"
        inputMode="numeric"
        maxLength={2}
        value={billingDay}
        onChange={(event) => setBillingDay(event.target.value)}
        error={errors.billingDay}
        hint="Del 1 al 31. En meses cortos se ajusta al último día."
      />

      {clientsToBreakEven !== null && (
        <aside className="flex flex-col gap-1 rounded-xl bg-surface p-4">
          <p className="text-sm font-bold">Punto de equilibrio</p>
          <p className="text-sm text-muted">
            Necesitas {clientsToBreakEven} {clientsToBreakEven === 1 ? 'cliente' : 'clientes'} para
            cubrir el gasto de {formatCurrency(draft.monthlyExpense ?? 0)}. A partir de ahí, cada
            cliente son {formatCurrency(draft.clientPrice ?? 0)} de ganancia.
          </p>
        </aside>
      )}

      <div className="mt-2 flex flex-col gap-2">
        <Button type="submit" loading={isSaving}>
          Guardar servicio
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
