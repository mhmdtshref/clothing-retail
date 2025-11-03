'use client';

import * as React from 'react';

// A line in the cart
// { id, variantId, productId, code, name, size, color, companyName, onHand, qty, unitPrice, discount: {mode, value} }

function newLineFromPick(variant, product) {
  return {
    id: `${variant._id}`,
    variantId: variant._id,
    productId: product._id,
    code: product.code,
    name: product.name || '',
    size: variant.size,
    color: variant.color,
    companyName: variant.company?.name || '',
    onHand: Number(variant.qty ?? 0),
    qty: 1,
    unitPrice: Number(product.basePrice || 0),
    discount: { mode: 'amount', value: 0 },
  };
}

export function useCart() {
  const [items, setItems] = React.useState([]);
  const [mode, setMode] = React.useState('sale'); // 'sale' | 'sale_return'
  const [customer, setCustomer] = React.useState(null); // { _id, name, phone }

  const addVariant = React.useCallback((variant, product) => {
    setItems((prev) => {
      const id = `${variant._id}`;
      const exist = prev.find((l) => l.id === id);
      if (exist) {
        const nextQty = (exist.qty || 0) + 1; // allow exceeding on-hand; stock may go negative
        return prev.map((l) => (l.id === id ? { ...l, qty: nextQty } : l));
      }
      const line = newLineFromPick(variant, product);
      return [...prev, line];
    });
  }, []);

  const removeLine = React.useCallback((id) => {
    setItems((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clear = React.useCallback(() => setItems([]), []);

  const setQty = React.useCallback((id, qty) => {
    setItems((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty: Math.max(0, Math.floor(Number(qty) || 0)) } : l)),
    );
  }, []);

  const inc = React.useCallback((id) => {
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, qty: (l.qty || 0) + 1 } : l)));
  }, []);

  const dec = React.useCallback((id) => {
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, qty: Math.max(0, (l.qty || 0) - 1) } : l)));
  }, []);

  const setUnitPrice = React.useCallback((id, price) => {
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, unitPrice: Math.max(0, Number(price) || 0) } : l)));
  }, []);

  const setDiscount = React.useCallback((id, patch) => {
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, discount: { ...l.discount, ...patch } } : l)));
  }, []);

  const clearCustomer = React.useCallback(() => setCustomer(null), []);

  return { items, mode, setMode, customer, setCustomer, clearCustomer, addVariant, removeLine, clear, setQty, inc, dec, setUnitPrice, setDiscount };
}


