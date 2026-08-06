import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  ShoppingCart, 
  FileText, 
  Settings, 
  Phone, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  MoreHorizontal,
  Eye,
  PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function MetricsBannerFeed() {
  return (
    <div className="flex h-screen w-full bg-[#f3f4f8] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 shrink-0 z-20 flex flex-col">
        <div className="px-5 py-6 flex flex-col gap-8 h-full overflow-y-auto">
          {/* Logo / Title */}
          <div>
            <h1 className="text-2xl font-bold text-[#1e3a5f] tracking-tight">FFL Capital</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Partner Portal</p>
          </div>

          {/* Main Nav */}
          <nav className="flex flex-col gap-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-[#1e3a5f]/5 text-[#1e3a5f] font-medium relative group">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1e3a5f] rounded-r-full" />
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm">Dashboard</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-colors">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm">My Leads</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-colors">
              <Wallet className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Wallet</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-colors">
              <ShoppingCart className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Aged Marketplace</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium transition-colors">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Reports</span>
            </a>
          </nav>

          {/* Quick Actions (secondary links) */}
          <div className="flex flex-col gap-1 border-t border-gray-100 pt-6">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Shortcuts</p>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-[#1e3a5f] text-sm font-medium transition-colors group">
              <PlusCircle className="w-4 h-4 text-gray-400 group-hover:text-[#1e3a5f] transition-colors" />
              Add Funds
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-[#1e3a5f] text-sm font-medium transition-colors group">
              <ShoppingCart className="w-4 h-4 text-gray-400 group-hover:text-[#1e3a5f] transition-colors" />
              Aged Marketplace
            </a>
          </div>

          {/* Footer Nav */}
          <nav className="flex flex-col gap-1 mt-auto border-t border-gray-100 pt-6 pb-2">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 text-sm font-medium transition-colors">
              <Settings className="w-4 h-4 text-gray-400" />
              Settings
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 text-sm font-medium transition-colors">
              <Phone className="w-4 h-4 text-gray-400" />
              Contact Us
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="bg-white h-16 flex items-center justify-between px-8 border-b border-gray-200 shrink-0 z-20">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Dashboard</h2>
          </div>
          <div className="flex items-center gap-5">
            <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 flex items-center gap-1.5 px-3 py-1 text-xs shadow-sm">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Buying Active
            </Badge>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors -mr-1.5">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 leading-tight">James Wilson</p>
                <p className="text-[11px] text-gray-500 font-medium">Family Company</p>
              </div>
              <div className="w-9 h-9 bg-gradient-to-tr from-[#1e3a5f] to-blue-700 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-white">
                JW
              </div>
            </div>
          </div>
        </header>
        
        {/* Banner Strip */}
        <div className="bg-[#1e3a5f] border-b border-[#142842] px-8 py-2.5 flex items-center gap-3 text-xs text-blue-100 shadow-sm z-10 relative">
          <span className="font-bold text-white text-sm">$275.00</span> <span className="opacity-80">Wallet</span>
          <span className="text-blue-400/50 mx-2">•</span>
          <span className="font-bold text-white text-sm">2</span> <span className="opacity-80">Leads</span>
          <span className="text-blue-400/50 mx-2">•</span>
          <span className="font-bold text-white text-sm">0</span> <span className="opacity-80">Today</span>
          <span className="text-blue-400/50 mx-2">•</span>
          <span className="font-bold text-white text-sm">50</span> <span className="opacity-80">Target States</span>
        </div>

        {/* Content Area - Hero Table */}
        <div className="flex-1 p-8 flex flex-col overflow-hidden min-h-0">
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col shadow-sm flex-1 overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Recent Leads</h2>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-hover:text-gray-500 transition-colors" />
                  <Input 
                    placeholder="Search leads..." 
                    className="pl-9 w-64 h-9 bg-gray-50/50 border-gray-200 hover:border-gray-300 focus:bg-white transition-all text-sm" 
                  />
                </div>
                <Button variant="link" className="text-[#1e3a5f] hover:text-blue-700 p-0 h-auto font-semibold text-sm">
                  View all
                </Button>
              </div>
            </div>
            
            {/* Table */}
            <div className="flex-1 overflow-auto bg-gray-50/20">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-white text-gray-500 text-xs font-semibold uppercase tracking-wider sticky top-0 z-10 shadow-[0_1px_0_rgba(229,231,235,1)]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">State</th>
                    <th className="px-6 py-4 font-semibold">Lead Type</th>
                    <th className="px-6 py-4 font-semibold">Channel</th>
                    <th className="px-6 py-4 font-semibold text-right">Price</th>
                    <th className="px-6 py-4 font-semibold">Delivered</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">Test 2</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold text-xs border border-gray-200">
                        TX
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-medium px-2.5 py-0.5">
                        Trad. IUL
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium px-2.5 py-0.5">
                        Real-time
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-gray-900">$25.00</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-500 font-medium">Jul 16, 01:11 PM</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" className="h-8 bg-white hover:bg-gray-50 text-gray-700 border-gray-200 font-medium shadow-sm transition-all">
                        <Eye className="w-3.5 h-3.5 mr-1.5 text-gray-400" /> View
                      </Button>
                    </td>
                  </tr>
                  <tr className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">Test4 Jones</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold text-xs border border-gray-200">
                        TX
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-medium px-2.5 py-0.5">
                        Trad. IUL
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium px-2.5 py-0.5">
                        Real-time
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-gray-900">$25.00</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-500 font-medium">Jul 16, 12:10 PM</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" className="h-8 bg-white hover:bg-gray-50 text-gray-700 border-gray-200 font-medium shadow-sm transition-all">
                        <Eye className="w-3.5 h-3.5 mr-1.5 text-gray-400" /> View
                      </Button>
                    </td>
                  </tr>
                  {/* Empty rows to fill space visually */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors opacity-40">
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-4 w-12 bg-gray-100 rounded animate-pulse ml-auto" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-8 w-16 bg-gray-100 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="border-t border-gray-200 bg-white px-6 py-3 flex items-center justify-between shrink-0">
              <span className="text-sm text-gray-500">Showing <span className="font-semibold text-gray-900">1</span> to <span className="font-semibold text-gray-900">2</span> of <span className="font-semibold text-gray-900">2</span> leads</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled className="h-8 w-8 p-0 border-gray-200 text-gray-400">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center h-8 min-w-[2rem] px-2 text-sm font-semibold text-[#1e3a5f] bg-blue-50 rounded-md border border-blue-100">
                  1
                </div>
                <Button variant="outline" size="sm" disabled className="h-8 w-8 p-0 border-gray-200 text-gray-400">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
