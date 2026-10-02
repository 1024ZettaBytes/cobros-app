'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { authApi, describeError } from '@/api';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

export function LoginForm() {
  const router = useRouter();

  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (passphrase.trim() === '') return;

    setIsSubmitting(true);
    setError(null);

    try {
      await authApi.login(passphrase);
      router.replace('/');
      // Revalida el layout protegido, que ya verá la cookie nueva.
      router.refresh();
    } catch (cause) {
      setError(describeError(cause));
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Mis cobros</h1>
        <p className="text-sm text-muted">Escribe tu passphrase para entrar.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Passphrase"
          type="password"
          autoComplete="current-password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          error={error ?? undefined}
          autoFocus
        />

        <Button type="submit" loading={isSubmitting} disabled={passphrase.trim() === ''}>
          Entrar
        </Button>
      </form>
    </main>
  );
}
