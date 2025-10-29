export function computeReceiptTotals(payload, opts = {}) {
  // payload: { type, items[], billDiscount?, taxPercent }
  // opts: { includeItems: boolean }
  const isSaleOrReturn = payload.type === 'sale' || payload.type === 'sale_return';

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const toNum = (v, def = 0) => (Number.isFinite(Number(v)) ? Number(v) : def);

  const applyDiscount = (amount, discount) => {
    const base = toNum(amount, 0);
    if (!discount || !discount.value || discount.value <= 0) return 0;
    if (discount.mode === 'percent') {
      return round2((base * toNum(discount.value, 0)) / 100);
    }
    return round2(Math.min(toNum(discount.value, 0), base));
  };

  let itemSubtotal = 0;
  let itemDiscountTotal = 0;

  const itemBreakdown = (payload.items || []).map((it) => {
    const unit = isSaleOrReturn ? toNum(it.unitPrice) : toNum(it.unitCost);
    const qty = Math.max(0, toNum(it.qty));
    const line = round2(unit * qty);

    const lineDiscount = applyDiscount(line, it.discount);
    const net = round2(Math.max(0, line - lineDiscount));

    itemSubtotal = round2(itemSubtotal + line);
    itemDiscountTotal = round2(itemDiscountTotal + lineDiscount);

    return {
      variantId: it.variantId,
      qty,
      unit,
      line,
      lineDiscount,
      net,
    };
  });

  const subAfterItems = round2(Math.max(0, itemSubtotal - itemDiscountTotal));

  const billDiscountTotal = applyDiscount(subAfterItems, payload.billDiscount);
  const subAfterBill = round2(Math.max(0, subAfterItems - billDiscountTotal));

  const taxPercent = toNum(payload.taxPercent, 0);
  const taxTotal = round2((subAfterBill * taxPercent) / 100);

  const grandTotal = round2(subAfterBill + taxTotal);

  const totals = {
    itemSubtotal: round2(itemSubtotal),
    itemDiscountTotal: round2(itemDiscountTotal),
    billDiscountTotal: round2(billDiscountTotal),
    subTotalAfterDiscounts: round2(subAfterBill),
    taxPercent: round2(taxPercent),
    taxTotal: round2(taxTotal),
    grandTotal: round2(grandTotal),
  };

  return opts.includeItems ? { totals, items: itemBreakdown } : { totals };
}

export function computeLine({ qty, unit, discount }) {
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const toNum = (v, def = 0) => (Number.isFinite(Number(v)) ? Number(v) : def);
  const applyDiscount = (amount, discount) => {
    const base = toNum(amount, 0);
    if (!discount || !discount.value || discount.value <= 0) return 0;
    if (discount.mode === 'percent') {
      return round2((base * toNum(discount.value, 0)) / 100);
    }
    return round2(Math.min(toNum(discount.value, 0), base));
  };

  const q = Math.max(0, toNum(qty));
  const u = Math.max(0, toNum(unit));
  const line = round2(q * u);
  const lineDiscount = applyDiscount(line, discount);
  const net = round2(Math.max(0, line - lineDiscount));
  return { line, lineDiscount, net };
}


