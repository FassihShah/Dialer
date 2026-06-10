"use client";

import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";
import type { CurrentUser } from "@/components/types";

type AdminUser = { id: string; name: string; email: string; role: "ADMIN" | "USER"; disabled: boolean };
type PhoneNumber = {
  id: string;
  phoneNumber: string;
  label?: string | null;
  status: string;
  assignments: { id: string; user: { id: string; name: string; email: string } }[];
};

export default function AdminConsole({ currentUser }: { currentUser: CurrentUser }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [settings, setSettings] = useState<unknown[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [u, n, s] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/phone-numbers").then((r) => r.json()),
      fetch("/api/admin/signalwire").then((r) => r.json()),
    ]);
    setUsers(u.users || []);
    setNumbers(n.phoneNumbers || []);
    setSettings(s.settings || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request("/api/admin/users", "POST", {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      role: form.get("role"),
      disabled: false,
    });
    event.currentTarget.reset();
    await load();
  }

  async function saveSignalWire(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request("/api/admin/signalwire", "POST", {
      projectId: form.get("projectId"),
      apiToken: form.get("apiToken"),
      spaceUrl: form.get("spaceUrl"),
      sharedSubscriberReference: form.get("sharedSubscriberReference"),
      sharedSubscriberPassword: form.get("sharedSubscriberPassword"),
      signalwireNumber: form.get("signalwireNumber"),
      dialAddress: form.get("dialAddress"),
      active: true,
    });
    event.currentTarget.reset();
    await load();
  }

  async function addNumber(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request("/api/admin/phone-numbers", "POST", {
      phoneNumber: form.get("phoneNumber"),
      label: form.get("label"),
      status: "active",
    });
    event.currentTarget.reset();
    await load();
  }

  async function assign(phoneNumberId: string, userId: string) {
    if (!userId) return;
    await request("/api/admin/phone-numbers/assign", "POST", { phoneNumberId, userId });
    await load();
  }

  async function unassign(assignmentId: string) {
    await fetch("/api/admin/phone-numbers/assign", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId }),
    });
    await load();
  }

  async function syncNumbers() {
    const res = await fetch("/api/admin/phone-numbers", { method: "PUT" });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Could not fetch SignalWire numbers");
    else setMessage(`Fetched ${data.numbers?.length || 0} SignalWire numbers. Add selected numbers manually from the list shown in response logs/API.`);
  }

  async function request(url: string, method: string, body: unknown) {
    setError("");
    setMessage("");
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Request failed");
      return;
    }
    setMessage("Saved");
  }

  return (
    <>
      <AppNav currentUser={currentUser} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Admin Dashboard</h1>
          <p className="text-sm text-slate-600">Manage users, SignalWire setup, phone numbers, and assignments.</p>
        </div>
        {(message || error) && <p className={`rounded px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}

        <section className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={createUser} className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Create User</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input name="name" required placeholder="Name" className="rounded border px-3 py-2" />
              <input name="email" type="email" required placeholder="Email" className="rounded border px-3 py-2" />
              <input name="password" type="password" required minLength={8} placeholder="Password" className="rounded border px-3 py-2" />
              <select name="role" className="rounded border px-3 py-2"><option value="USER">User</option><option value="ADMIN">Admin</option></select>
            </div>
            <button className="mt-3 rounded bg-blue-600 px-4 py-2 text-white">Create</button>
          </form>

          <form onSubmit={saveSignalWire} className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">SignalWire Settings</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input name="spaceUrl" required placeholder="space.signalwire.com" className="rounded border px-3 py-2" />
              <input name="projectId" required placeholder="Project ID" className="rounded border px-3 py-2" />
              <input name="apiToken" required type="password" placeholder="API Token" className="rounded border px-3 py-2" />
              <input name="signalwireNumber" placeholder="Default caller ID" className="rounded border px-3 py-2" />
              <input name="dialAddress" placeholder="/public/dialout or /api/signalwire/dial" className="rounded border px-3 py-2" />
              <input name="sharedSubscriberReference" placeholder="Subscriber reference" className="rounded border px-3 py-2" />
              <input name="sharedSubscriberPassword" type="password" placeholder="Subscriber password" className="rounded border px-3 py-2" />
            </div>
            <button className="mt-3 rounded bg-blue-600 px-4 py-2 text-white">Save settings</button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Phone Numbers</h2>
            <button onClick={syncNumbers} className="rounded border border-slate-300 px-3 py-2 text-sm">Fetch from SignalWire</button>
          </div>
          <form onSubmit={addNumber} className="mt-3 flex flex-wrap gap-2">
            <input name="phoneNumber" required placeholder="+12345678901" className="rounded border px-3 py-2" />
            <input name="label" placeholder="Label" className="rounded border px-3 py-2" />
            <button className="rounded bg-slate-900 px-4 py-2 text-white">Add number</button>
          </form>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="py-2">Number</th><th>Assigned</th><th>Assign to</th><th></th></tr></thead>
              <tbody>{numbers.map((n) => {
                const assignment = n.assignments?.[0];
                return (
                  <tr key={n.id} className="border-b">
                    <td className="py-2 font-mono">{n.phoneNumber}</td>
                    <td>{assignment ? `${assignment.user.name} (${assignment.user.email})` : "Unassigned"}</td>
                    <td>
                      <select disabled={!!assignment} onChange={(e) => assign(n.id, e.target.value)} className="rounded border px-2 py-1">
                        <option value="">Select user</option>
                        {users.filter((u) => !u.disabled).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </td>
                    <td>{assignment && <button onClick={() => unassign(assignment.id)} className="text-red-600">Unassign</button>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Users</h2>
          <div className="mt-3 grid gap-2">
            {users.map((u) => <div key={u.id} className="flex justify-between rounded border border-slate-100 px-3 py-2 text-sm"><span>{u.name} - {u.email}</span><span>{u.role}{u.disabled ? " - disabled" : ""}</span></div>)}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Configuration History</h2>
          <p className="mt-2 text-sm text-slate-600">{settings.length} SignalWire configuration record(s). Secrets are encrypted and never returned to the browser.</p>
        </section>
      </main>
    </>
  );
}
