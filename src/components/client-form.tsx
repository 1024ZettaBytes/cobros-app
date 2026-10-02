'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';

import { clientsApi, describeError } from '@/api';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/error-banner';
import { TextField } from '@/components/ui/text-field';
import type { NewClient, Service } from '@/types';
import { formatCurrency } from '@/utils/format';
import { hasErrors, normalizePhone, validateClient, type ValidationErrors } from '@/utils/validation';

export function ClientForm({ service }: { service: Service }) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<ValidationErrors<NewClient>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const draft = useMemo<Partial<NewClient>>(
    () => ({ serviceId: service.id, name: name.trim(), phoneNumber: normalizePhone(phone) }),
    [service.id, name, phone],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const validation = validateClient(draft);
    setErrors(validation);
    if (hasErrors(validation)) return;

    setIsSaving(true);
    setFailure(null);

    try {
      await clientsApi.create(draft as NewClient);
      router.push(`/service/${service.id}`);
      router.refresh();
    } catch (cause) {
      setFailure(describeError(cause));
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {failure && <ErrorBanner message={failure} />}

      <aside className="flex flex-col gap-1 rounded-xl bg-surface p-4">
        <p className="text-sm font-bold">{service.name}</p>
        <p className="text-sm text-muted">
          Pagará {formatCurrency(service.clientPrice)} al mes, con corte el día {service.billingDay}.
        </p>
      </aside>

      <TextField
        label="Nombre"
        placeholder="Ana García"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
        autoFocus
      />

      <TextField
        label="Teléfono"
        placeholder="6641234567"
        prefix="+52"
        type="tel"
        inputMode="numeric"
        maxLength={14}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        error={errors.phoneNumber}
        hint="10 dígitos. El +52 se agrega solo al abrir WhatsApp."
      />

      <div className="mt-2 flex flex-col gap-2">
        <Button type="submit" loading={isSaving}>
          Guardar cliente
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
