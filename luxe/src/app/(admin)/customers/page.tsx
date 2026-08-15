"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { User } from "@/lib/types";
import { Search, User as UserIcon, Phone, Mail, Award, Clock, X, FileText, ChevronRight, Star } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import RiderPreferencesView from "@/app/(admin)/components/RiderPreferencesView";

export default function CustomersPage() {
  const { user, role } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  
  // Load initial list (top 50 riders)
  useEffect(() => {
    if (!user || role !== "admin") return;
    
    async function loadInitial() {
      setLoading(true);
      const q = query(
        collection(db, "users"),
        where("role", "==", "rider"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      setCustomers(snap.docs.map(d => d.data() as User));
      setLoading(false);
    }
    loadInitial();
  }, [user, role]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    const searchTerm = searchQuery.toLowerCase().trim();
    
    const phoneQ = query(
      collection(db, "users"),
      where("role", "==", "rider"),
      where("phone", ">=", searchTerm),
      where("phone", "<=", searchTerm + "\uf8ff"),
      limit(20)
    );

    const nameQ = query(
      collection(db, "users"),
      where("role", "==", "rider"),
      where("searchName", ">=", searchTerm),
      where("searchName", "<=", searchTerm + "\uf8ff"),
      limit(20)
    );

    const [phoneSnap, nameSnap] = await Promise.all([getDocs(phoneQ), getDocs(nameQ)]);
    
    const resultsMap = new Map<string, User>();
    phoneSnap.docs.forEach(d => resultsMap.set(d.id, d.data() as User));
    nameSnap.docs.forEach(d => resultsMap.set(d.id, d.data() as User));
    
    setCustomers(Array.from(resultsMap.values()));
    setLoading(false);
  };

  if (role !== "admin") {
    return <div className="p-8 text-red-500">Access Denied</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-neutral-50 text-neutral-900 font-sans relative">
      
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand">Customers & Rider Profiles</h1>
          <p className="text-neutral-500 text-sm mt-1">Search, inspect concierge preferences, and manage rider accounts.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-8 relative">
        <label htmlFor="customerSearch" className="sr-only">Search</label>
        <input 
          id="customerSearch"
          type="text" 
          placeholder="Search by name or phone..." 
          className="w-full max-w-2xl bg-white border border-neutral-200 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand shadow-sm"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <Search className="absolute left-4 top-4 text-neutral-400" size={24} />
        <button type="submit" className="hidden">Search</button>
      </form>

      {loading && <div className="text-neutral-500">Searching...</div>}
      
      {!loading && customers.length === 0 && (
        <div className="text-center p-12 bg-white border border-neutral-200 rounded-2xl text-neutral-500">
          No customers found matching "{searchQuery}"
        </div>
      )}

      {!loading && customers.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-xs font-semibold border-b border-neutral-200">
                <th className="p-4 font-semibold">Client</th>
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Concierge Notes</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                return (
                  <tr 
                    key={c.uid} 
                    onClick={() => setSelectedCustomer(c)}
                    className="border-b border-neutral-100 hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-brand mr-3 overflow-hidden relative shrink-0">
                          {c.photoUrl ? (
                            <Image src={c.photoUrl} alt={`${c.firstName} ${c.lastName}`} fill sizes="40px" className="object-cover" />
                          ) : (
                            <UserIcon size={20} />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-brand text-sm group-hover:text-accent transition-colors flex items-center gap-2">
                            {c.firstName} {c.lastName}
                            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold flex items-center">
                              <Star size={11} className="fill-amber-600 text-amber-600 mr-1 inline" /> {((c as any).rating || 5.0).toFixed(1)}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-500 flex items-center mt-1">
                            <Award size={12} className="mr-1 text-accent" />
                            {c.totalRides} lifetime rides
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-brand flex items-center mb-1">
                        <Phone size={14} className="text-neutral-400 mr-2" />
                        {c.phone}
                      </div>
                      {c.email && (
                        <div className="text-sm text-neutral-500 flex items-center">
                          <Mail size={14} className="text-neutral-400 mr-2" />
                          {c.email}
                        </div>
                      )}
                    </td>
                    <td className="p-4 max-w-xs">
                      {c.notes ? (
                        <span className="text-xs text-neutral-600 truncate block">{c.notes}</span>
                      ) : (
                        <span className="text-xs text-neutral-400 italic">No notes</span>
                      )}
                    </td>
                    <td className="p-4">
                      {c.disabled ? (
                        <span className="bg-neutral-200 text-neutral-600 text-xs font-semibold px-2 py-1 rounded">Suspended</span>
                      ) : (
                        <span className="bg-brand text-white text-xs font-semibold px-2 py-1 rounded">Active</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(c);
                        }}
                        className="inline-flex items-center text-xs font-bold text-brand hover:text-accent transition-colors bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg"
                      >
                        View Profile <ChevronRight size={14} className="ml-1" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setSelectedCustomer(null)}
          ></div>
          
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-neutral-200 bg-brand text-white flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-neutral-800 border-2 border-accent flex items-center justify-center overflow-hidden relative shrink-0">
                  {selectedCustomer.photoUrl ? (
                    <Image src={selectedCustomer.photoUrl} alt={selectedCustomer.firstName} fill sizes="64px" className="object-cover" />
                  ) : (
                    <UserIcon size={32} className="text-neutral-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedCustomer.firstName} {selectedCustomer.lastName}</h2>
                  <p className="text-xs text-white/70 mt-1 flex items-center">
                    <Award size={13} className="mr-1 text-accent" /> {selectedCustomer.totalRides} Lifetime Rides
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)} 
                className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Contact Card */}
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Contact Details</div>
                <div className="text-sm font-semibold flex items-center text-neutral-900">
                  <Phone size={15} className="mr-2 text-neutral-500" /> {selectedCustomer.phone}
                </div>
                {selectedCustomer.email && (
                  <div className="text-sm font-medium flex items-center text-neutral-600">
                    <Mail size={15} className="mr-2 text-neutral-500" /> {selectedCustomer.email}
                  </div>
                )}
                {selectedCustomer.createdAt && (
                  <div className="text-xs text-neutral-500 flex items-center pt-2 border-t border-neutral-200">
                    <Clock size={14} className="mr-2 text-neutral-400" /> 
                    Client since {typeof (selectedCustomer.createdAt as any)?.toDate === "function" ? format((selectedCustomer.createdAt as any).toDate(), "MMMM yyyy") : "—"}
                  </div>
                )}
              </div>

              {/* Internal Admin Notes */}
              {selectedCustomer.notes && (
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                  <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center">
                    <FileText size={14} className="mr-1 text-amber-700" /> Internal Admin Notes
                  </div>
                  <p className="text-xs text-amber-950 font-medium">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* Rider Preferences Component */}
              <RiderPreferencesView preferences={selectedCustomer.preferences} />
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
