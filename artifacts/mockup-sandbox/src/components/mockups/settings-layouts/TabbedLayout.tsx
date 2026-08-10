import React, { useState, useEffect, useRef } from 'react';
import { Settings, Webhook, Filter, Plus, Pencil, Trash2, ChevronDown, Save } from 'lucide-react';

export default function TabbedLayout() {
  const [activeSection, setActiveSection] = useState('account');
  const isClickScrolling = useRef(false);

  useEffect(() => {
    const observerOptions = {
      root: null,
      // Adjust rootMargin so that the section becomes active when it passes just below the sticky header
      rootMargin: '-100px 0px -50% 0px',
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (isClickScrolling.current) return;
      
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    isClickScrolling.current = true;
    const element = document.getElementById(id);
    if (element) {
      // 70px for sticky header + 32px padding = ~100px offset
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
      
      // Reset the click scrolling lock after animation duration
      setTimeout(() => {
        isClickScrolling.current = false;
      }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Page Header */}
      <div className="bg-white">
        <header className="max-w-5xl mx-auto px-8 pt-12 pb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-2 text-sm">Manage your account preferences, webhook integrations, and lead filter sets.</p>
        </header>
      </div>
      
      {/* Sticky Tab Strip */}
      <div className="sticky top-0 bg-white z-20 border-b border-slate-200 shadow-[0_4px_6px_-1px_rgb(0,0,0,0.02)]">
        <div className="max-w-5xl mx-auto px-8 flex gap-8">
          <button 
            onClick={() => scrollToSection('account')}
            className={`pt-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeSection === 'account' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Account
          </button>
          <button 
            onClick={() => scrollToSection('webhook')}
            className={`pt-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeSection === 'webhook' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Webhook
          </button>
          <button 
            onClick={() => scrollToSection('filters')}
            className={`pt-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeSection === 'filters' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Filter Sets
          </button>
        </div>
      </div>

      {/* Content Area */}
      <main className="max-w-5xl mx-auto px-8 py-10 space-y-8 pb-32">
        
        {/* Section 1: Account */}
        <section
          id="account"
          className="bg-white rounded-xl border border-slate-200/80 p-8 relative overflow-hidden shadow-sm"
        >
          <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300 ${activeSection === 'account' ? 'bg-indigo-600' : 'bg-transparent'}`} />
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              Account Settings
            </h2>
            <p className="text-sm text-slate-500 mt-1">Manage your basic profile and preferences.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Lead Type</label>
              <div className="relative">
                <select className="w-full appearance-none bg-white border border-slate-300 rounded-lg py-2.5 pl-4 pr-10 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow">
                  <option>Traditional IUL</option>
                  <option>Final Expense</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Affiliation (Company)</label>
              <input 
                type="text" 
                readOnly 
                value="Family Company" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 text-slate-600 focus:outline-none"
              />
              <p className="text-xs text-slate-500">Contact admin to update</p>
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </section>

        {/* Section 2: Webhook */}
        <section
          id="webhook"
          className="bg-white rounded-xl border border-slate-200/80 p-8 relative overflow-hidden shadow-sm"
        >
          <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300 ${activeSection === 'webhook' ? 'bg-indigo-600' : 'bg-transparent'}`} />
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Webhook className="w-5 h-5 text-indigo-600" />
              CRM Delivery Webhook 
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full ml-2 border border-slate-200">Optional</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">We'll POST lead data (JSON) to this URL on each delivery. Compatible with GHL, Ringy, HubSpot, or any REST endpoint.</p>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="space-y-2 max-w-2xl">
              <label className="text-sm font-medium text-slate-700">Webhook URL</label>
              <input 
                type="text" 
                placeholder="https://rest.gohighlevel.com/v1/contacts/"
                className="w-full bg-white border border-slate-300 rounded-lg py-2.5 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
              <Save className="w-4 h-4" />
              Save Webhook
            </button>
          </div>
        </section>

        {/* Section 3: Filters */}
        <section
          id="filters"
          className="bg-white rounded-xl border border-slate-200/80 p-8 relative overflow-hidden shadow-sm"
        >
          <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300 ${activeSection === 'filters' ? 'bg-indigo-600' : 'bg-transparent'}`} />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Filter className="w-5 h-5 text-indigo-600" />
                Filter Sets
              </h2>
              <p className="text-sm text-slate-500 mt-1">Manage targeting rules for your lead delivery.</p>
            </div>
            <button className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-indigo-200/60 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Add Filter Set
            </button>
          </div>

          <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                <tr className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-3.5 px-4 text-sm font-medium text-slate-900">Default</td>
                  <td className="py-3.5 px-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-sm text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
