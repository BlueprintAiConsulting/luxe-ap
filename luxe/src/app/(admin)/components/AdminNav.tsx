"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { LayoutDashboard, Radio, Users, Car, DollarSign, UserCircle, LogOut, Menu, X, ArrowUpRight, Building2 } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard },
  { name: "Dispatch", href: "/dispatch", icon: Radio },
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
    <>
      <div className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-white/10 text-white font-semibold"
                  : "text-neutral-400 hover:bg-white/5 hover:text-white font-medium"
              }`}
            >
              <Icon size={20} className={isActive ? "text-accent" : "opacity-60"} />
              {item.name}
            </Link>
          );
        })}
      </div>
      
      <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-1">
        <div className="px-4 py-2 text-xs font-semibold text-neutral-500">
          Views
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-neutral-400 hover:bg-white/5 hover:text-white font-medium group"
        >
          <UserCircle size={20} className="opacity-60 group-hover:text-accent transition-colors" />
          Rider View
          <ArrowUpRight size={14} className="ml-auto opacity-50" />
        </Link>
        <Link
          href="/today"
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-neutral-400 hover:bg-white/5 hover:text-white font-medium group"
        >
          <Car size={20} className="opacity-60 group-hover:text-accent transition-colors" />
          Driver View
          <ArrowUpRight size={14} className="ml-auto opacity-50" />
        </Link>
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 mt-4 rounded-xl transition-all text-neutral-400 hover:bg-white/5 hover:text-white font-medium"
        >
          <LogOut size={20} className="opacity-60" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-brand fixed top-0 w-full z-40">
        <div className="font-bold text-xl text-white">Luxe</div>
        <button aria-label="Toggle mobile menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2 text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-16 bg-brand flex flex-col p-4 h-full overflow-y-auto">
          <NavLinks />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-brand h-screen fixed top-0 left-0 py-8 px-4 z-10 text-white">
        <div className="px-4 mb-8">
          <h1 className="font-bold text-2xl text-white">Luxe</h1>
          <div className="text-xs font-medium text-neutral-400 mt-1">Admin Portal</div>
        </div>
        <NavLinks />
      </div>
    </>
  );
}
