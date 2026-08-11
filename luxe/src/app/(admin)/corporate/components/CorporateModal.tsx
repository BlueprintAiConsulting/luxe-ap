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
    <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-xl font-bold text-brand">
            {account ? "Edit Corporate Account" : "New Corporate Account"}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Company Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Billing Email</label>
            <input
              type="email"
              value={formData.billingEmail}
              onChange={e => setFormData({ ...formData, billingEmail: e.target.value })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="billing@acmecorp.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1">Promo Code</label>
            <p className="text-xs text-neutral-500 mb-2">Employees will enter this at checkout to bill to this account.</p>
            <input
              type="text"
              value={formData.promoCode}
              onChange={e => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 font-mono uppercase"
              placeholder="ACME-VIP"
            />
          </div>

          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="activeToggle"
              checked={formData.active}
              onChange={e => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="activeToggle" className="text-sm font-semibold text-neutral-700">Account Active</label>
          </div>
        </div>

        <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-600 font-semibold hover:bg-neutral-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.companyName || !formData.promoCode}
            className="px-4 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-neutral-900 transition-colors disabled:opacity-50"
          >
            Save Account
          </button>
        </div>
      </div>
    </div>
  );
}
