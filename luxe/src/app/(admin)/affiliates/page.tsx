"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db, app } from "@/lib/firebase/client";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Affiliate, AffiliateDocument } from "@/lib/types";
import { 
  Network, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Car, 
  Percent, 
  Clock, 
  CheckCircle2, 
  X, 
  UploadCloud, 
  AlertTriangle 
} from "lucide-react";
import { AdminNav } from "@/app/(admin)/components/AdminNav";

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);

  // Add Partner Form State
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [primaryMarkets, setPrimaryMarkets] = useState("LAX, BUR, SNA, Greater LA");
  const [fleetSize, setFleetSize] = useState(5);
  const [defaultCommission, setDefaultCommission] = useState(85);
  const [tcpPermit, setTcpPermit] = useState("");
  const [submittingPartner, setSubmittingPartner] = useState(false);

  // Add Document State
  const [docType, setDocType] = useState<any>("certificate_of_insurance");
  const [docTitle, setDocTitle] = useState("Commercial Auto Liability ($5M)");
  const [policyNumber, setPolicyNumber] = useState("");
  const [coverageCents, setCoverageCents] = useState(500000000);
  const [docExpiresAt, setDocExpiresAt] = useState(new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const functions = getFunctions(app);
  const createAffiliatePartner = httpsCallable(functions, "createAffiliatePartner");
  const updateAffiliateCompliance = httpsCallable(functions, "updateAffiliateCompliance");

  useEffect(() => {
    const q = query(collection(db, "affiliates"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Affiliate[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data(), affiliateId: doc.id } as Affiliate);
      });
      setAffiliates(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPartner(true);
    try {
      const markets = primaryMarkets.split(",").map(m => m.trim()).filter(Boolean);
      await createAffiliatePartner({
        companyName,
        contactName,
        contactEmail,
        contactPhone,
        primaryMarkets: markets,
        fleetSize: Number(fleetSize),
        defaultCommissionRate: Number(defaultCommission) / 100,
        tcpPermitNumber: tcpPermit || null,
      });
      setIsAddPartnerOpen(false);
      setCompanyName("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
    } catch (err: any) {
      alert("Error creating affiliate: " + err.message);
    } finally {
      setSubmittingPartner(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAffiliate) return;
    setUploadingDoc(true);
    try {
      await updateAffiliateCompliance({
        affiliateId: selectedAffiliate.affiliateId,
        document: {
          documentId: "doc_" + Date.now(),
          type: docType,
          title: docTitle,
          policyNumber: policyNumber || null,
          coverageAmountCents: Number(coverageCents),
          expiresAt: new Date(docExpiresAt).toISOString(),
          isVerified: true,
          notes: "Audited & Verified by Executive Dispatch",
        },
      });
      alert("Compliance document uploaded and compliance status re-verified!");
      setPolicyNumber("");
    } catch (err: any) {
      alert("Error uploading document: " + err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const compliantCount = affiliates.filter(a => a.complianceStatus === "active_compliant").length;
  const totalFleet = affiliates.reduce((acc, a) => acc + (a.fleetSize || 0), 0);

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <AdminNav />
      <div className="flex-1 lg:pl-64 flex flex-col">
        <main className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 text-accent text-sm font-semibold uppercase tracking-wider mb-1">
                <Network size={16} /> B2B Subcontracting & Fleet Network
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Affiliate Operators & Vault</h1>
              <p className="text-sm text-neutral-400 mt-1">
                Manage partner carriers, farm-out commissions, and audited Certificate of Insurance (COI) compliance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddPartnerOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent/90 text-neutral-950 font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 self-start"
            >
              <Plus size={18} /> Register Affiliate Partner
            </button>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Active Partners</div>
              <div className="text-2xl font-bold text-white">{affiliates.length}</div>
              <div className="text-xs text-neutral-500 mt-1">Vetted carrier network</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Network Capacity</div>
              <div className="text-2xl font-bold text-white">+{totalFleet} Vehicles</div>
              <div className="text-xs text-neutral-500 mt-1">Combined affiliate fleet</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">COI Compliance Rate</div>
              <div className="text-2xl font-bold text-emerald-400">
                {affiliates.length > 0 ? Math.round((compliantCount / affiliates.length) * 100) : 100}%
              </div>
              <div className="text-xs text-neutral-500 mt-1">{compliantCount} verified insured</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Avg Platform Margin</div>
              <div className="text-2xl font-bold text-accent">15.0%</div>
              <div className="text-xs text-neutral-500 mt-1">Retained on farm-out</div>
            </div>
          </div>

          {/* Affiliate Partners Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-lg">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="font-bold text-lg text-white">Carrier Registry</h2>
              <span className="text-xs text-neutral-400 font-medium">{affiliates.length} operators active</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-neutral-500">Loading affiliate network...</div>
            ) : affiliates.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                  <Network size={28} />
                </div>
                <div className="text-lg font-bold text-white">No Affiliate Partners Registered</div>
                <p className="text-sm text-neutral-400 max-w-md mx-auto">
                  Expand your dispatch reach by onboarding local and out-of-market livery partners.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddPartnerOpen(true)}
                  className="px-4 py-2 bg-accent text-neutral-950 text-xs font-bold rounded-xl"
                >
                  Add First Partner
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 text-xs font-bold uppercase tracking-wider bg-neutral-950/40">
                      <th className="py-4 px-6">Company & Contact</th>
                      <th className="py-4 px-6">Operating Markets</th>
                      <th className="py-4 px-6">Fleet & Classes</th>
                      <th className="py-4 px-6">Margin / Payout</th>
                      <th className="py-4 px-6">Compliance Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {affiliates.map((aff) => (
                      <tr key={aff.affiliateId} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-white">{aff.companyName}</div>
                          <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                            <span>{aff.contactName}</span> &bull; <span>{aff.contactPhone}</span>
                          </div>
                          {aff.tcpPermitNumber && (
                            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                              TCP: {aff.tcpPermitNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1">
                            {aff.primaryMarkets?.slice(0, 3).map((m, i) => (
                              <span key={i} className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded text-[11px] font-semibold">
                                {m}
                              </span>
                            ))}
                            {(aff.primaryMarkets?.length || 0) > 3 && (
                              <span className="text-[11px] text-neutral-500">+{aff.primaryMarkets.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-white">{aff.fleetSize} Vehicles</div>
                          <div className="text-xs text-neutral-400">{aff.supportedClasses?.join(", ")}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-accent">
                            {Math.round((aff.defaultCommissionRate || 0.85) * 100)}% Payout
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {Math.round((1 - (aff.defaultCommissionRate || 0.85)) * 100)}% Luxe Margin
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            aff.complianceStatus === "active_compliant"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : aff.complianceStatus === "expiring_soon"
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                              : aff.complianceStatus === "non_compliant_expired"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-neutral-800 text-neutral-300 border-neutral-700"
                          }`}>
                            {aff.complianceStatus === "active_compliant" ? (
                              <>
                                <ShieldCheck size={14} /> VERIFIED INSURED
                              </>
                            ) : aff.complianceStatus === "expiring_soon" ? (
                              <>
                                <AlertTriangle size={14} /> EXPIRING SOON
                              </>
                            ) : aff.complianceStatus === "non_compliant_expired" ? (
                              <>
                                <ShieldAlert size={14} /> EXPIRED / LOCKED
                              </>
                            ) : (
                              <>
                                <Clock size={14} /> PENDING AUDIT
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAffiliate(aff);
                              setIsVaultOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all border border-neutral-700 inline-flex items-center gap-1.5"
                          >
                            <FileText size={14} className="text-accent" /> Credential Vault
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Credential Vault Modal */}
      {isVaultOpen && selectedAffiliate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div>
                <div className="text-xs font-bold text-accent uppercase tracking-wider">Compliance & Policy Vault</div>
                <h3 className="text-xl font-bold text-white mt-1">{selectedAffiliate.companyName}</h3>
                <div className="text-xs text-neutral-400">Primary Contact: {selectedAffiliate.contactName} ({selectedAffiliate.contactPhone})</div>
              </div>
              <button
                type="button"
                onClick={() => setIsVaultOpen(false)}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Existing Documents in Vault */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Audited Documents</h4>
              {selectedAffiliate.documents && selectedAffiliate.documents.length > 0 ? (
                <div className="space-y-2">
                  {selectedAffiliate.documents.map((doc, idx) => (
                    <div key={idx} className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-accent">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{doc.title}</div>
                          <div className="text-xs text-neutral-400">
                            {doc.policyNumber && `Policy #: ${doc.policyNumber} | `}
                            {doc.coverageAmountCents && `$${(doc.coverageAmountCents / 100).toLocaleString()} limit | `}
                            Expires: {new Date(doc.expiresAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        AUDITED ✓
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-neutral-950/60 rounded-2xl border border-neutral-800/80 text-center text-xs text-neutral-500">
                  No compliance documents on file yet. Upload certificate below.
                </div>
              )}
            </div>

            {/* Add/Update Document Form */}
            <form onSubmit={handleAddDocument} className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Add / Audit Policy Document</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5">Document Type</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-white text-xs font-semibold"
                  >
                    <option value="certificate_of_insurance">Certificate of Insurance (COI)</option>
                    <option value="operating_authority_tcp_puc">Operating Authority (TCP / PUC)</option>
                    <option value="dot_safety_permit">USDOT Safety Permit</option>
                    <option value="airport_permit">Airport Operating Permit</option>
                    <option value="w9_form">Form W-9 (Tax ID)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5">Title / Description</label>
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={e => setDocTitle(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5">Policy / Permit Number</label>
                  <input
                    type="text"
                    value={policyNumber}
                    placeholder="e.g. POL-883920-LA"
                    onChange={e => setPolicyNumber(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5">Expiration Date</label>
                  <input
                    type="date"
                    required
                    value={docExpiresAt}
                    onChange={e => setDocExpiresAt(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-white text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={uploadingDoc}
                className="w-full py-3 bg-accent text-neutral-950 font-bold text-xs rounded-xl hover:bg-accent/90 transition-all flex items-center justify-center gap-1.5"
              >
                <UploadCloud size={16} /> {uploadingDoc ? "Auditing Document..." : "Save to Credential Vault & Verify"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Register Partner Modal */}
      {isAddPartnerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div>
                <div className="text-xs font-bold text-accent uppercase tracking-wider">New Partnership</div>
                <h3 className="text-xl font-bold text-white mt-1">Register Affiliate Operator</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPartnerOpen(false)}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prestige Chauffeurs LA"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5">Contact Principal</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. David Vance"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. (310) 555-0199"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5">Dispatch Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. dispatch@prestigela.com"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5">Fleet Size</label>
                  <input
                    type="number"
                    min="1"
                    value={fleetSize}
                    onChange={e => setFleetSize(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5">Affiliate Payout (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="95"
                    value={defaultCommission}
                    onChange={e => setDefaultCommission(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5">Primary Markets (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. LAX, BUR, SNA, Beverly Hills"
                  value={primaryMarkets}
                  onChange={e => setPrimaryMarkets(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5">TCP / Operating Permit #</label>
                <input
                  type="text"
                  placeholder="e.g. TCP-38910-A"
                  value={tcpPermit}
                  onChange={e => setTcpPermit(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white text-xs"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddPartnerOpen(false)}
                  className="flex-1 py-3 bg-neutral-800 text-white font-semibold text-xs rounded-xl hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPartner}
                  className="flex-1 py-3 bg-accent text-neutral-950 font-bold text-xs rounded-xl hover:bg-accent/90"
                >
                  {submittingPartner ? "Registering..." : "Complete Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
