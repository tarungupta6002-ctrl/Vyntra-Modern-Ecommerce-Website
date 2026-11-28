'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, MapPin, Phone, Plus } from 'lucide-react';
import { INDIAN_STATES } from '@/lib/vendor/indian-states';
import { VendorPageHeader, VendorStats, vendorButton } from '@/components/vendor/vendor-ui';

import { CometSpinner } from '@/components/ui/loading-spinner';
interface PickupAddress {
  id: string;
  facilityName: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  contactPhone: string;
  isDefault: boolean;
  stockUnits: number;
  stockRows: number;
  shipments: number;
}

type FormState = Omit<PickupAddress, 'id' | 'isDefault' | 'stockUnits' | 'stockRows' | 'shipments'> & { makeDefault: boolean };

const EMPTY: FormState = { facilityName: '', streetAddress: '', city: '', state: '', postalCode: '', contactPhone: '', makeDefault: false };

const inputClass =
  'mt-1 w-full rounded-lg border border-[#888C8C] bg-white px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-2 focus:ring-[#007185]/20';

async function readJson(res: Response) {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message || 'Something went wrong. Please try again.');
  return json.data;
}

export default function VendorPickupAddressesPage() {
  const [addresses, setAddresses] = useState<PickupAddress[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await readJson(await fetch('/api/vendor/warehouses', { cache: 'no-store' }));
      setAddresses(data.addresses);
      if (data.addresses.length === 0) {
        setEditing('new');
        setForm(EMPTY);
      }
    } catch (e: any) {
      setLoadError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (a: PickupAddress) => {
    setEditing(a.id);
    setForm({ ...a, contactPhone: a.contactPhone.replace(/^\+91\s?/, ''), makeDefault: false });
    setFormError(null);
    setNotice(null);
  };

  const startNew = () => {
    setEditing('new');
    setForm(EMPTY);
    setFormError(null);
    setNotice(null);
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const isNew = editing === 'new';
      const data = await readJson(
        await fetch(isNew ? '/api/vendor/warehouses' : `/api/vendor/warehouses/${editing}`, {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      );
      setAddresses(data.addresses);
      setEditing(null);
      setNotice(isNew ? 'Pickup address added.' : 'Pickup address updated.');
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const rowAction = async (a: PickupAddress, action: 'default' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Remove "${a.facilityName}"?`)) return;
    setBusyId(a.id);
    setRowError(null);
    setNotice(null);
    try {
      const data = await readJson(
        await fetch(`/api/vendor/warehouses/${a.id}`, {
          method: action === 'delete' ? 'DELETE' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: action === 'delete' ? undefined : JSON.stringify({ makeDefault: true }),
        })
      );
      setAddresses(data.addresses);
      setNotice(action === 'delete' ? 'Address removed.' : `"${a.facilityName}" is now your default pickup address.`);
    } catch (err: any) {
      setRowError({ id: a.id, message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const form_ = (
    <form onSubmit={save} className="rounded-xl border border-[#D5D9D9] bg-white p-5 space-y-4" noValidate id="pickup-address-form">
      <h2 className="text-base font-bold text-[#0F1111]">{editing === 'new' ? 'Add a pickup address' : 'Edit pickup address'}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="pa-name" className="text-sm font-semibold">Name for this address</label>
          <input id="pa-name" value={form.facilityName} onChange={set('facilityName')} maxLength={80} placeholder="e.g. Main shop, Godown" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pa-street" className="text-sm font-semibold">Address</label>
          <textarea id="pa-street" value={form.streetAddress} onChange={set('streetAddress')} maxLength={200} rows={2} placeholder="Building / shop number, street, area, landmark" className={inputClass} />
        </div>
        <div>
          <label htmlFor="pa-city" className="text-sm font-semibold">City</label>
          <input id="pa-city" value={form.city} onChange={set('city')} maxLength={60} autoComplete="address-level2" className={inputClass} />
        </div>
        <div>
          <label htmlFor="pa-state" className="text-sm font-semibold">State</label>
          <select id="pa-state" value={form.state} onChange={set('state')} className={inputClass}>
            <option value="">Choose a state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pa-pin" className="text-sm font-semibold">PIN code</label>
          <input id="pa-pin" value={form.postalCode} onChange={set('postalCode')} inputMode="numeric" maxLength={6} autoComplete="postal-code" className={inputClass} />
        </div>
        <div>
          <label htmlFor="pa-phone" className="text-sm font-semibold">Phone for the courier</label>
          <input id="pa-phone" value={form.contactPhone} onChange={set('contactPhone')} inputMode="numeric" maxLength={14} placeholder="10-digit mobile number" autoComplete="tel-national" className={inputClass} />
        </div>
      </div>
      {editing === 'new' && (addresses?.length ?? 0) > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.makeDefault} onChange={(e) => setForm((f) => ({ ...f, makeDefault: e.target.checked }))} />
          Make this my default pickup address
        </label>
      )}
      {formError && <p className="text-sm text-[#B12704]">{formError}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD814] px-5 py-2 text-sm font-semibold hover:bg-[#F7CA00] disabled:opacity-60">
          {saving && <CometSpinner className="h-4 w-4 text-current" decorative />} Save address
        </button>
        {(addresses?.length ?? 0) > 0 && (
          <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-[#D5D9D9] px-5 py-2 text-sm font-semibold hover:bg-[#F7F8F8]">
            Cancel
          </button>
        )}
      </div>
    </form>
  );

  return (
    <div className="max-w-4xl space-y-6 text-[#0F1111]">
      <VendorPageHeader
        title="Pickup addresses"
        description={<>Couriers collect your orders from your default address. Customers see its city as &ldquo;Ships from&rdquo;, and it is printed on order invoices.</>}
        actions={
          addresses && addresses.length > 0 && editing !== 'new' ? (
            <button type="button" onClick={startNew} className={vendorButton.secondary}>
              <Plus className="h-4 w-4" /> Add address
            </button>
          ) : undefined
        }
      />

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}

      {loadError && <p className="rounded-xl border border-[#D5D9D9] bg-white p-5 text-sm text-[#B12704]">{loadError}</p>}

      {!addresses && !loadError && (
        <p className="flex items-center gap-2 text-sm text-[#565959]">
          <CometSpinner className="h-4 w-4 text-current" decorative /> Loading…
        </p>
      )}

      {addresses && addresses.length === 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>You need a pickup address before you can publish products or add offers.</p>
        </div>
      )}

      {editing === 'new' && form_}

      {addresses && addresses.length > 0 && (
        <ul className="space-y-3">
          {addresses.map((a) =>
            editing === a.id ? (
              <li key={a.id}>{form_}</li>
            ) : (
              <li key={a.id} className="rounded-xl border border-[#D5D9D9] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{a.facilityName}</span>
                      {a.isDefault && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">Default</span>
                      )}
                    </div>
                    <p className="mt-1 flex gap-1.5 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#565959]" />
                      <span>
                        {a.streetAddress}, {a.city}, {a.state} {a.postalCode}
                      </span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm">
                      <Phone className="h-4 w-4 text-[#565959]" /> {a.contactPhone}
                    </p>
                    <p className="mt-2 text-xs text-[#565959]">
                      {a.stockRows > 0 ? `${a.stockUnits} units of stock recorded here` : 'No stock recorded here'}
                      {a.shipments > 0 ? ` · ${a.shipments} shipment${a.shipments === 1 ? '' : 's'} sent from here` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => startEdit(a)} className="rounded-full border border-[#D5D9D9] px-4 py-1.5 text-sm font-semibold hover:bg-[#F7F8F8]">
                      Edit
                    </button>
                    {!a.isDefault && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === a.id}
                          onClick={() => rowAction(a, 'default')}
                          className="rounded-full border border-[#D5D9D9] px-4 py-1.5 text-sm font-semibold hover:bg-[#F7F8F8] disabled:opacity-60"
                        >
                          Make default
                        </button>
                        <button
                          type="button"
                          disabled={busyId === a.id}
                          onClick={() => rowAction(a, 'delete')}
                          className="rounded-full px-3 py-1.5 text-sm font-semibold text-[#B12704] hover:bg-rose-50 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {rowError?.id === a.id && <p className="mt-2 text-sm text-[#B12704]">{rowError.message}</p>}
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
