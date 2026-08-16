"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { 
  LayoutDashboard, 
  Radio, 
  Users, 
  Car, 
  DollarSign, 
  UserCircle, 
  LogOut, 
  Menu, 
  X, 
  ArrowUpRight, 
  Building2, 
  Network, 
  Globe,
  Sparkles,
  ShieldAlert
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { name: "Live Radar", href: "/radar", icon: Globe, highlight: true },
  { name: "Dispatch", href: "/dispatch", icon: Radio },
  { name: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard },
  { name: "Affiliates", href: "/affiliates", icon: Network },
  { name: "Drivers", href: "/drivers", icon: Users },
  { name: "Vehicles", href: "/vehicles", icon: Car },
  { name: "Pricing", href: "/pricing", icon: DollarSign },
  { name: "Corporate", href: "/corporate", icon: Building2 },
  { name: "Customers", href: "/customers", icon: UserCircle },
];

export function AdminNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    auth.signOut();
  };

  const NavLinks = () => (
    <div className="flex flex-col h-full">
      <div className="space-y-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group active:scale-[0.98] ${
                isActive
                  ? "bg-neutral-800 text-white font-bold border border-accent/30 shadow-gold-sm"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white font-medium"
              }`}
            >
              <Icon 
                size={20} 
                className={
                  isActive 
                    ? "text-accent" 
                    : "opacity-60 group-hover:opacity-100 group-hover:text-neutral-200 transition-all"
                } 
              />
              <span className="flex-1 text-sm">{item.name}</span>
              {item.name === "Live Radar" && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
      
      <div className="pt-6 mt-4 border-t border-neutral-800 flex flex-col gap-1 pb-safe">
        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          Client & Cockpit Switcher
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-neutral-400 hover:bg-neutral-900 hover:text-white text-xs font-semibold group"
        >
          <UserCircle size={18} className="opacity-60 group-hover:text-accent transition-colors" />
          Rider View
          <ArrowUpRight size={13} className="ml-auto opacity-50" />
        </Link>
        <Link
          href="/today"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-neutral-400 hover:bg-neutral-900 hover:text-white text-xs font-semibold group"
        >
          <Car size={18} className="opacity-60 group-hover:text-accent transition-colors" />
          Driver Cockpit
          <ArrowUpRight size={13} className="ml-auto opacity-50" />
        </Link>
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 mt-2 rounded-xl transition-all text-red-400 hover:bg-red-950/40 hover:text-red-300 text-xs font-semibold"
        >
          <LogOut size={18} className="opacity-70" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between px-5 py-3.5 bg-neutral-900/95 backdrop-blur-xl border-b border-neutral-800 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
            <Globe size={16} />
          </div>
          <div>
            <div className="font-bold text-sm text-white tracking-wider uppercase font-serif">LUXE</div>
            <div className="text-[10px] text-accent font-mono leading-none">OPERATIONS</div>
          </div>
        </div>

        <button 
          aria-label="Toggle navigation menu" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="p-2.5 -mr-2 text-neutral-300 hover:text-white rounded-xl bg-neutral-800 border border-neutral-700/80 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition-all"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-20 bg-[#060608]/98 backdrop-blur-2xl flex flex-col p-6 h-full overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-200">
          <NavLinks />
        </div>
      )}

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0c0c10] border-r border-neutral-800/80 h-screen fixed top-0 left-0 py-8 px-4 z-10 text-white overflow-y-auto">
        <div className="px-4 mb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-widest mb-2 shadow-gold-sm">
            <Sparkles size={11} className="text-accent" /> Operations
          </div>
          <h1 className="font-bold text-2xl text-white tracking-tight font-serif uppercase">LUXE</h1>
          <div className="text-[11px] font-medium text-neutral-400 mt-0.5 tracking-wider uppercase">Airspace & Dispatch</div>
        </div>
        <NavLinks />
      </aside>
    </>
  );
}
