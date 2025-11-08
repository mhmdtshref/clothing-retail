import * as optimus from '@/lib/deliveries/optimus';
import * as sabeq from '@/lib/deliveries/sabeqLaheq';
import { mapProviderStatus } from '@/lib/deliveries/status-map';

function getAdapter(company) {
  const key = String(company || '').toLowerCase();
  if (key === 'optimus') return optimus;
  if (key === 'sabeq_laheq') return sabeq;
  const err = new Error(`Unsupported delivery company: ${company}`);
  err.code = 'UNSUPPORTED_DELIVERY_COMPANY';
  throw err;
}

export async function createDeliveryOrder({ company, order }) {
  const adapter = getAdapter(company);
  return adapter.createOrder(order);
}

export async function getDeliveryStatus({ company, externalId }) {
  const adapter = getAdapter(company);
  const status = await adapter.getStatus(externalId);
  return {
    ...status,
    internal: mapProviderStatus(company, status?.providerStatus || ''),
  };
}


