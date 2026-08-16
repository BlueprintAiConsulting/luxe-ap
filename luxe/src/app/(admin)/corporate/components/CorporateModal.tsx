"use client";

import { useState } from "react";
import { CorporateAccount } from "@/lib/types";

export default function CorporateModal({
  account,
  onClose,
  onSave
}: {
  account: CorporateAccount | null;
  onClose: () => void;
  onSave: (data: Partial<CorporateAccount>) => void;
}) {
  const [formData, setFormData] = useState<Partial<CorporateAccount>>(
    account || {
      companyName: "",
      billingEmail: "",
      promoCode: "",
      active: true,
    }
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#0e0e13] rounded-3xl border border-neutral-800 shadow-2xl w-full max-w-md overflow-hidden text-white font-sans">
        <div className="p-6 border-b border-neutral-800">
          <div className="text-[10px] font-mono text-accent font-bold uppercase tracking-widest mb-1">B2B Direct Billing</div>
          <h2 className="text-xl font-bold font-serif text-white">
            {account ? "Edit Corporate Account" : "New Corporate Account"}
          </h2>
        </div>

        <div className="p-6 space-y-4 text-xs font-mono">
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Company / Entity Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#181822] border border-neutral-700 rounded-xl text-white outline-none focus:border-accent"
              placeholder="e.g. Acme Capital Partners"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Invoicing Billing Email</label>
            <input
              type="email"
              value={formData.billingEmail}
              onChange={e => setFormData({ ...formData, billingEmail: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#181822] border border-neutral-700 rounded-xl text-white outline-none focus:border-accent"
              placeholder="billing@acmecapital.com"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">Corporate Promo / Auth Code</label>
            <p className="text-[10px] text-neutral-500 mb-2">Employees will enter this at checkout for monthly invoice charging.</p>
            <input
              type="text"
              value={formData.promoCode}
              onChange={e => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2.5 bg-[#181822] border border-neutral-700 rounded-xl text-accent font-bold outline-none focus:border-accent uppercase tracking-wider"
              placeholder="ACME-CORP"
            />
          </div>

          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="activeToggle"
              checked={formData.active}
              onChange={e => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2.5 rounded accent-[#d4af37]"
            />
            <label htmlFor="activeToggle" className="text-xs font-bold text-white">Account Active & Authorized</label>
          </div>
        </div>

        <div className="p-6 bg-[#060608] border-t border-neutral-800 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 text-neutral-300 font-bold border border-neutral-700 hover:bg-neutral-800 rounded-xl transition-colors text-xs"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.companyName || !formData.promoCode}
            className="min-h-[44px] px-6 py-2.5 bg-gold-gradient text-neutral-950 font-bold rounded-xl hover:brightness-110 shadow-gold-sm transition-all disabled:opacity-50 text-xs uppercase tracking-wider"
          >
            Save Account
          </button>
        </div>
      </div>
    </div>
  );
}
