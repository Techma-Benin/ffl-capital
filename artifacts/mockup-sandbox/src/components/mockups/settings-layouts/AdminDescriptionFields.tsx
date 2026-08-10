import React, { useState } from 'react';

// ── Variant 3: Description + Fields Side-by-Side ─────────────────────────
// Full page width. Each section is a wide card split into two columns:
// left = section title + description prose, right = the actual fields.
// Eliminates the max-w-2xl constraint — uses the full screen width.
// Save bar is sticky at the bottom of each card's right column.

export default function AdminDescriptionFields() {
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
  const [saved, setSaved] = useState<string | null>(null);

  function set(patch: Partial<typeof form>) {
    setForm(f => ({ ...f, ...patch }));
    setSaved(null);
  }

  function save() {
    setSaved('Saved');
    setTimeout(() => setSaved(null), 2500);
  }

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

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Platform pricing and integration configuration</p>
      </div>

      <div className="px-8 py-8 space-y-6 max-w-[1400px] mx-auto">

        {/* ── Lead categories ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[280px_1fr]">
            {/* Left: description */}
            <div className="px-8 py-7 border-r border-slate-100 bg-slate-50/40">
              <h2 className="text-[13px] font-bold text-slate-900">Lead categories</h2>
              <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                Single source of truth for lead classification. Each category defines the SRC mapping, pricing, matching rules, and Integrity Connect label. The internal type is set once and cannot be renamed.
              </p>
              <button className="mt-5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <span className="text-lg leading-none">+</span> Add category
              </button>
            </div>
            {/* Right: table */}
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="text-left px-6 py-3">Category</th>
                    <th className="text-left px-6 py-3">SRC</th>
                    <th className="text-left px-6 py-3">Price</th>
                    <th className="text-left px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map(c => (
                    <tr key={c.type} className="hover:bg-slate-50/60 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 text-[13px]">{c.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.type}</p>
                      </td>
                      <td className="px-6 py-4 text-[12px] text-slate-600 font-mono">{c.src}</td>
                      <td className="px-6 py-4 text-[12px] text-slate-500">{c.price}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-[280px_1fr]">
            <div className="px-8 py-7 border-r border-slate-100 bg-slate-50/40">
              <h2 className="text-[13px] font-bold text-slate-900">Pricing</h2>
              <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                Default prices applied across all partners and filter sets unless overridden on a specific filter set.
              </p>
            </div>
            <div className="px-8 py-7">
              <div className="grid grid-cols-2 gap-6 max-w-md">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Realtime price ($)</label>
                  <input type="number" min={1} step={0.01} value={form.defaultRealtimePrice} onChange={e => set({ defaultRealtimePrice: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Aged price ($)</label>
                  <input type="number" min={1} step={0.01} value={form.defaultAgedPrice} onChange={e => set({ defaultAgedPrice: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Lead lifecycle ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-[280px_1fr]">
            <div className="px-8 py-7 border-r border-slate-100 bg-slate-50/40">
              <h2 className="text-[13px] font-bold text-slate-900">Lead lifecycle</h2>
              <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                Control how long a lead stays classified as real-time, and configure duplicate protection and intake validation rules.
              </p>
            </div>
            <div className="px-8 py-7 space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Aged days threshold</label>
                <input type="number" min={1} value={form.agedDaysThreshold} onChange={e => set({ agedDaysThreshold: Number(e.target.value) })} className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
              </div>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.trustedformEnabled} onChange={e => set({ trustedformEnabled: e.target.checked })} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm">
                    <span className="font-medium text-slate-800">Enable TrustedForm validation on intake</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">Reject leads that fail certificate verification</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.duplicateCheckEnabled} onChange={e => set({ duplicateCheckEnabled: e.target.checked })} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm">
                    <span className="font-medium text-slate-800">Enable duplicate lead checks</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">Block duplicate phone numbers within the window below</span>
                  </span>
                </label>
                {form.duplicateCheckEnabled && (
                  <div className="ml-8">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Duplicate check window (days)</label>
                    <input type="number" min={1} value={form.duplicateWindowDays} onChange={e => set({ duplicateWindowDays: Number(e.target.value) })} className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Platform ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-[280px_1fr]">
            <div className="px-8 py-7 border-r border-slate-100 bg-slate-50/40">
              <h2 className="text-[13px] font-bold text-slate-900">Platform</h2>
              <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                Partner onboarding controls and integration routing. Switch to Live mode only when ready for production traffic.
              </p>
            </div>
            <div className="px-8 py-7 space-y-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.adminApprovalRequired} onChange={e => set({ adminApprovalRequired: e.target.checked })} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm">
                  <span className="font-medium text-slate-800">Require admin approval for new partners</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">New signups stay in Pending until manually approved</span>
                </span>
              </label>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Integrations mode</label>
                <select value={form.integrationsMode} onChange={e => set({ integrationsMode: e.target.value })} className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none">
                  <option value="mock">Mock (log only)</option>
                  <option value="live">Live (email, CRM, Integrity)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Send unmatched leads to Integrity after (hours)</label>
                <p className="text-[11px] text-slate-400 mb-1.5">How long a lead sits unmatched before the nightly job forwards it to Integrity Connect.</p>
                <input type="number" min={1} value={form.integrityDelayHours} onChange={e => set({ integrityDelayHours: Number(e.target.value) })} className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Resale vendors ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[280px_1fr]">
            <div className="px-8 py-7 border-r border-slate-100 bg-slate-50/40">
              <h2 className="text-[13px] font-bold text-slate-900">Resale vendors</h2>
              <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                Third-party platforms that receive leads from this system. Click a row to edit ping/post URLs.
              </p>
              <button className="mt-5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <span className="text-lg leading-none">+</span> Add vendor
              </button>
            </div>
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="text-left px-6 py-3">Vendor</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Post URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendors.map(v => (
                    <tr key={v.key} className="hover:bg-slate-50/60 cursor-pointer transition-colors">
                      <td className="px-6 py-4 font-mono text-[12px] font-semibold text-slate-700">{v.key}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${v.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${v.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {v.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[11px] text-slate-400 font-mono truncate max-w-[260px]">{v.postUrl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-white/95 backdrop-blur border-t border-slate-200 flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-emerald-600 font-medium">{saved}</span>}
          <button onClick={save} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors">
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
