const MAPS = {
  optimus: {
    created: 'on_delivery',
    accepted: 'on_delivery',
    dispatched: 'on_delivery',
    out_for_delivery: 'on_delivery',
    cash_collected: 'payment_collected',
    ready_for_pickup: 'ready_to_receive',
    delivered: 'completed',
  },
  sabeq_laheq: {
    created: 'on_delivery',
    assigned: 'on_delivery',
    shipped: 'on_delivery',
    out_for_delivery: 'on_delivery',
    cod_received: 'payment_collected',
    arrived_destination: 'ready_to_receive',
    delivered: 'completed',
  },
};

export function mapProviderStatus(company, providerStatus) {
  const key = String(company || '').toLowerCase();
  const status = String(providerStatus || '').toLowerCase();
  const table = MAPS[key] || {};
  return table[status] || 'on_delivery';
}


