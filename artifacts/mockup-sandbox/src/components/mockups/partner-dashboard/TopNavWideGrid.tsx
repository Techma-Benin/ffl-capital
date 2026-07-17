import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, Wallet, Store, BarChart3, Settings, Phone,
  Bell, ChevronDown, PlusCircle, Globe, Clock, ArrowRight,
  TrendingUp, Download, CheckCircle2, Search
} from 'lucide-react';

export function TopNavWideGrid() {
  const [activeTab, setActiveTab] = useState('Dashboard');

  return (
    <div className="min-h-screen bg-[#f3f4f8] font-sans flex flex-col text-slate-900">
      {/* TOP NAVIGATION */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Portal Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1e3a5f] rounded flex items-center justify-center shadow-inner">
                <span className="text-white font-bold text-sm">FFL</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-gray-900 leading-tight">FFL Capital</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Partner Portal</p>
              </div>
            </div>
            
            <div className="h-6 w-px bg-gray-200 hidden lg:block mx-2"></div>
            
            {/* Center Nav Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              {[
                { name: 'Dashboard', icon: LayoutDashboard },
                { name: 'My Leads', icon: Users },
                { name: 'Wallet', icon: Wallet },
                { name: 'Marketplace', icon: Store },
                { name: 'Reports', icon: BarChart3 },
                { name: 'Settings', icon: Settings },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === item.name 
                      ? 'bg-slate-100 text-[#1e3a5f]' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${activeTab === item.name ? 'text-[#1e3a5f]' : 'text-gray-400'}`} />
                  {item.name}
                  {activeTab === item.name && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f] ml-1" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Right Section: User & Balance */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 border border-blue-100 rounded-full cursor-pointer hover:bg-blue-50 transition-colors">
              <Wallet className="w-4 h-4 text-[#1e3a5f]" />
              <span className="text-sm font-semibold text-[#1e3a5f]">$275.00</span>
              <PlusCircle className="w-3.5 h-3.5 text-blue-400 ml-1 hover:text-blue-600" />
            </div>
            
            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

            <div className="flex items-center gap-3 cursor-pointer group hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
              <div className="text-right hidden md:block">
                <div className="text-sm font-semibold text-gray-900 group-hover:text-[#1e3a5f] transition-colors">James Wilson</div>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="flex h-2 w-2 rounded-full bg-[#16a34a]"></span>
                  <span className="text-[11px] text-[#16a34a] font-medium leading-none">Buying Active</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center border border-[#1e3a5f]/20 shadow-sm">
                <span className="text-sm font-bold text-[#1e3a5f]">JW</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block group-hover:text-gray-600" />
            </div>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* Page Header (Optional, adds to SaaS feel) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back, James</h2>
            <p className="text-sm text-gray-500 mt-1">Here's what's happening with your leads today.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> Export Report
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg shadow-sm hover:bg-[#1e3a5f]/90 transition-colors shadow-blue-900/20">
              <Store className="w-4 h-4" /> Browse Marketplace
            </button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Wallet Balance */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full translate-x-8 -translate-y-8 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-medium text-gray-500">Wallet Balance</p>
                <div className="p-2 bg-blue-50 rounded-lg text-[#1e3a5f]">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">$275.00</h2>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <button className="text-[#1e3a5f] font-medium hover:text-blue-700 flex items-center gap-1">
                  Add Funds <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Total Leads */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-gray-500">Total Leads Received</p>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">2</h2>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              Lifetime leads received
            </div>
          </div>

          {/* Received Today */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-gray-500">Received Today</p>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">0</h2>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              Based on active filters
            </div>
          </div>

          {/* Target States */}
          <div className="bg-[#fff7ed] rounded-xl border border-orange-200 p-5 shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full translate-x-8 -translate-y-8 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-medium text-orange-800">Target States</p>
                <div className="p-2 bg-white/60 rounded-lg text-orange-600 shadow-sm">
                  <Globe className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold text-orange-900 tracking-tight">50</h2>
              </div>
              <div className="mt-4 flex items-center text-sm">
                 <button className="text-orange-700 font-medium hover:text-orange-800 flex items-center gap-1">
                  Manage Targeting <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Action Shortcuts Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="group bg-white border border-gray-200 rounded-xl p-6 text-left flex items-start gap-5 hover:border-[#1e3a5f]/30 hover:shadow-md transition-all">
            <div className="p-3.5 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors shadow-sm">
              <PlusCircle className="w-6 h-6 text-[#1e3a5f]" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-[#1e3a5f] transition-colors">Add Funds</h3>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1e3a5f] transform group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">Top up your wallet via Stripe to keep real-time leads flowing into your CRM.</p>
            </div>
          </button>

          <button className="group bg-white border border-gray-200 rounded-xl p-6 text-left flex items-start gap-5 hover:border-purple-300 hover:shadow-md transition-all">
            <div className="p-3.5 bg-slate-50 rounded-xl group-hover:bg-purple-50 transition-colors shadow-sm">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">Aged Marketplace</h3>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-600 transform group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">Browse high-intent leads 30+ days old starting from just $5 each.</p>
            </div>
          </button>

          <button className="group bg-white border border-gray-200 rounded-xl p-6 text-left flex items-start gap-5 hover:border-orange-300 hover:shadow-md transition-all">
            <div className="p-3.5 bg-slate-50 rounded-xl group-hover:bg-orange-50 transition-colors shadow-sm">
              <Globe className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                 <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">Target States</h3>
                 <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transform group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">Currently targeting 50 states. Update filters to pinpoint your ideal area.</p>
            </div>
          </button>
        </section>

        {/* Recent Leads Table */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recent Leads</h3>
              <p className="text-sm text-gray-500 mt-0.5">Your most recently received prospects</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search leads..." 
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] w-full sm:w-64 transition-all"
                />
              </div>
              <button className="text-sm font-medium text-[#1e3a5f] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                View All
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4">Lead Name</th>
                  <th className="px-6 py-4">State</th>
                  <th className="px-6 py-4">Lead Details</th>
                  <th className="px-6 py-4">Cost</th>
                  <th className="px-6 py-4">Received At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {[
                  { id: 1, name: "Test 2", state: "TX", type: "Trad. IUL", age: "Real-time", cost: "$25.00", date: "Jul 16, 01:11 PM" },
                  { id: 2, name: "Test4 Jones", state: "TX", type: "Trad. IUL", age: "Real-time", cost: "$25.00", date: "Jul 16, 12:10 PM" },
                ].map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium text-xs border border-slate-200">
                          {lead.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900 group-hover:text-[#1e3a5f] transition-colors cursor-pointer">
                          {lead.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{lead.state}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {lead.type}
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                          {lead.age}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                      {lead.cost}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {lead.date}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="px-4 py-2 text-xs font-medium text-[#1e3a5f] bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-all shadow-sm">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing <strong>2</strong> most recent leads</span>
          </div>
        </section>

      </main>
    </div>
  );
}
