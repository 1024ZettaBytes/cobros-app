import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { ServiceForm } from '@/components/service-form';
import { getServiceDetail } from '@/lib/queries';

export const metadata = { title: 'Editar servicio · Mis cobros' };

type Props = { params: Promise<{ id: string }> };

export default async function EditServicePage({ params }: Props) {
  const { id } = await params;
  const detail = await getServiceDetail(id);
  if (!detail) notFound();

  return (
    <>
      <PageHeader title="Editar servicio" backHref={`/service/${id}`} />
      <ServiceForm service={detail.service} />
    </>
  );
}
