"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/auth";
import { CorporateAccount } from "@/lib/types";
import { Building2, Plus, Edit2, Key, Users } from "lucide-react";
import CorporateModal from "./components/CorporateModal";

export default function CorporateAccountsPage() {
  const { user, role } = useAuth();
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CorporateAccount | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [role]);

  const fetchAccounts = async () => {
    if (role !== "admin") return;
    setLoading(true);
    try {
      const q = query(collection(db, "corporate_accounts"));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => d.data() as CorporateAccount);
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching corporate accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: Partial<CorporateAccount>) => {
    try {
      const id = data.id || `corp_${Date.now()}`;
      const now = Timestamp.now();
      const account: CorporateAccount = {
        id,
        companyName: data.companyName || "",
        billingEmail: data.billingEmail || "",
        promoCode: data.promoCode?.toUpperCase() || "",
        active: data.active ?? true,
        createdAt: data.id ? data.createdAt! : now,
        updatedAt: now,
      };

      await setDoc(doc(db, "corporate_accounts", id), account);
      setIsModalOpen(false);
      fetchAccounts();
    } catch (error) {
      console.error("Error saving corporate account:", error);
      alert("Failed to save corporate account.");
    }
  };

  if (role !== "admin") {
    return <div className="p-8 text-red-500">Access Denied</div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-[#060608] text-white font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest mb-1.5 font-mono shadow-gold-sm">
            Enterprise Accounts
          </div>
          <h1 className="text-3xl font-bold font-serif text-white tracking-tight flex items-center">
            <Building2 className="mr-3 text-accent" size={28} />
            Corporate Accounts
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-0.5 font-medium">Manage enterprise clients, corporate invoicing agreements, and B2B billing promo codes.</p>
        </div>
        <button
          onClick={() => { setEditingAccount(null); setIsModalOpen(true); }}
          className="min-h-[44px] flex items-center px-5 py-2.5 bg-gold-gradient text-neutral-950 rounded-xl font-bold hover:brightness-110 shadow-gold-sm transition-all text-xs uppercase tracking-wider self-start sm:self-auto"
        >
          <Plus size={16} className="mr-1.5" /> New Corporate Account
        </button>
      </div>

      <div className="bg-[#0e0e13] rounded-3xl shadow-2xl border border-neutral-800 overflow-hidden overflow-x-auto no-scrollbar">
        {loading ? (
          <div className="p-12 text-center text-neutral-400 font-mono text-xs">Loading enterprise directory...</div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <Building2 size={48} className="mx-auto mb-4 opacity-30 text-accent" />
            <h3 className="text-lg font-serif font-bold text-white mb-1">No corporate accounts registered</h3>
            <p className="text-xs text-neutral-400">Create a corporate account to issue dedicated authorization codes for B2B direct billing.</p>
          </div>
        ) : (
          <table className="w-full text-left min-w-[650px] text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 bg-[#0a0a0e] text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">
                <th className="p-4">Enterprise Entity</th>
                <th className="p-4">Billing Email</th>
                <th className="p-4">Promo / Billing Code</th>
                <th className="p-4">Account Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id} className="border-b border-neutral-800/60 hover:bg-[#14141c] transition-colors">
                  <td className="p-4 font-bold text-white flex items-center">
                    <div className="w-8 h-8 rounded-xl bg-[#181822] border border-accent/40 text-accent font-bold flex items-center justify-center mr-3 font-serif">
                      {acc.companyName.charAt(0)}
                    </div>
                    {acc.companyName}
                  </td>
                  <td className="p-4 text-neutral-300">{acc.billingEmail}</td>
                  <td className="p-4">
                    <div className="flex items-center text-xs font-mono font-bold bg-[#181822] border border-neutral-700 text-accent px-2.5 py-1 rounded-lg w-max tracking-wider">
                      <Key size={12} className="mr-1.5 text-accent" /> {acc.promoCode}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${acc.active ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'}`}>
                      {acc.active ? 'Active Billing' : 'Suspended'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => { setEditingAccount(acc); setIsModalOpen(true); }}
                      className="p-2 text-accent hover:text-white rounded-lg transition-colors inline-block"
                      title="Edit Account"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <CorporateModal
          account={editingAccount}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
