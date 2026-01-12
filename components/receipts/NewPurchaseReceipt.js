'use client';

import PurchaseReceiptForm from '@/components/receipts/PurchaseReceiptForm';

export default function NewPurchaseReceipt({ companies }) {
  return <PurchaseReceiptForm companies={companies} mode="create" />;
}
