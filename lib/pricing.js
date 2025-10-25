export function computeReceiptTotals(payload) {
  // payload: { type, items[], billDiscount?, taxPercent }
  const isSale = payload.type === 'sale';
  let itemSubtotal = 0;
  let itemDiscountTotal = 0;

  for (const it of payload.items) {
    const unit = isSale ? Number(it.unitPrice || 0) : Number(it.unitCost || 0);
    const line = unit * Number(it.qty || 0);
    let lineDiscount = 0;
    if (it.discount && it.discount.value > 0) {
      if (it.discount.mode === 'percent') {
        lineDiscount = (line * it.discount.value) / 100;
      } else {
        lineDiscount = Math.min(it.discount.value, line);
      }
    }
    itemSubtotal += line;
    itemDiscountTotal += lineDiscount;
  }

  const subAfterItems = Math.max(0, itemSubtotal - itemDiscountTotal);

  // Bill-level discount
  let billDiscountTotal = 0;
  if (payload.billDiscount && payload.billDiscount.value > 0) {
    if (payload.billDiscount.mode === 'percent') {
      billDiscountTotal = (subAfterItems * payload.billDiscount.value) / 100;
    } else {
      billDiscountTotal = Math.min(payload.billDiscount.value, subAfterItems);
    }
  }

  const baseForTax = Math.max(0, subAfterItems - billDiscountTotal);

  // Tax on final amount
  const taxPercent = Number(payload.taxPercent || 0);
  const taxTotal = (baseForTax * taxPercent) / 100;

  const grandTotal = baseForTax + taxTotal;

  return {
    itemSubtotal: round2(itemSubtotal),
    itemDiscountTotal: round2(itemDiscountTotal),
    billDiscountTotal: round2(billDiscountTotal),
    taxPercent: round2(taxPercent),
    taxTotal: round2(taxTotal),
    grandTotal: round2(grandTotal),
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}


