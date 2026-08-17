import { describe, it, expect } from "vitest";

interface CallLog {
  id: string;
  callerName: string;
  callerPhone: string;
  intent: "driver_eta" | "charter_quote" | "flight_reschedule" | "owner_escalation";
  resolutionStatus: "resolved_ai" | "transferred_owner" | "quote_sent";
}

const SAMPLE_CALLS: CallLog[] = [
  { id: "1", callerName: "Alexander Vance", callerPhone: "+13105550199", intent: "driver_eta", resolutionStatus: "resolved_ai" },
  { id: "2", callerName: "Sarah Jenkins", callerPhone: "+12125559012", intent: "charter_quote", resolutionStatus: "quote_sent" },
  { id: "3", callerName: "David Sterling", callerPhone: "+14155553481", intent: "flight_reschedule", resolutionStatus: "resolved_ai" },
  { id: "4", callerName: "Elena Rostova", callerPhone: "+13055558820", intent: "owner_escalation", resolutionStatus: "transferred_owner" }
];

export function filterCallLogs(calls: CallLog[], query: string, intentFilter: string) {
  return calls.filter((c) => {
    const matchesSearch = c.callerName.toLowerCase().includes(query.toLowerCase()) || c.callerPhone.includes(query);
    const matchesFilter = intentFilter === "all" || c.intent === intentFilter;
    return matchesSearch && matchesFilter;
  });
}

describe("AI Call Center Telemetry — Smoke Tests", () => {
  it("Smoke Test 1: Filters call logs by intent accurately", () => {
    const quoteCalls = filterCallLogs(SAMPLE_CALLS, "", "charter_quote");
    expect(quoteCalls.length).toBe(1);
    expect(quoteCalls[0].callerName).toBe("Sarah Jenkins");

    const driverEtaCalls = filterCallLogs(SAMPLE_CALLS, "", "driver_eta");
    expect(driverEtaCalls.length).toBe(1);
    expect(driverEtaCalls[0].callerName).toBe("Alexander Vance");
  });

  it("Smoke Test 2: Filters call logs by search query on caller name and phone", () => {
    const nameMatch = filterCallLogs(SAMPLE_CALLS, "Sterling", "all");
    expect(nameMatch.length).toBe(1);
    expect(nameMatch[0].id).toBe("3");

    const phoneMatch = filterCallLogs(SAMPLE_CALLS, "3055558820", "all");
    expect(phoneMatch.length).toBe(1);
    expect(phoneMatch[0].callerName).toBe("Elena Rostova");
  });

  it("Smoke Test 3: Computes AI autonomous resolution rate correctly", () => {
    const resolvedAi = SAMPLE_CALLS.filter(c => c.resolutionStatus === "resolved_ai" || c.resolutionStatus === "quote_sent").length;
    const rate = (resolvedAi / SAMPLE_CALLS.length) * 100;
    expect(rate).toBe(75); // 3 of 4 handled autonomously without owner intervention
  });
});
