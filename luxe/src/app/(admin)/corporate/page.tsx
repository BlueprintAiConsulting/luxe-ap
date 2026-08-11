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
    <div className="p-8 max-w-7xl mx-auto min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand flex items-center">
            <Building2 className="mr-3" size={28} />
            Corporate Accounts
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Manage enterprise clients and B2B billing promo codes.</p>
        </div>
        <button
          onClick={() => { setEditingAccount(null); setIsModalOpen(true); }}
          className="flex items-center px-4 py-2 bg-brand text-white rounded-lg hover:bg-neutral-900 transition-colors font-semibold"
        >
          <Plus size={18} className="mr-2" /> New Account
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-500">Loading...</div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <Building2 size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold text-brand mb-2">No corporate accounts</h3>
            <p className="mb-6">Create a corporate account to issue promo codes for B2B billing.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-4">Company</th>
                <th className="p-4">Billing Email</th>
                <th className="p-4">Promo Code</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                  <td className="p-4 font-semibold text-brand flex items-center">
                    <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center mr-3">
                      {acc.companyName.charAt(0)}
                    </div>
                    {acc.companyName}
                  </td>
                  <td className="p-4 text-sm text-neutral-600">{acc.billingEmail}</td>
                  <td className="p-4">
                    <div className="flex items-center text-xs font-mono font-bold bg-neutral-100 text-neutral-700 px-2 py-1 rounded w-max">
                      <Key size={12} className="mr-1" /> {acc.promoCode}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${acc.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {acc.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => { setEditingAccount(acc); setIsModalOpen(true); }}
                      className="p-2 text-neutral-400 hover:text-brand hover:bg-neutral-100 rounded-lg transition-colors inline-block"
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
