"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { User } from "@/lib/types";
import { Search, User as UserIcon, Phone, Mail, Award, Clock, X, FileText, ChevronRight, Star, Sparkles } from "lucide-react";
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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-[#060608] text-white font-sans relative">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest mb-1.5 font-mono shadow-gold-sm">
            <Sparkles size={11} className="text-accent" /> VIP Vault
          </div>
          <h1 className="text-3xl font-bold font-serif text-white tracking-tight">Customers & Rider Profiles</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-0.5 font-medium">Search, inspect concierge preferences, and manage executive accounts.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-8 relative max-w-2xl">
        <label htmlFor="customerSearch" className="sr-only">Search</label>
        <input 
          id="customerSearch"
          type="text" 
          placeholder="Search by name, email, or phone..." 
          className="w-full bg-[#0e0e13] border border-neutral-800 rounded-2xl p-4 pl-12 text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-gold-sm placeholder:text-neutral-500 font-medium"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <Search className="absolute left-4 top-4 text-accent" size={20} />
        <button type="submit" className="hidden">Search</button>
      </form>

      {loading && <div className="text-neutral-400 text-xs font-mono">Searching customer vault...</div>}
      
      {!loading && customers.length === 0 && (
        <div className="text-center p-12 bg-[#0e0e13] border border-neutral-800 rounded-3xl text-neutral-400 text-xs">
          No customers found matching "{searchQuery}"
        </div>
      )}

      {!loading && customers.length > 0 && (
        <div className="bg-[#0e0e13] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#0a0a0e] text-neutral-400 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-800">
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
                    className="border-b border-neutral-800/60 hover:bg-[#14141c] transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-[#181822] border border-neutral-700 flex items-center justify-center text-accent mr-3 overflow-hidden relative shrink-0">
                          {c.photoUrl ? (
                            <Image src={c.photoUrl} alt={`${c.firstName} ${c.lastName}`} fill sizes="40px" className="object-cover" />
                          ) : (
                            <UserIcon size={20} />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-accent transition-colors flex items-center gap-2">
                            {c.firstName} {c.lastName}
                            <span className="text-[10px] bg-accent/15 text-accent border border-accent/30 px-1.5 py-0.5 rounded font-bold flex items-center font-mono">
                              <Star size={10} className="fill-accent text-accent mr-1 inline" /> {((c as any).rating || 5.0).toFixed(1)}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400 flex items-center mt-1">
                            <Award size={12} className="mr-1 text-accent" />
                            {c.totalRides} lifetime rides
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-medium text-white flex items-center mb-1">
                        <Phone size={13} className="text-accent mr-2" />
                        {c.phone}
                      </div>
                      {c.email && (
                        <div className="text-xs text-neutral-400 flex items-center">
                          <Mail size={13} className="text-neutral-500 mr-2" />
                          {c.email}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {c.preferences ? (
                        <div className="text-xs space-y-1">
                          {c.preferences.beverage?.preference && c.preferences.beverage.preference !== "no_preference" && (
                            <div className="text-neutral-300">
                              <span className="text-neutral-500 font-bold">Bev:</span> {c.preferences.beverage.preference.replace(/_/g, " ")}
                            </div>
                          )}
                          {c.preferences.conversation && c.preferences.conversation !== "no_preference" && (
                            <div className="text-neutral-300">
                              <span className="text-neutral-500 font-bold">Mood:</span> {c.preferences.conversation.replace(/_/g, " ")}
                            </div>
                          )}
                          {(!c.preferences.beverage || c.preferences.beverage.preference === "no_preference") && 
                           (!c.preferences.conversation || c.preferences.conversation === "no_preference") && (
                            <span className="text-neutral-500 text-xs italic">Default VIP</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full font-mono">
                        Active VIP
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(c);
                        }}
                        className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1"
                      >
                        <span>Profile</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Slide-over Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={() => setSelectedCustomer(null)}
          ></div>
          
          <div className="relative w-full max-w-lg bg-[#0a0a0e] text-white h-full shadow-2xl border-l border-neutral-800 flex flex-col animate-in slide-in-from-right overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-neutral-800 bg-[#0e0e13] flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-[#181822] border-2 border-accent flex items-center justify-center overflow-hidden relative shrink-0 shadow-gold-sm">
                  {selectedCustomer.photoUrl ? (
                    <Image src={selectedCustomer.photoUrl} alt={selectedCustomer.firstName} fill sizes="64px" className="object-cover" />
                  ) : (
                    <UserIcon size={32} className="text-accent" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold font-serif text-white">{selectedCustomer.firstName} {selectedCustomer.lastName}</h2>
                  <p className="text-xs text-neutral-400 mt-1 flex items-center">
                    <Award size={13} className="mr-1 text-accent" /> {selectedCustomer.totalRides} Lifetime Charters
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)} 
                className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              
              {/* Contact Card */}
              <div className="p-4 bg-[#0e0e13] border border-neutral-800 rounded-2xl space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 font-mono">Contact Details</div>
                <div className="text-sm font-semibold flex items-center text-white">
                  <Phone size={15} className="mr-2 text-accent" /> {selectedCustomer.phone}
                </div>
                {selectedCustomer.email && (
                  <div className="text-sm font-medium flex items-center text-neutral-300">
                    <Mail size={15} className="mr-2 text-neutral-500" /> {selectedCustomer.email}
                  </div>
                )}
                {selectedCustomer.createdAt && (
                  <div className="text-xs text-neutral-400 flex items-center pt-2 border-t border-neutral-800">
                    <Clock size={14} className="mr-2 text-neutral-500" /> 
                    Client since {typeof (selectedCustomer.createdAt as any)?.toDate === "function" ? format((selectedCustomer.createdAt as any).toDate(), "MMMM yyyy") : "—"}
                  </div>
                )}
              </div>

              {/* Internal Admin Notes */}
              {selectedCustomer.notes && (
                <div className="p-4 bg-accent/10 border border-accent/30 rounded-2xl">
                  <div className="text-xs font-bold text-accent uppercase tracking-wider mb-1 flex items-center font-mono">
                    <FileText size={14} className="mr-1 text-accent" /> Internal Admin Notes
                  </div>
                  <p className="text-xs text-neutral-200 font-medium leading-relaxed">{selectedCustomer.notes}</p>
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
