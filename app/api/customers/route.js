export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import { fetchConsigneeByPhone } from '@/lib/deliveries/optimus';
import Customer from '@/models/customer';
import City from '@/models/city';
import Area from '@/models/area';

function escapeRx(s = '') {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function normalizePhone(input) {
  return String(input || '').replace(/\D/g, '');
}

// GET /api/customers?q=
export async function GET(req) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const digits = normalizePhone(q);

  try {
    await connectToDB();

    const or = [];
    if (q) or.push({ name: new RegExp(escapeRx(q), 'i') });
    if (digits) or.push({ phone: new RegExp(escapeRx(digits)) });

    const filter = or.length ? { $or: or } : {};
    const items = await Customer.find(filter, { name: 1, phone: 1, providers: 1 })
      .sort({ name: 1 })
      .limit(10)
      .lean()
      .exec();

    // Resolve missing city/area names from DB if provider IDs present
    const cityIdsByProvider = new Map(); // provider -> Set<number>
    const areaIdsByProvider = new Map(); // provider -> Set<number>
    for (const c of items) {
      const providers = c?.providers || {};
      const chosen = providers.optimus || providers.sabeq_laheq || null;
      const company =
        chosen === providers.optimus
          ? 'optimus'
          : chosen === providers.sabeq_laheq
            ? 'sabeq_laheq'
            : undefined;
      if (!company || !chosen) continue;
      if (!chosen.cityName && typeof chosen.providerCityId === 'number') {
        if (!cityIdsByProvider.has(company)) cityIdsByProvider.set(company, new Set());
        cityIdsByProvider.get(company).add(chosen.providerCityId);
      }
      if (!chosen.areaName && typeof chosen.providerAreaId === 'number') {
        if (!areaIdsByProvider.has(company)) areaIdsByProvider.set(company, new Set());
        areaIdsByProvider.get(company).add(chosen.providerAreaId);
      }
    }
    const cityNameMap = new Map(); // key `${provider}:${id}` -> name
    const areaNameMap = new Map(); // key `${provider}:${id}` -> name
    for (const [prov, set] of cityIdsByProvider.entries()) {
      const ids = Array.from(set.values());
      if (ids.length) {
        const rows = await City.find(
          { provider: prov, providerCityId: { $in: ids } },
          { providerCityId: 1, name: 1 },
        ).lean();
        for (const r of rows) cityNameMap.set(`${prov}:${r.providerCityId}`, r.name || '');
      }
    }
    for (const [prov, set] of areaIdsByProvider.entries()) {
      const ids = Array.from(set.values());
      if (ids.length) {
        const rows = await Area.find(
          { provider: prov, providerAreaId: { $in: ids } },
          { providerAreaId: 1, name: 1 },
        ).lean();
        for (const r of rows) areaNameMap.set(`${prov}:${r.providerAreaId}`, r.name || '');
      }
    }

    const results = items.map((c) => {
      const providers = c?.providers || {};
      const chosen = providers.optimus || providers.sabeq_laheq || null;
      const company =
        chosen === providers.optimus
          ? 'optimus'
          : chosen === providers.sabeq_laheq
            ? 'sabeq_laheq'
            : undefined;
      const resolvedCityName =
        (chosen && chosen.cityName) ||
        (chosen && typeof chosen.providerCityId === 'number'
          ? cityNameMap.get(`${company}:${chosen.providerCityId}`) || undefined
          : undefined);
      const resolvedAreaName =
        (chosen && chosen.areaName) ||
        (chosen && typeof chosen.providerAreaId === 'number'
          ? areaNameMap.get(`${company}:${chosen.providerAreaId}`) || undefined
          : undefined);
      return {
        _id: c._id,
        name: c.name || '',
        phone: c.phone,
        provider: {
          cityId:
            chosen && typeof chosen.providerCityId === 'number' ? chosen.providerCityId : undefined,
          areaId:
            chosen && typeof chosen.providerAreaId === 'number' ? chosen.providerAreaId : undefined,
          addressLine: chosen && chosen.addressLine ? chosen.addressLine : undefined,
          cityName: resolvedCityName,
          areaName: resolvedAreaName,
          company,
        },
      };
    });

    // If exact 10-digit phone searched, get Optimus suggestions (multiple) and prepend to results
    if (digits && digits.length === 10) {
      // Short-circuit: if DB has exact phone with provider info, skip Optimus
      const exact = items.find((c) => String(c.phone || '') === digits);
      const opt = exact?.providers?.optimus || null;
      const hasProvider =
        !!opt &&
        typeof opt.providerCityId === 'number' &&
        typeof opt.providerAreaId === 'number' &&
        !!(opt.addressLine && String(opt.addressLine).trim());

      if (!hasProvider) {
        try {
          const remoteList = await fetchConsigneeByPhone(digits);
          if (Array.isArray(remoteList) && remoteList.length) {
            for (const remote of remoteList) {
              const provider = {
                addressLine: remote.addressLine || undefined,
                cityId: remote.cityId || undefined,
                cityName: remote.cityName || undefined,
                areaId: remote.areaId || undefined,
                areaName: remote.areaName || undefined,
              };
              results.unshift({
                _id: undefined,
                name: remote.name || '',
                phone: remote.phone,
                provider,
              });
            }
          }
        } catch (_e) {
          // ignore Optimus errors for search
        }
      }
    }

    return NextResponse.json({ ok: true, items: results });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}

const CreateSchema = z.object({
  name: z.string().trim().max(100).optional().default(''),
  phone: z.string().min(5).max(20),
  providerCompany: z.enum(['optimus', 'sabeq_laheq']).optional(),
  providerCityId: z.coerce.number().int().positive().optional(),
  providerAreaId: z.coerce.number().int().positive().optional(),
  providerCityName: z.string().trim().max(200).optional().default(''),
  providerAreaName: z.string().trim().max(200).optional().default(''),
  addressLine: z.string().trim().max(500).optional().default(''),
});

// POST /api/customers  { name, phone }
export async function POST(req) {
  let lastPhone = '';
  try {
    const authSession = await auth.api.getSession({ headers: await headers() });
    if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const raw = parsed.data;
    const nameIn = String(raw.name || '').trim();
    const phone = normalizePhone(raw.phone);
    lastPhone = phone;
    if (!phone) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Invalid phone' },
        { status: 400 },
      );
    }

    await connectToDB();

    // Build update patch with provided fields only
    const set = {};
    if (nameIn) set.name = nameIn;
    // If provider fields are provided, update the nested providers.{company}.*
    const hasProviderFields =
      typeof raw.providerCityId !== 'undefined' ||
      typeof raw.providerAreaId !== 'undefined' ||
      typeof raw.addressLine !== 'undefined';
    if (hasProviderFields) {
      const company = raw.providerCompany || 'optimus';
      const cityIdNum =
        typeof raw.providerCityId !== 'undefined' ? Number(raw.providerCityId) : undefined;
      const areaIdNum =
        typeof raw.providerAreaId !== 'undefined' ? Number(raw.providerAreaId) : undefined;
      const addrLineStr =
        typeof raw.addressLine !== 'undefined' ? String(raw.addressLine || '') : undefined;
      let cityNameStr =
        typeof raw.providerCityName !== 'undefined'
          ? String(raw.providerCityName || '')
          : undefined;
      let areaNameStr =
        typeof raw.providerAreaName !== 'undefined'
          ? String(raw.providerAreaName || '')
          : undefined;

      // Fallback: if names not provided, try to resolve from City/Area collections
      try {
        if (!cityNameStr && typeof cityIdNum === 'number') {
          const cityDoc = await City.findOne(
            { provider: company, providerCityId: cityIdNum },
            { name: 1 },
          ).lean();
          if (cityDoc?.name) cityNameStr = cityDoc.name;
        }
        if (!areaNameStr && typeof areaIdNum === 'number') {
          const areaDoc = await Area.findOne(
            { provider: company, providerAreaId: areaIdNum },
            { name: 1 },
          ).lean();
          if (areaDoc?.name) areaNameStr = areaDoc.name;
        }
      } catch {}

      if (typeof cityIdNum !== 'undefined') set[`providers.${company}.providerCityId`] = cityIdNum;
      if (typeof areaIdNum !== 'undefined') set[`providers.${company}.providerAreaId`] = areaIdNum;
      if (typeof addrLineStr !== 'undefined') set[`providers.${company}.addressLine`] = addrLineStr;
      if (typeof cityNameStr !== 'undefined') set[`providers.${company}.cityName`] = cityNameStr;
      if (typeof areaNameStr !== 'undefined') set[`providers.${company}.areaName`] = areaNameStr;
    }

    // Upsert by phone
    const doc = await Customer.findOneAndUpdate(
      { phone },
      { $set: set, $setOnInsert: { phone } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return NextResponse.json(
      {
        ok: true,
        customer: {
          _id: doc._id,
          name: doc.name || '',
          phone: doc.phone,
          providers: doc.providers || {},
        },
      },
      { status: 200 },
    );
  } catch (err) {
    if (err?.code === 11000) {
      // Unique conflict on phone: fetch and return
      const phone = lastPhone;
      const c = phone
        ? await Customer.findOne({ phone })
            .lean()
            .exec()
            .catch(() => null)
        : null;
      if (c) {
        return NextResponse.json(
          {
            ok: true,
            customer: {
              _id: c._id,
              name: c.name || '',
              phone: c.phone,
              providers: c.providers || {},
            },
          },
          { status: 200 },
        );
      }
      return NextResponse.json(
        { error: 'Conflict', message: 'Phone already exists' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
