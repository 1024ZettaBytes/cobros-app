import { PageHeader } from '@/components/page-header';
import { ServiceForm } from '@/components/service-form';

export const metadata = { title: 'Nuevo servicio · Mis cobros' };

export default function NewServicePage() {
  return (
    <>
      <PageHeader title="Nuevo servicio" backHref="/" />
      <ServiceForm />
    </>
  );
}
