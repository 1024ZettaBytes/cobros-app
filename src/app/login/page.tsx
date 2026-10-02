import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/login-form';
import { hasValidSession } from '@/lib/auth';

export const metadata = { title: 'Entrar · Mis cobros' };

export default async function LoginPage() {
  // Si la cookie sigue viva, no tiene sentido pedir la passphrase otra vez.
  if (await hasValidSession()) redirect('/');

  return <LoginForm />;
}
