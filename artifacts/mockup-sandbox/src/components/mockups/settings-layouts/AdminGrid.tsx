import React, { useState } from 'react';

// ── Variant 1: Two-Column Dashboard Grid ──────────────────────────────────
// All sections visible at once. Lead categories spans full width at top.
// Below: 2-column grid — (Pricing + Lead lifecycle) left, (Platform + Resale vendors) right.
// Dense, no scrolling needed for a 1280px screen.

export default function AdminGrid() {
  const [form, setForm] = useState({
    defaultRealtimePrice: 25,
    defaultAgedPrice: 5,
    agedDaysThreshold: 30,
    trustedformEnabled: false,
    duplicateCheckEnabled: true,
    duplicateWindowDays: 30,
    adminApprovalRequired: true,
    integrationsMode: 'mock',
    integrityDelayHours: 24,
  });

  const categories = [
    { name: 'Traditional IUL', type: 'traditional_iul', src: 'IUL_LeadConduit', price: 'global', status: 'Active' },
    { name: 'High Intent IUL', type: 'high_intent_iul', src: 'IUL_LeadConduit_HighIntent', price: 'global', status: 'Active' },
    { name: 'Mortgage Protection', type: 'mortgage_protection', src: 'Mortgage_LeadConduit', price: 'global', status: 'Active' },
    { name: 'Final Expense', type: 'final_expense', src: 'Veteran_LeadConduit', price: 'global', status: 'Active' },
  ];

  const vendors = [
    { key: 'integrity', enabled: true, postUrl: 'https://app.leadconduit.com/flows/…' },
    { key: 'leadconduit', enabled: true, postUrl: 'https://app.leadconduit.com/flows/…' },
  ];

  function set(patch: Partial<typeof form>) {
    setForm(f => ({ ...f, ...patch }));
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Platform pricing and integration configuration</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
          Save all changes
        </button>
      </div>

      <div className="px-8 py-6 space-y-5 max-w-[1400px] mx-auto">

        {/* Lead categories — full width */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Lead categories</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Single source of truth for lead classification. The internal type is set once and cannot be renamed.</p>
            </div>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <span className="text-base leading-none">+</span> Add category
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="text-left px-5 py-2.5">Category</th>
                <th className="text-left px-5 py-2.5">SRC</th>
                <th className="text-left px-5 py-2.5">Price</th>
                <th className="text-left px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map(c => (
                <tr key={c.type} className="hover:bg-slate-50/60 transition-colors cursor-pointer">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900 text-[13px]">{c.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{c.type}</p>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-slate-600 font-mono">{c.src}</td>
                  <td className="px-5 py-3 text-[12px] text-slate-500">{c.price}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                      <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-5">
            {/* Pricing */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Pricing</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Default realtime price ($)</label>
                  <input
                    type="number" min={1} step={0.01}
                    value={form.defaultRealtimePrice}
                    onChange={e => set({ defaultRealtimePrice: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Default aged price ($)</label>
                  <input
                    type="number" min={1} step={0.01}
                    value={form.defaultAgedPrice}
                    onChange={e => set({ defaultAgedPrice: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Lead lifecycle */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Lead lifecycle</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Aged days threshold</label>
                  <input
                    type="number" min={1}
                    value={form.agedDaysThreshold}
                    onChange={e => set({ agedDaysThreshold: Number(e.target.value) })}
                    className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div className="flex flex-col gap-3 pt-1">
                  <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.trustedformEnabled} onChange={e => set({ trustedformEnabled: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    Enable TrustedForm validation on intake
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.duplicateCheckEnabled} onChange={e => set({ duplicateCheckEnabled: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    Enable duplicate lead checks
                  </label>
                </div>
                {form.duplicateCheckEnabled && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Duplicate check window (days)</label>
                    <input
                      type="number" min={1}
                      value={form.duplicateWindowDays}
                      onChange={e => set({ duplicateWindowDays: Number(e.target.value) })}
                      className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Platform */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Platform</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.adminApprovalRequired} onChange={e => set({ adminApprovalRequired: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Require admin approval for new partners
                </label>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Integrations mode</label>
                  <select
                    value={form.integrationsMode}
                    onChange={e => set({ integrationsMode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none"
                  >
                    <option value="mock">Mock (log only)</option>
                    <option value="live">Live (email, CRM, Integrity)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Integrity unmatched lead delay (hours)</label>
                  <input
                    type="number" min={1}
                    value={form.integrityDelayHours}
                    onChange={e => set({ integrityDelayHours: Number(e.target.value) })}
                    className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Resale vendors */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Resale vendors</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Third-party platforms that receive leads. Click to edit.</p>
                </div>
                <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  <span className="text-base leading-none">+</span> Add vendor
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-2.5">Vendor</th>
                    <th className="text-left px-5 py-2.5">Status</th>
                    <th className="text-left px-5 py-2.5">Post URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendors.map(v => (
                    <tr key={v.key} className="hover:bg-slate-50/60 cursor-pointer transition-colors">
                      <td className="px-5 py-3 font-mono text-[12px] text-slate-700">{v.key}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${v.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          <span className={`w-1 h-1 rounded-full ${v.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {v.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[11px] text-slate-400 truncate max-w-[180px]">{v.postUrl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
