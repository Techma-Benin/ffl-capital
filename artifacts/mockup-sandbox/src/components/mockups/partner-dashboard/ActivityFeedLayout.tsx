import React from 'react';
import { 
  CreditCard, 
  Map as MapIcon, 
  Settings, 
  FileText, 
  HeadphonesIcon, 
  ArrowRight,
  TrendingUp,
  Target,
  Inbox
} from 'lucide-react';

export function ActivityFeedLayout() {
  return (
    <div className="min-h-screen bg-[#f3f4f8] p-6 lg:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Left Column */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1e3a5f]">Welcome back, James</h1>
            <p className="text-slate-500 mt-1">Family Company</p>
          </div>

          {/* Stat Strip */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-wrap sm:flex-nowrap divide-y sm:divide-y-0 sm:divide-x divide-slate-100 mb-8 overflow-hidden">
            <StatItem 
              label="Wallet" 
              value="$275.00" 
              icon={<CreditCard className="w-4 h-4 text-emerald-600" />} 
            />
            <StatItem 
              label="Total Leads" 
              value="2" 
              icon={<Inbox className="w-4 h-4 text-blue-600" />} 
            />
            <StatItem 
              label="Received Today" 
              value="0" 
              icon={<TrendingUp className="w-4 h-4 text-purple-600" />} 
            />
            <StatItem 
              label="Target States" 
              value="50" 
              icon={<Target className="w-4 h-4 text-orange-600" />} 
            />
          </div>

          {/* Recent Activity Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
              View all leads <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Feed */}
          <div className="space-y-3">
            <LeadCard 
              initials="T2" 
              name="Test 2" 
              state="TX" 
              type="Trad. IUL" 
              channel="Real-time" 
              price="$25.00" 
              time="Jul 16, 01:11 PM" 
              accent="border-blue-500" 
              avatarBg="bg-blue-100 text-blue-700" 
            />
            <LeadCard 
              initials="TJ" 
              name="Test4 Jones" 
              state="TX" 
              type="Trad. IUL" 
              channel="Real-time" 
              price="$25.00" 
              time="Jul 16, 12:10 PM" 
              accent="border-blue-500" 
              avatarBg="bg-blue-100 text-blue-700" 
            />

            {/* Ghost Cards */}
            <GhostCard />
            <GhostCard />
            <GhostCard />
            <GhostCard />
          </div>
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[280px] shrink-0 space-y-6">
          
          {/* Wallet Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[4rem] -mr-4 -mt-4 opacity-50 pointer-events-none transition-transform group-hover:scale-110 duration-500" />
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="text-sm font-medium text-slate-500">Wallet Balance</div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Buying Active
              </span>
            </div>
            
            <div className="text-3xl font-bold text-[#1e3a5f] mb-6 relative z-10 tracking-tight">
              $275.00
            </div>
            
            <button className="w-full bg-[#1e3a5f] hover:bg-[#152a45] text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm relative z-10">
              <CreditCard className="w-4 h-4" />
              Add Funds
            </button>
          </div>

          {/* Target States Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-orange-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                <MapIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500">Target States</div>
                <div className="text-xl font-bold text-slate-900">50</div>
              </div>
            </div>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
              Edit Targeting <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-1">
              <li>
                <button className="w-full flex items-center gap-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-sm py-2 px-3 rounded-md transition-colors text-left">
                  <FileText className="w-4 h-4" /> My Leads
                </button>
              </li>
              <li>
                <button className="w-full flex items-center gap-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-sm py-2 px-3 rounded-md transition-colors text-left">
                  <TrendingUp className="w-4 h-4" /> Reports
                </button>
              </li>
              <li>
                <button className="w-full flex items-center gap-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-sm py-2 px-3 rounded-md transition-colors text-left">
                  <Settings className="w-4 h-4" /> Settings
                </button>
              </li>
              <li>
                <button className="w-full flex items-center gap-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-sm py-2 px-3 rounded-md transition-colors text-left">
                  <HeadphonesIcon className="w-4 h-4" /> Contact Us
                </button>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="flex-1 p-4 flex flex-col justify-center bg-white hover:bg-slate-50/50 transition-colors">
      <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-[#1e3a5f]">{value}</div>
    </div>
  );
}

function LeadCard({ 
  initials, 
  name, 
  state, 
  type, 
  channel, 
  price, 
  time, 
  accent, 
  avatarBg 
}: { 
  initials: string, 
  name: string, 
  state: string, 
  type: string, 
  channel: string, 
  price: string, 
  time: string, 
  accent: string, 
  avatarBg: string 
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm flex items-center p-4 hover:shadow-md hover:border-slate-300 transition-all border-l-4 ${accent} cursor-pointer group`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mr-4 ${avatarBg}`}>
        {initials}
      </div>
      
      <div className="flex-1 min-w-0 pr-4">
        <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
          {name}
        </h3>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
            {state}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-100">
            {type}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide bg-purple-50 text-purple-700 border border-purple-100">
            {channel}
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-lg font-bold text-emerald-600">{price}</div>
        <div className="text-xs font-medium text-slate-400 mt-1">{time}</div>
      </div>
    </div>
  );
}

function GhostCard() {
  return (
    <div className="bg-white/40 rounded-xl border border-slate-200/50 flex items-center p-4 opacity-40 select-none pointer-events-none">
      <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0 mr-4 animate-pulse" />
      <div className="flex-1 min-w-0 pr-4">
        <div className="h-5 bg-slate-200 rounded w-1/4 mb-3 animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-5 w-8 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end">
        <div className="h-6 w-16 bg-slate-200 rounded mb-2 animate-pulse" />
        <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
