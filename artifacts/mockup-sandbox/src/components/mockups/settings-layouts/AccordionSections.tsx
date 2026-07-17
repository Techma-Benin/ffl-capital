import React, { useState } from 'react';
import { Settings, Webhook, Filter, Plus, Pencil, Trash2, ChevronDown, Save } from 'lucide-react';

export default function AccordionSections() {
  const [openSections, setOpenSections] = useState({
    account: true,
    webhook: true,
    filter: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage your account preferences, delivery methods, and targeting.
          </p>
        </div>

        {/* Accordions Wrapper */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col divide-y divide-slate-200">
          
          {/* Panel 1: Account Settings */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleSection('account')}
              className="flex items-center justify-between w-full px-6 py-4 bg-white hover:bg-slate-50 transition-colors first:rounded-t-2xl focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-slate-400" />
                <span className="font-semibold text-slate-900">Account Settings</span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  openSections.account ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openSections.account && (
              <div className="px-6 py-5 bg-slate-50/40 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Lead Type */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Lead Type</label>
                    <div className="flex gap-3">
                      <select className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                        <option>Traditional IUL</option>
                        <option>Final Expense</option>
                        <option>Term Life</option>
                      </select>
                      <button className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                        <Save className="w-4 h-4 mr-1.5" />
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Affiliation */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Affiliation (Company)</label>
                    <input
                      type="text"
                      readOnly
                      value="Family Company"
                      className="block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                    />
                    <p className="text-xs text-slate-500">Contact admin to update</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel 2: CRM Delivery Webhook */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleSection('webhook')}
              className="flex items-center justify-between w-full px-6 py-4 bg-white hover:bg-slate-50 transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <Webhook className="w-5 h-5 text-slate-400" />
                <span className="font-semibold text-slate-900">CRM Delivery Webhook</span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Optional
                </span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  openSections.webhook ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openSections.webhook && (
              <div className="px-6 py-5 bg-slate-50/40 border-t border-slate-100">
                <div className="max-w-2xl space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Webhook URL</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="https://rest.gohighlevel.com/v1/contacts/"
                        className="block w-full flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                        <Save className="w-4 h-4 mr-1.5" />
                        Save
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                      We'll POST lead data (JSON) to this URL on each delivery. Compatible with GHL, Ringy, HubSpot, or any REST endpoint.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel 3: Filter Sets */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleSection('filter')}
              className="flex items-center justify-between w-full px-6 py-4 bg-white hover:bg-slate-50 transition-colors last:rounded-b-2xl focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-slate-400" />
                <span className="font-semibold text-slate-900">Filter Sets</span>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  Targeting
                </span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  openSections.filter ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openSections.filter && (
              <div className="px-6 py-5 bg-slate-50/40 border-t border-slate-100 last:rounded-b-2xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Configured Filter Sets</h3>
                      <p className="text-xs text-slate-500 mt-1">Manage rules for lead targeting and distribution.</p>
                    </div>
                    <button className="inline-flex items-center justify-center rounded-md bg-white border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                      <Plus className="w-4 h-4 mr-1.5 text-slate-400" />
                      Add Filter Set
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-900">Default</span>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Active
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <button className="p-1.5 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
