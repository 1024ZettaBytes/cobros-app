import { notFound } from 'next/navigation';

import { ClientForm } from '@/components/client-form';
import { PageHeader } from '@/components/page-header';
import { getServiceDetail } from '@/lib/queries';

export const metadata = { title: 'Nuevo cliente · Mis cobros' };

type Props = { searchParams: Promise<{ serviceId?: string }> };

export default async function NewClientPage({ searchParams }: Props) {
  const { serviceId } = await searchParams;
  if (!serviceId) notFound();

  const detail = await getServiceDetail(serviceId);
  if (!detail) notFound();

  return (
    <>
      <PageHeader title="Nuevo cliente" backHref={`/service/${serviceId}`} />
      <ClientForm service={detail.service} />
    </>
  );
}
