"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppNav from "@/components/AppNav";
import type { CallLog, CurrentUser, Lead } from "@/components/types";

const statuses = ["all", "new", "cold", "warm", "meeting_booked", "not_interested", "callback", "no_answer", "do_not_call"];
const outcomes = ["cold", "warm", "meeting_booked", "not_interested", "callback", "no_answer", "do_not_call"];

type SignalWireCall = {
  start?: () => Promise<void>;
  hangup?: () => void;
  on?: (event: string, cb: (value: unknown) => void) => void;
  id?: string;
};

type SignalWireClient = {
  dial: (input: Record<string, unknown>) => Promise<SignalWireCall>;
};

type SignalWireFactory = (input: { token: string }) => Promise<SignalWireClient>;

export default function ColdCallingCrm({ currentUser }: { currentUser: CurrentUser }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [callState, setCallState] = useState("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [callStart, setCallStart] = useState<number | null>(null);
  const [outcome, setOutcome] = useState("cold");
  const [notes, setNotes] = useState("");
  const clientRef = useRef<SignalWireClient | null>(null);
  const callRef = useRef<SignalWireCall | null>(null);

  async function load() {
    const [leadRes, logRes] = await Promise.all([
      fetch(`/api/leads?status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}`).then((r) => r.json()),
      fetch("/api/call-logs").then((r) => r.json()),
    ]);
    setLeads(leadRes.leads || []);
    setLogs(logRes.logs || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!callStart || callState !== "connected") return;
    const timer = setInterval(() => setCallDuration(Math.floor((Date.now() - callStart) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [callStart, callState]);

  const remaining = useMemo(() => leads.filter((l) => !l.calledInSession && l.status !== "do_not_call").length, [leads]);

  async function createLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request("/api/leads", "POST", {
      fullName: form.get("fullName"),
      phone: form.get("phone"),
      email: form.get("email"),
      jobTitle: form.get("jobTitle"),
      company: form.get("company"),
      companyWebsite: form.get("companyWebsite"),
      industry: form.get("industry"),
      region: form.get("region"),
      status: form.get("status"),
      notes: form.get("notes"),
    });
    event.currentTarget.reset();
    await load();
  }

  async function importCsv(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/leads/import", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Import failed");
      return;
    }
    setMessage(`Import complete: ${data.importedRows} imported, ${data.duplicateRows} duplicates, ${data.invalidRows} invalid, ${data.missingRows} missing required fields.`);
    await load();
  }

  async function startCall(lead: Lead) {
    setSelected(lead);
    setError("");
    if (lead.status === "do_not_call") {
      setError("This lead is marked Do Not Call");
      return;
    }
    try {
      setCallState("initializing");
      const tokenRes = await fetch("/api/signalwire/token", { method: "POST" });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error || "Could not get SignalWire token");
      const swModule = await import("@signalwire/js") as unknown as {
        SignalWire?: SignalWireFactory;
        default?: SignalWireFactory | { SignalWire?: SignalWireFactory };
      };
      const factory: SignalWireFactory | undefined =
        (typeof swModule.SignalWire === "function" && swModule.SignalWire) ||
        (typeof swModule.default === "function" && swModule.default) ||
        (typeof swModule.default === "object" ? swModule.default?.SignalWire : undefined);
      if (!factory) throw new Error("SignalWire SDK factory not found");
      clientRef.current ||= await factory({ token: tokenData.token });
      const params = new URLSearchParams({
        lead_phone: lead.phone,
        lead_name: lead.fullName,
        lead_company: lead.company || "",
        lead_id: lead.id,
        user_id: currentUser.id,
      });
      const dialAddress = tokenData.dialAddress || `/api/signalwire/dial`;
      const call = await clientRef.current.dial({
        to: `${dialAddress}?${params.toString()}`,
        audio: true,
        video: false,
        userVariables: {
          lead_phone: lead.phone,
          lead_name: lead.fullName,
          lead_company: lead.company || "",
          lead_id: lead.id,
          user_id: currentUser.id,
          caller_id: currentUser.id,
        },
      });
      callRef.current = call;
      call.on?.("state", (state: unknown) => {
        const value = state as { name?: string } | string;
        const s = String(typeof value === "string" ? value : value?.name || "").toLowerCase();
        if (s === "answered" || s === "active") {
          setCallState("connected");
          setCallStart(Date.now());
        } else if (["ended", "destroy", "hangup"].includes(s)) {
          setCallState("ended");
        } else if (s === "failed") {
          setCallState("failed");
        } else {
          setCallState("ringing");
        }
      });
      await call.start?.();
      setCallState("ringing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Call failed");
      setCallState("failed");
    }
  }

  function hangup() {
    callRef.current?.hangup?.();
    callRef.current = null;
    setCallState("ended");
  }

  async function saveOutcome() {
    if (!selected) return;
    await request("/api/calls/outcome", "POST", {
      leadId: selected.id,
      outcome,
      notes,
      durationSeconds: callDuration,
      followUp: false,
    });
    setNotes("");
    setCallDuration(0);
    setCallStart(null);
    setCallState("idle");
    await load();
  }

  async function request(url: string, method: string, body: unknown) {
    setError("");
    setMessage("");
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Request failed");
      return null;
    }
    setMessage("Saved");
    return data;
  }

  return (
    <>
      <AppNav currentUser={currentUser} />
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h1 className="text-xl font-semibold">Lead Queue</h1>
            <p className="text-sm text-slate-600">{remaining} remaining this session</p>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, company, phone" className="mt-3 w-full rounded border px-3 py-2 text-sm" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full rounded border px-3 py-2 text-sm">
              {statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </section>
          <section className="max-h-[65vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {leads.length === 0 ? <p className="p-4 text-sm text-slate-600">No leads found</p> : leads.map((lead) => (
              <button key={lead.id} onClick={() => setSelected(lead)} className={`block w-full border-b border-slate-100 p-3 text-left hover:bg-slate-50 ${selected?.id === lead.id ? "bg-blue-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-950">{lead.fullName}</p>
                    <p className="text-xs text-slate-600">{[lead.jobTitle, lead.company].filter(Boolean).join(" at ")}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{lead.phone}</p>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs">{label(lead.status)}</span>
                </div>
              </button>
            ))}
          </section>
        </aside>

        <div className="space-y-4">
          {(message || error) && <p className={`rounded px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Dialer</h2>
                <p className="text-sm text-slate-600">{selected ? `${selected.fullName} - ${selected.phone}` : "Select a lead to call"}</p>
              </div>
              <div className="flex gap-2">
                <button disabled={!selected || ["initializing", "ringing", "connected"].includes(callState)} onClick={() => selected && startCall(selected)} className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">Call</button>
                <button disabled={!["initializing", "ringing", "connected"].includes(callState)} onClick={hangup} className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50">Hang up</button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded border border-slate-200 p-3"><p className="text-xs text-slate-500">State</p><p className="font-medium">{callState}</p></div>
              <div className="rounded border border-slate-200 p-3"><p className="text-xs text-slate-500">Duration</p><p className="font-mono font-medium">{Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, "0")}</p></div>
              <div className="rounded border border-slate-200 p-3"><p className="text-xs text-slate-500">Selected Status</p><p className="font-medium">{selected ? label(selected.status) : "-"}</p></div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
              <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="rounded border px-3 py-2">
                {outcomes.map((o) => <option key={o} value={o}>{label(o)}</option>)}
              </select>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call notes" className="min-h-20 rounded border px-3 py-2" />
              <button disabled={!selected} onClick={saveOutcome} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">Save outcome</button>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={createLead} className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="font-semibold">Add Lead</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input name="fullName" required placeholder="Full name" className="rounded border px-3 py-2" />
                <input name="phone" required placeholder="+923001234567" className="rounded border px-3 py-2" />
                <input name="email" type="email" placeholder="Email" className="rounded border px-3 py-2" />
                <input name="jobTitle" placeholder="Job title" className="rounded border px-3 py-2" />
                <input name="company" placeholder="Company" className="rounded border px-3 py-2" />
                <input name="companyWebsite" placeholder="Website" className="rounded border px-3 py-2" />
                <input name="industry" placeholder="Industry" className="rounded border px-3 py-2" />
                <input name="region" placeholder="Region" className="rounded border px-3 py-2" />
                <select name="status" className="rounded border px-3 py-2"><option value="new">New</option><option value="cold">Cold</option><option value="warm">Warm</option><option value="callback">Callback</option></select>
                <textarea name="notes" placeholder="Notes" className="rounded border px-3 py-2 sm:col-span-2" />
              </div>
              <button className="mt-3 rounded bg-slate-900 px-4 py-2 text-white">Add lead</button>
            </form>

            <div className="space-y-4">
              <form onSubmit={importCsv} className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">Import Leads</h2>
                <p className="mt-1 text-sm text-slate-600">CSV headers can match Base44 fields: full_name, phone, email, job_title, company_name, company_website, industry, region, notes.</p>
                <input name="file" type="file" accept=".csv" required className="mt-3 block w-full rounded border px-3 py-2" />
                <button className="mt-3 rounded bg-blue-600 px-4 py-2 text-white">Import CSV</button>
              </form>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">Export</h2>
                <p className="mt-1 text-sm text-slate-600">Exports only your own leads with the active filter.</p>
                <a href={`/api/leads/export?status=${status}`} className="mt-3 inline-block rounded border border-slate-300 px-4 py-2">Download CSV</a>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Call History</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left"><th className="py-2">Date</th><th>Lead</th><th>Outcome</th><th>Duration</th><th>Called From</th></tr></thead>
                <tbody>{logs.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="py-2">{new Date(log.dateTime).toLocaleString()}</td>
                    <td>{log.leadName || "Unknown"}{log.leadCompany ? ` - ${log.leadCompany}` : ""}</td>
                    <td>{log.outcome ? label(log.outcome) : "-"}</td>
                    <td>{log.durationSeconds}s</td>
                    <td className="font-mono">{log.calledFromNumber || "-"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
