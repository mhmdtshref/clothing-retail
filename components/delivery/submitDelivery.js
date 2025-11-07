'use client';

export default async function submitDelivery({
  items,
  billDiscount,
  taxPercent,
  deliveryCompany,
  deliveryAddress,
  deliveryContact,
  deliveryProviderMeta,
  customerId,
}) {
  const hasDelivery = true;
  // Basic validations similar to POS submit
  if (deliveryCompany !== 'optimus') {
    if (!deliveryAddress?.line1 || !deliveryAddress?.city || !deliveryContact?.phone) {
      throw new Error('Delivery address (line1, city) and contact phone are required');
    }
  } else {
    if (!deliveryProviderMeta?.cityId || !deliveryProviderMeta?.areaId || !/^\d{10}$/.test(String(deliveryProviderMeta?.phone || ''))) {
      throw new Error('Optimus: city, area, and 10-digit phone are required');
    }
  }

  // Ensure we have a customer id; auto-create if not provided
  let customerIdToUse = customerId || undefined;
  if (!customerIdToUse) {
    let name = '';
    let phone = '';
    if (deliveryCompany === 'optimus') {
      name = String(deliveryProviderMeta?.name || '');
      phone = String(deliveryProviderMeta?.phone || '');
    } else {
      name = String(deliveryContact?.name || '');
      phone = String(deliveryContact?.phone || '');
    }
    if (phone) {
      const resC = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, phone }),
      });
      const jsonC = await resC.json();
      if (resC.ok && jsonC?.customer?._id) {
        customerIdToUse = jsonC.customer._id;
      } else {
        throw new Error(jsonC?.message || jsonC?.error || 'Failed to save contact');
      }
    }
  }

  const payload = {
    type: 'sale',
    status: 'on_delivery',
    items: items.map((l) => ({
      variantId: l.variantId,
      qty: Number(l.qty) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      discount: l.discount && Number(l.discount.value) > 0
        ? { mode: l.discount.mode, value: Number(l.discount.value) }
        : undefined,
    })),
    billDiscount: billDiscount && Number(billDiscount.value) > 0
      ? { mode: billDiscount.mode, value: Number(billDiscount.value) }
      : undefined,
    taxPercent: Number(taxPercent) || 0,
    note: 'Delivery',
    delivery: { company: deliveryCompany, address: deliveryAddress, contact: deliveryContact },
    ...(deliveryCompany === 'optimus' ? { deliveryProviderMeta } : {}),
    ...(customerIdToUse ? { customerId: customerIdToUse } : {}),
  };

  const res = await fetch('/api/receipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to create delivery receipt');
  return json;
}


