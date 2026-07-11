import { TransactionDetailScreen } from '@/features/pos/transaction-detail-screen'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TransactionDetailScreen id={id} />
}
