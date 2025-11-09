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
  hasReturn = false,
  returnItems = [],
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
        body: JSON.stringify({
          name,
          phone,
          ...(deliveryCompany === 'optimus'
            ? {
                providerCompany: 'optimus',
                providerCityId: deliveryProviderMeta?.cityId,
                providerAreaId: deliveryProviderMeta?.areaId,
                providerCityName: deliveryProviderMeta?.cityName || '',
                providerAreaName: deliveryProviderMeta?.areaName || '',
                addressLine: deliveryProviderMeta?.addressLine || '',
              }
            : {}),
        }),
      });
      const jsonC = await resC.json();
      if (resC.ok && jsonC?.customer?._id) {
        customerIdToUse = jsonC.customer._id;
      } else {
        throw new Error('Failed to save contact');
      }
    }
  }

  // Build return notes if needed
  let returnNotes = '';
  if (hasReturn && Array.isArray(returnItems) && returnItems.length) {
    const lines = returnItems.map((l) => {
      const code = l.code || '';
      const size = l.size || '';
      const color = l.color || '';
      const qty = Number(l.qty || 0);
      return [code, [size, color].filter(Boolean).join('/'), `x${qty}`].filter(Boolean).join(' ');
    }).filter(Boolean);
    returnNotes = lines.join('\n');
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
    ...(deliveryCompany === 'optimus' ? { deliveryProviderMeta: { ...deliveryProviderMeta, hasReturn, returnNotes } } : {}),
    ...(customerIdToUse ? { customerId: customerIdToUse } : {}),
  };

  const res = await fetch('/api/receipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error('Failed to create delivery receipt');

  // If exchange flow, create sale_return receipt (no provider call)
  if (hasReturn) {
    const returnPayload = {
      type: 'sale_return',
      items: (returnItems || []).map((l) => ({
        variantId: l.variantId,
        qty: Number(l.qty) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        discount: l.discount && Number(l.discount.value) > 0
          ? { mode: l.discount.mode, value: Number(l.discount.value) }
          : undefined,
      })),
      note: `Exchange return for sale ${json?.receipt?._id || ''}`,
      // Link return receipt to the same shipment for tracking
      delivery: { company: deliveryCompany, address: deliveryAddress, contact: deliveryContact },
      deliveryProviderMeta: {
        externalId: json?.receipt?.delivery?.externalId || '',
        trackingNumber: json?.receipt?.delivery?.trackingNumber || '',
        trackingUrl: json?.receipt?.delivery?.trackingUrl || '',
      },
      ...(customerIdToUse ? { customerId: customerIdToUse } : {}),
    };
    const resR = await fetch('/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(returnPayload),
    });
    const jsonR = await resR.json();
    // We don't fail the main flow if return receipt fails, but surface message
    if (!resR.ok) {
      json.returnError = 'Failed to create return receipt';
    } else {
      json.returnReceipt = jsonR.receipt;
    }
  }

  return json;
}


