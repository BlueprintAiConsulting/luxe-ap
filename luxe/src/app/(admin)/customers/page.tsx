"use client";

import { useAuth } from "@/lib/firebase/auth";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { User } from "@/lib/types";
import { Search, User as UserIcon, Phone, Mail, Award, Clock } from "lucide-react";
import { format } from "date-fns";

export default function CustomersPage() {
  const { user, role } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
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
    
    // We try to search by phone first (prefix), if not, by searchName (prefix)
    // Firestore only supports prefix matching on a single field per query easily.
    
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
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-neutral-500 text-sm mt-1">Search and manage rider profiles.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-8 relative">
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          className="w-full max-w-2xl bg-white border border-neutral-300 rounded-xl p-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-black"
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
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-200">
                <th className="p-4 font-bold">Client</th>
                <th className="p-4 font-bold">Contact</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const joinDate = typeof (c.createdAt as any)?.toDate === "function" ? (c.createdAt as any).toDate() : new Date();
                
                return (
                  <tr key={c.uid} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500 mr-3 overflow-hidden">
                          {c.photoUrl ? (
                            <img src={c.photoUrl} alt={`${c.firstName} ${c.lastName}`} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={20} />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{c.firstName} {c.lastName}</div>
                          <div className="text-xs text-neutral-500 flex items-center mt-1">
                            <Award size={12} className="mr-1 text-amber-500" />
                            {c.totalRides} lifetime rides
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold flex items-center mb-1">
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
                    <td className="p-4">
                      {c.disabled ? (
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">Suspended</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">Active</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-neutral-600 flex items-center">
                        <Clock size={14} className="text-neutral-400 mr-2" />
                        {format(joinDate, "MMM yyyy")}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
    </div>
  );
}
