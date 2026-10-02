import { PageHeader } from '@/components/page-header';
import { SettingsForm } from '@/components/settings-form';
import { getSettings } from '@/lib/queries';

export const metadata = { title: 'Ajustes · Mis cobros' };

export default async function SettingsPage() {
  return (
    <>
      <PageHeader title="Ajustes" backHref="/" />
      <SettingsForm settings={await getSettings()} />
    </>
  );
}
