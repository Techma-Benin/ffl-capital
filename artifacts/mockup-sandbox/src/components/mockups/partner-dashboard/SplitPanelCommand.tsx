import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  Store, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  Filter, 
  Plus, 
  Search, 
  Map, 
  ChevronRight, 
  Activity, 
  ArrowRight, 
  ShieldCheck,
  CreditCard,
  Target
} from 'lucide-react';

export function SplitPanelCommand() {
  return (
    <div className="flex h-screen bg-[#f3f4f8] text-slate-800 font-sans overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-[220px] bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-sm z-10 relative">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#1e3a5f] rounded flex items-center justify-center text-white font-bold text-sm">
                F
              </div>
              <span className="font-bold text-slate-900 tracking-tight">FFL Capital</span>
            </div>
          </div>
          
          <div className="px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Partner Portal
          </div>

          <nav className="px-3 flex flex-col gap-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-[#1e3a5f] text-white">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
              <div className="ml-auto w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              <Users className="w-4 h-4" />
              My Leads
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              <Wallet className="w-4 h-4" />
              Wallet
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              <Store className="w-4 h-4" />
              Aged Marketplace
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              <BarChart3 className="w-4 h-4" />
              Reports
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              <Settings className="w-4 h-4" />
              Settings
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900">
              <HelpCircle className="w-4 h-4" />
              Contact Us
            </a>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
              JW
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">James Wilson</div>
              <div className="text-xs text-slate-500 truncate">Family Company</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 px-2 py-1.5 bg-green-50 rounded-md border border-green-100">
            <div className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
            <span className="text-xs font-medium text-[#16a34a]">Buying Active</span>
          </div>
        </div>
      </aside>

      {/* Center Main Area */}
      <main className="flex-1 overflow-auto flex flex-col relative z-0">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 sticky top-0 z-10 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">Command Center</h1>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search leads..." 
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent w-64 transition-all"
              />
            </div>
          </div>
        </header>

        <div className="p-6 h-full flex flex-col">
          {/* Leads Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">All Recent Leads</h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
                  Export
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead ID</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">State</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Channel</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivered</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="px-5 py-3.5 text-sm text-slate-500 font-mono">#L-83921</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">Test 2</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">TX</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Trad. IUL
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                        Real-time
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-700">$25.00</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">Jul 16, 01:11 PM</td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="text-slate-400 hover:text-[#1e3a5f] p-1 rounded hover:bg-slate-100 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="px-5 py-3.5 text-sm text-slate-500 font-mono">#L-83920</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">Test4 Jones</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">TX</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Trad. IUL
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                        Real-time
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-700">$25.00</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">Jul 16, 12:10 PM</td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="text-slate-400 hover:text-[#1e3a5f] p-1 rounded hover:bg-slate-100 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                  
                  {/* Empty state padding rows for effect */}
                  {Array.from({length: 8}).map((_, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors group cursor-pointer opacity-40">
                      <td className="px-5 py-3.5 text-sm text-slate-400 font-mono">#L-8391{9-i}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-700">Client {i+5}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">CA</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                          IUL
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                          Real-time
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-600">$25.00</td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">Jul 15, {11-i}:00 AM</td>
                      <td className="px-5 py-3.5 text-right">
                        <button className="text-slate-300 hover:text-[#1e3a5f] p-1 rounded hover:bg-slate-100 transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-sm text-slate-500 flex items-center justify-between shrink-0">
              <span>Showing 10 of 2 leads (demo data)</span>
              <div className="flex gap-1">
                <button className="px-3 py-1 border border-slate-200 rounded-md bg-white text-slate-400 cursor-not-allowed">Previous</button>
                <button className="px-3 py-1 border border-slate-200 rounded-md bg-white text-slate-700 hover:bg-slate-50">Next</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Right Command Panel */}
      <aside className="w-[300px] bg-[#f8f9fc] border-l border-slate-200 overflow-y-auto shrink-0 shadow-[inset_1px_0_0_rgba(0,0,0,0.02)] z-10">
        <div className="p-5 flex flex-col gap-5">
          
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Metrics & Action</h3>
          </div>

          {/* Wallet Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#1e3a5f]/5 rounded-bl-full -mr-8 -mt-8"></div>
            <div className="flex items-center justify-between mb-4 relative">
              <div className="flex items-center gap-2 text-slate-600">
                <Wallet className="w-5 h-5 text-[#1e3a5f]" />
                <span className="font-medium">Wallet Balance</span>
              </div>
            </div>
            <div className="mb-4 relative">
              <span className="text-4xl font-bold text-slate-900 tracking-tight">$275.00</span>
            </div>
            <button className="w-full py-2.5 bg-[#1e3a5f] hover:bg-[#152a45] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Add Funds
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="text-slate-500 mb-1 text-xs font-medium uppercase tracking-wider">Total Leads</div>
              <div className="text-2xl font-bold text-slate-800">2</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="text-slate-500 mb-1 text-xs font-medium uppercase tracking-wider">Today</div>
              <div className="text-2xl font-bold text-slate-800">0</div>
            </div>
          </div>

          {/* Target States Card */}
          <div className="bg-[#fff7ed] rounded-xl shadow-sm border border-orange-200 p-5">
            <div className="flex items-center gap-2 text-orange-800 mb-3">
              <Target className="w-5 h-5" />
              <span className="font-semibold">Target States</span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-orange-900">50</span>
              <span className="text-sm font-medium text-orange-700">states active</span>
            </div>
            <a href="#" className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-800 hover:text-orange-900 transition-colors group">
              Edit Targeting
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

        </div>
      </aside>
    </div>
  );
}
