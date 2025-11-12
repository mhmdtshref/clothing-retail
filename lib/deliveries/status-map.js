const MAPS = {
  optimus: {
    draft: 'ordered',
    submitted: 'ordered',
    pending_pickup: 'on_delivery',
    picked_up: 'on_delivery',
    on_deliver: 'on_delivery',
    pending: 'on_delivery',
    cod_pickup: 'payment_collected',
    returned: 'returning',
    delivered: 'payment_collected',
    in_accounting: 'ready_to_receive',
    closed: 'completed',
    cancelled: 'cancelled'
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


