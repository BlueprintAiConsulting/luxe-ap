"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  MapPin, 
  Navigation, 
  ShieldCheck, 
  Plane, 
  Clock, 
  DollarSign, 
  CreditCard,
  Building2
} from "lucide-react";
import { Reservation } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { generateExecutiveInvoicePdf } from "@/lib/pdf/generateExecutiveInvoicePdf";

interface ExecutiveInvoiceModalProps {
  trip: Reservation | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExecutiveInvoiceModal({ trip, isOpen, onClose }: ExecutiveInvoiceModalProps) {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !trip) return null;

  const pricing = trip.pricing;
  const confirmationCode = trip.confirmationCode || trip.reservationId.slice(-8).toUpperCase();

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      await generateExecutiveInvoicePdf(trip);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    const text = `LUXE EXECUTIVE ITINERARY & INVOICE
Confirmation: #${confirmationCode}
Passenger: ${trip.riderName}
Service: ${trip.className || "Executive Class"} (${trip.tripType.replace(/_/g, " ").toUpperCase()})
Chauffeur: ${trip.driverName || "Assigned Fleet Chauffeur"} (${trip.vehicleDescription || "Executive Livery"})
Pickup: ${formatDateTime(trip.pickupAt, trip.timezone || "America/Los_Angeles")}
Location: ${trip.pickup.formatted}
Destination: ${trip.dropoff?.formatted || "As-Directed Hourly"}
${trip.flightNumber ? `Flight: ${trip.flightNumber}\n` : ""}Total Invoiced: $${((pricing?.totalCents || 0) / 100).toFixed(2)} USD
Payment Status: ${trip.paymentStatus ? trip.paymentStatus.toUpperCase() : "PAID"}
Tax ID / EIN: 84-1928492
Support: concierge@luxe.com | +1 (800) 555-0199`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy itinerary text:", err);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      
      {/* Modal Container */}
      <div className="bg-[#0e0e13] border border-neutral-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto relative text-white font-sans">
        
        {/* Modal Action Header (Excluded from Print) */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-[#060608] print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#181822] border border-accent/30 flex items-center justify-center text-accent shadow-gold-sm">
              <FileText size={16} />
            </div>
            <div>
              <h2 id="invoice-modal-title" className="text-sm font-bold font-serif text-white">Executive Tax Invoice & Itinerary</h2>
              <div className="text-[10px] font-mono text-neutral-400">Ref #{confirmationCode}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              title="Copy Itinerary Text"
              className="px-3 py-2 rounded-xl bg-[#181822] border border-neutral-700 hover:border-accent text-neutral-300 hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all active:scale-95 min-h-[38px]"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              title="Print Official Document"
              className="px-3 py-2 rounded-xl bg-[#181822] border border-neutral-700 hover:border-accent text-neutral-300 hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all active:scale-95 min-h-[38px]"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-gold-gradient hover:brightness-110 text-neutral-950 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-gold-sm min-h-[38px]"
            >
              <Download size={13} />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#181822] border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-all ml-1 min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div id="printable-invoice" className="p-5 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:text-black">
          
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-neutral-800 print:border-neutral-300">
            <div>
              <div className="text-2xl font-bold font-serif tracking-widest text-white print:text-black">LUXE</div>
              <div className="text-[10px] font-mono text-accent print:text-neutral-700 font-bold uppercase tracking-widest mt-0.5">
                Chauffeured Mobility & Aviation Livery
              </div>
            </div>

            <div className="text-left sm:text-right font-mono">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-[10px] font-bold uppercase tracking-wider print:border-black print:text-black">
                <ShieldCheck size={12} />
                <span>{trip.paymentStatus ? trip.paymentStatus.toUpperCase() : "PAID IN FULL"}</span>
              </div>
              <div className="text-xs font-bold text-white print:text-black mt-1">CONF: #{confirmationCode}</div>
            </div>
          </div>

          {/* Parties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Passenger / Billed To */}
            <div className="p-4 rounded-2xl bg-[#060608] border border-neutral-800/80 print:bg-neutral-50 print:border-neutral-300 space-y-1.5">
              <div className="text-[9px] font-mono uppercase tracking-widest text-accent print:text-neutral-600 font-bold">
                Billed To / Passenger
              </div>
              <div className="font-bold text-base text-white print:text-black">{trip.riderName}</div>
              {trip.riderEmail && <div className="text-xs text-neutral-400 print:text-neutral-700 font-mono">{trip.riderEmail}</div>}
              {trip.riderPhone && <div className="text-xs text-neutral-400 print:text-neutral-700 font-mono">{trip.riderPhone}</div>}
              {trip.corporateAccountId && (
                <div className="text-[11px] text-accent print:text-black font-mono font-bold flex items-center gap-1 pt-1">
                  <Building2 size={12} />
                  <span>Corporate Billing: #{trip.corporateAccountId}</span>
                </div>
              )}
            </div>

            {/* Service & Chauffeur */}
            <div className="p-4 rounded-2xl bg-[#060608] border border-neutral-800/80 print:bg-neutral-50 print:border-neutral-300 space-y-1.5">
              <div className="text-[9px] font-mono uppercase tracking-widest text-accent print:text-neutral-600 font-bold">
                Service & Assignment
              </div>
              <div className="font-bold text-base text-white print:text-black">{trip.className || "Executive Class"}</div>
              <div className="text-xs text-neutral-400 print:text-neutral-700">
                Chauffeur: <span className="font-bold text-white print:text-black">{trip.driverName || "Marcus Bennett"}</span>
              </div>
              <div className="text-xs text-neutral-400 print:text-neutral-700">
                Vehicle: <span className="font-medium text-white print:text-black">{trip.vehicleDescription || "Mercedes-Benz S-Class"}</span>
              </div>
              <div className="text-xs text-neutral-400 print:text-neutral-700">
                Type: <span className="font-medium text-white print:text-black">{trip.tripType.replace(/_/g, " ").toUpperCase()}</span>
              </div>
            </div>

          </div>

          {/* Itinerary Schedule */}
          <div className="p-4 rounded-2xl bg-[#060608] border border-neutral-800/80 print:bg-neutral-50 print:border-neutral-300 space-y-3 font-mono">
            <div className="text-[9px] uppercase tracking-widest text-accent print:text-neutral-600 font-bold flex items-center justify-between">
              <span>Journey Itinerary</span>
              <span>{formatDateTime(trip.pickupAt, trip.timezone || "America/Los_Angeles")}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-neutral-400 print:text-neutral-600">Pickup: </span>
                  <span className="text-white print:text-black font-semibold">{trip.pickup.formatted}</span>
                </div>
              </div>

              {trip.dropoff && (
                <div className="flex items-start gap-2">
                  <Navigation size={14} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-400 print:text-neutral-600">Dropoff: </span>
                    <span className="text-white print:text-black font-semibold">{trip.dropoff.formatted}</span>
                  </div>
                </div>
              )}

              {trip.flightNumber && (
                <div className="flex items-center gap-2 pt-1 text-accent print:text-black font-bold">
                  <Plane size={14} className="shrink-0" />
                  <span>Flight Charter: {trip.flightNumber} {trip.flightStatus?.airline ? `(${trip.flightStatus.airline})` : ""} - Radar Monitored</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="space-y-2 font-mono">
            <div className="text-[9px] uppercase tracking-widest text-neutral-400 print:text-neutral-600 font-bold">
              Itemized Financial Breakdown
            </div>

            <div className="border border-neutral-800 rounded-2xl overflow-hidden print:border-neutral-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181822] text-neutral-400 print:bg-neutral-200 print:text-black uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3">Basis</th>
                    <th className="p-3 text-right">Amount (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 print:divide-neutral-200">
                  {pricing && (
                    <>
                      {pricing.lineItems && Array.isArray(pricing.lineItems) && pricing.lineItems.map((item, i) => (
                        item.amountCents !== 0 && (
                          <tr key={item.code || i} className="hover:bg-white/[0.02]">
                            <td className="p-3 font-semibold">{item.label || item.code}</td>
                            <td className="p-3 text-neutral-400">{item.detail || "Standard Tariff"}</td>
                            <td className={`p-3 text-right font-bold ${item.amountCents < 0 ? "text-emerald-400 print:text-emerald-700" : "text-white print:text-black"}`}>
                              {item.amountCents < 0 ? `-$${Math.abs(item.amountCents / 100).toFixed(2)}` : `$${(item.amountCents / 100).toFixed(2)}`}
                            </td>
                          </tr>
                        )
                      ))}
                      {pricing.gratuityCents > 0 && (
                        <tr className="hover:bg-white/[0.02]">
                          <td className="p-3 font-semibold">Chauffeur Executive Gratuity</td>
                          <td className="p-3 text-neutral-400">{pricing.gratuityPercent || 20}% Standard</td>
                          <td className="p-3 text-right font-bold text-white print:text-black">
                            ${(pricing.gratuityCents / 100).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {pricing.taxCents > 0 && (
                        <tr className="hover:bg-white/[0.02]">
                          <td className="p-3 font-semibold">Regulatory State & Municipal Tax</td>
                          <td className="p-3 text-neutral-400">Sales & Livery Tax</td>
                          <td className="p-3 text-right font-bold text-white print:text-black">
                            ${(pricing.taxCents / 100).toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>

              {/* Total Row Banner */}
              <div className="bg-[#181822] p-4 flex justify-between items-center border-t border-neutral-800 print:bg-neutral-100 print:border-neutral-300">
                <div>
                  <div className="text-[10px] text-neutral-400 print:text-neutral-600 uppercase font-bold">Total Invoiced (USD)</div>
                  <div className="text-[10px] text-emerald-400 print:text-black font-semibold">Payment Status: Authorized / Settled</div>
                </div>
                <div className="text-xl font-bold font-serif text-accent print:text-black">
                  ${((pricing?.totalCents || 0) / 100).toFixed(2)} USD
                </div>
              </div>
            </div>
          </div>

          {/* Legal / Tax Footer */}
          <div className="pt-2 text-[9px] font-mono text-neutral-500 print:text-neutral-600 space-y-1 border-t border-neutral-800 print:border-neutral-300">
            <div className="font-bold text-neutral-400 print:text-neutral-800">
              TAX COMPLIANCE: LUXE Chauffeured Mobility LLC • EIN: 84-1928492 • CA CPUC TCP-0038192-A
            </div>
            <div>
              All journeys covered under $5,000,000 commercial liability policy. Electronic records retained for 7 years. Inquiries: concierge@luxe.com
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
