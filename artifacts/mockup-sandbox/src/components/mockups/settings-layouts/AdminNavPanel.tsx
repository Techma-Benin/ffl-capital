import React, { useState } from 'react';

// ── Variant 2: Left Nav + Right Detail Panel ──────────────────────────────
// Left rail lists all 5 sections with icons, count badges, and summaries.
// Right panel renders only the active section, full-height, focused.
// Classic settings UX (macOS System Settings / Linear style).

type Section = 'categories' | 'pricing' | 'lifecycle' | 'platform' | 'vendors';

export default function AdminNavPanel() {
  const [active, setActive] = useState<Section>('categories');
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

  function set(patch: Partial<typeof form>) {
    setForm(f => ({ ...f, ...patch }));
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

  const navItems: { id: Section; label: string; summary: string; icon: string; badge?: string }[] = [
    { id: 'categories', label: 'Lead categories', summary: '4 types configured', icon: '⬡', badge: '4' },
    { id: 'pricing', label: 'Pricing', summary: '$25 realtime · $5 aged', icon: '﹩' },
    { id: 'lifecycle', label: 'Lead lifecycle', summary: '30-day aged threshold', icon: '↻' },
    { id: 'platform', label: 'Platform', summary: form.integrationsMode === 'live' ? 'Live mode' : 'Mock mode', icon: '⚙' },
    { id: 'vendors', label: 'Resale vendors', summary: `${vendors.length} vendors`, icon: '⇀', badge: String(vendors.length) },
  ];

  return (
    <div className="flex h-screen bg-[#f5f5f7] font-sans overflow-hidden">
      {/* Left nav rail */}
      <div className="w-[260px] flex-shrink-0 flex flex-col bg-white border-r border-slate-200">
        {/* Header */}
        <div className="px-5 py-5 border-b border-slate-100">
          <h1 className="text-[15px] font-bold text-slate-900">Settings</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Platform configuration</p>
        </div>
        {/* Nav list */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                active === item.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {/* Active bar */}
              <div className="relative">
                <span className={`text-base leading-none select-none ${active === item.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-semibold leading-tight ${active === item.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                  {item.label}
                </p>
                <p className={`text-[11px] mt-0.5 leading-tight ${active === item.id ? 'text-indigo-500' : 'text-slate-400'}`}>
                  {item.summary}
                </p>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active === item.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        {/* Save button pinned to bottom */}
        <div className="p-4 border-t border-slate-100">
          <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors">
            Save changes
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 py-10">

          {active === 'categories' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Lead categories</h2>
                <p className="text-sm text-slate-500 mt-1">Single source of truth for lead classification. Each category defines the SRC mapping, pricing, and matching rules. The internal type is set once and cannot be renamed.</p>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/70">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categories</span>
                  <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">+ Add category</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="text-left px-5 py-2.5">Category</th>
                      <th className="text-left px-5 py-2.5">SRC</th>
                      <th className="text-left px-5 py-2.5">Price</th>
                      <th className="text-left px-5 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map(c => (
                      <tr key={c.type} className="hover:bg-slate-50/60 transition-colors cursor-pointer">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900 text-[13px]">{c.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.type}</p>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-slate-600 font-mono">{c.src}</td>
                        <td className="px-5 py-3.5 text-[12px] text-slate-500">{c.price}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {active === 'pricing' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pricing</h2>
                <p className="text-sm text-slate-500 mt-1">Default prices applied when a partner has no price override on their filter sets.</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Default realtime price ($)</label>
                  <input type="number" min={1} step={0.01} value={form.defaultRealtimePrice} onChange={e => set({ defaultRealtimePrice: Number(e.target.value) })} className="w-full max-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  <p className="text-[11px] text-slate-400 mt-1">Charged for fresh, real-time leads</p>
                </div>
                <div className="h-px bg-slate-100" />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Default aged price ($)</label>
                  <input type="number" min={1} step={0.01} value={form.defaultAgedPrice} onChange={e => set({ defaultAgedPrice: Number(e.target.value) })} className="w-full max-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  <p className="text-[11px] text-slate-400 mt-1">Charged for aged leads from the marketplace</p>
                </div>
              </div>
            </div>
          )}

          {active === 'lifecycle' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Lead lifecycle</h2>
                <p className="text-sm text-slate-500 mt-1">Control how long a lead stays "real-time" and configure duplicate protection rules.</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Aged days threshold</label>
                  <input type="number" min={1} value={form.agedDaysThreshold} onChange={e => set({ agedDaysThreshold: Number(e.target.value) })} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  <p className="text-[11px] text-slate-400 mt-1">Leads older than this are classified as aged</p>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="space-y-3.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Quality controls</p>
                  <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.trustedformEnabled} onChange={e => set({ trustedformEnabled: e.target.checked })} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span>
                      <span className="font-medium text-slate-800">Enable TrustedForm validation on intake</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">Reject leads that fail TrustedForm certificate checks</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.duplicateCheckEnabled} onChange={e => set({ duplicateCheckEnabled: e.target.checked })} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span>
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
          )}

          {active === 'platform' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Platform</h2>
                <p className="text-sm text-slate-500 mt-1">Partner onboarding controls and integration routing.</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.adminApprovalRequired} onChange={e => set({ adminApprovalRequired: e.target.checked })} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span>
                    <span className="font-medium text-slate-800">Require admin approval for new partners</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">New signups stay in Pending state until manually approved</span>
                  </span>
                </label>
                <div className="h-px bg-slate-100" />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Integrations mode</label>
                  <select value={form.integrationsMode} onChange={e => set({ integrationsMode: e.target.value })} className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none">
                    <option value="mock">Mock (log only)</option>
                    <option value="live">Live (email, CRM, Integrity)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">In mock mode, emails and CRM calls are logged but not sent</p>
                </div>
                <div className="h-px bg-slate-100" />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Integrity unmatched lead delay (hours)</label>
                  <input type="number" min={1} value={form.integrityDelayHours} onChange={e => set({ integrityDelayHours: Number(e.target.value) })} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                  <p className="text-[11px] text-slate-400 mt-1">How long a lead sits unmatched before the nightly job forwards it to Integrity Connect. Default: 24h.</p>
                </div>
              </div>
            </div>
          )}

          {active === 'vendors' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Resale vendors</h2>
                <p className="text-sm text-slate-500 mt-1">Third-party platforms that receive leads from this system. Click a row to edit.</p>
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/70">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendors</span>
                  <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">+ Add vendor</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="text-left px-5 py-2.5">Vendor</th>
                      <th className="text-left px-5 py-2.5">Status</th>
                      <th className="text-left px-5 py-2.5">Post URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendors.map(v => (
                      <tr key={v.key} className="hover:bg-slate-50/60 cursor-pointer transition-colors">
                        <td className="px-5 py-3.5 font-mono text-[12px] font-semibold text-slate-700">{v.key}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${v.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            <span className={`w-1 h-1 rounded-full ${v.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {v.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[11px] text-slate-400 truncate max-w-[220px]">{v.postUrl}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} className="px-5 py-3">
                        <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">+ Add vendor</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
