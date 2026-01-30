export function normalizeAndValidatePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length !== 10) {
    const err = new Error('Phone must be exactly 10 digits');
    err.code = 'INVALID_PHONE';
    throw err;
  }
  return digits;
}

export function buildNotes({ items = [], grandTotal = 0, companiesByVariantId = new Map() }) {
  const lines = [];
  for (const it of items) {
    const code = it?.snapshot?.productCode || '';
    const size = it?.snapshot?.size || '';
    const color = it?.snapshot?.color || '';
    const companyName = companiesByVariantId.get(String(it?.variantId)) || '';
    const label = [code, [size, color].filter(Boolean).join('/'), companyName]
      .filter(Boolean)
      .join(' ');
    if (label) lines.push(label);
  }
  lines.push(`COD: ${Number(grandTotal || 0).toFixed(2)}`);
  let notes = lines.join('\n');
  if (notes.length > 500) notes = notes.slice(0, 500);
  return notes;
}
