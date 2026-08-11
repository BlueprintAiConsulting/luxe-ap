"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { LayoutDashboard, Radio, Users, Car, DollarSign, UserCircle, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard },
  { name: "Dispatch", href: "/dispatch", icon: Radio },
  { name: "Drivers", href: "/drivers", icon: Users },
  { name: "Vehicles", href: "/vehicles", icon: Car },
  { name: "Pricing", href: "/pricing", icon: DollarSign },
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
                  ? "bg-brand text-white font-semibold shadow-md"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-brand font-medium"
              }`}
            >
              <Icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto pt-8 border-t border-neutral-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-neutral-500 hover:bg-red-50 hover:text-red-600 font-medium"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-neutral-200 fixed top-0 w-full z-40">
        <div className="font-bold text-xl tracking-widest text-brand uppercase">Luxe</div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2 text-neutral-600">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-16 bg-white flex flex-col p-4 h-full overflow-y-auto">
          <NavLinks />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-white border-r border-neutral-200 h-screen fixed top-0 left-0 py-8 px-4 z-10">
        <div className="px-4 mb-8">
          <h1 className="font-bold text-2xl tracking-widest text-brand uppercase">Luxe</h1>
          <div className="text-xs font-semibold text-neutral-400 mt-1">Admin Portal</div>
        </div>
        <NavLinks />
      </div>
    </>
  );
}
