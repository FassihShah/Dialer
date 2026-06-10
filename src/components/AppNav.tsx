"use client";

import type { CurrentUser } from "@/components/types";

export default function AppNav({ currentUser }: { currentUser: CurrentUser }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <a href="/crm" className="font-semibold text-slate-950">Cold Calling CRM</a>
          <nav className="flex items-center gap-3 text-sm">
            <a className="text-slate-600 hover:text-slate-950" href="/crm">CRM</a>
            {currentUser.role === "ADMIN" && <a className="text-slate-600 hover:text-slate-950" href="/admin">Admin</a>}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">{currentUser.name}</span>
          <span className="rounded border border-slate-200 px-2 py-1 text-xs">{currentUser.role}</span>
          <button onClick={logout} className="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">Logout</button>
        </div>
      </div>
    </header>
  );
}
