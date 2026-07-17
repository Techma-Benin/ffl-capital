import React, { useState } from 'react';
import { Settings, Webhook, Filter, Plus, Pencil, Trash2, ChevronDown, Save, X } from 'lucide-react';

export default function SidebarNav() {
  const [activeTab, setActiveTab] = useState('account');

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <div className="w-[240px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 22h20L12 2z" />
              </svg>
            </div>
            Leadify
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 py-6 px-3 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-semibold transition-colors ${
              activeTab === 'account'
                ? 'bg-indigo-50 text-indigo-700 relative'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {activeTab === 'account' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full" />
            )}
            <Settings className="w-4 h-4" />
            Account Settings
          </button>

          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-semibold transition-colors ${
              activeTab === 'webhook'
                ? 'bg-indigo-50 text-indigo-700 relative'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {activeTab === 'webhook' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full" />
            )}
            <Webhook className="w-4 h-4" />
            CRM Webhook
          </button>

          <button
            onClick={() => setActiveTab('filters')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-semibold transition-colors ${
              activeTab === 'filters'
                ? 'bg-indigo-50 text-indigo-700 relative'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {activeTab === 'filters' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full" />
            )}
            <Filter className="w-4 h-4" />
            Filter Sets
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-10 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500 mt-1 text-sm">Configure your lead targeting and account preferences.</p>
          </div>

          {/* Card Container */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 min-h-[400px]">
            {activeTab === 'account' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-6">Account Settings</h2>

                  <div className="space-y-6 max-w-xl">
                    {/* Lead Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Lead Type</label>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <select className="w-full appearance-none bg-white border border-slate-300 rounded-lg pl-4 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm">
                            <option>Traditional IUL</option>
                            <option>Final Expense</option>
                            <option>Term Life</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Affiliation */}
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <label className="block text-sm font-medium text-slate-700">Affiliation (Company)</label>
                        <span className="text-xs text-slate-500">Contact admin to update</span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value="Family Company"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-600 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'webhook' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">CRM Delivery Webhook</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                      Optional
                    </span>
                  </div>

                  <div className="max-w-2xl">
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                      We'll POST lead data (JSON) to this URL on each delivery. Compatible with GHL, Ringy, HubSpot, or any REST endpoint.
                    </p>

                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Webhook URL</label>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <input
                            type="url"
                            placeholder="https://rest.gohighlevel.com/v1/contacts/"
                            className="w-full bg-white border border-slate-300 rounded-lg pl-4 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          />
                          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 whitespace-nowrap">
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'filters' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-slate-900">Filter Sets</h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                          Targeting
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">Manage rules for which leads you receive.</p>
                    </div>

                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                      <Plus className="w-4 h-4" />
                      Add Filter Set
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        <tr className="hover:bg-slate-50 transition-colors group">
                          <td className="px-4 py-4 text-sm font-medium text-slate-900">Default</td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                              Active
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
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
