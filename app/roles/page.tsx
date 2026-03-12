"use client";

import { useState } from "react";

type Role = {
  id: number;
  title: string;
  department: string;
  level: string;
  notes: string;
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 1,
      title: "Senior AE",
      department: "Sales",
      level: "Senior",
      notes: "Enterprise-focused quota-carrying AE.",
    },
  ]);

  const [form, setForm] = useState({
    title: "",
    department: "",
    level: "",
    notes: "",
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title) return;

    const nextId = roles.length ? Math.max(...roles.map((r) => r.id)) + 1 : 1;

    setRoles((prev) => [
      ...prev,
      {
        id: nextId,
        title: form.title,
        department: form.department,
        level: form.level,
        notes: form.notes,
      },
    ]);

    setForm({
      title: "",
      department: "",
      level: "",
      notes: "",
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8 lg:px-10 lg:py-10">
        <header className="border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Job Roles
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Create and manage the roles you are actively hiring for.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Form */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-6 shadow-md shadow-slate-950/70">
            <h2 className="text-sm font-semibold text-slate-50">
              Add New Role
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Capture key details for a new opening, like &quot;Senior AE&quot;
              or &quot;RevOps Analyst&quot;.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="title"
                  className="text-xs font-medium text-slate-300"
                >
                  Role Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Senior AE"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/60 outline-none ring-1 ring-transparent transition focus:border-blue-500/60 focus:ring-blue-500/40"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="department"
                    className="text-xs font-medium text-slate-300"
                  >
                    Department
                  </label>
                  <input
                    id="department"
                    type="text"
                    value={form.department}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                    placeholder="Sales"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/60 outline-none ring-1 ring-transparent transition focus:border-blue-500/60 focus:ring-blue-500/40"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="level"
                    className="text-xs font-medium text-slate-300"
                  >
                    Seniority / Level
                  </label>
                  <input
                    id="level"
                    type="text"
                    value={form.level}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, level: e.target.value }))
                    }
                    placeholder="Senior"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/60 outline-none ring-1 ring-transparent transition focus:border-blue-500/60 focus:ring-blue-500/40"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="notes"
                  className="text-xs font-medium text-slate-300"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Territory, quota, product focus, etc."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/60 outline-none ring-1 ring-transparent transition focus:border-blue-500/60 focus:ring-blue-500/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!form.title}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-900/60 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900/50"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>

          {/* Existing Roles Summary */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-50">
              Active Roles
            </h2>
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              {roles.length === 0 && (
                <p className="text-sm text-slate-500">
                  No roles yet. Add your first opening on the left.
                </p>
              )}
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-lg border border-slate-800/70 bg-slate-900/60 px-3 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {role.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {role.department || "No department"} ·{" "}
                        {role.level || "Level not set"}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-inset ring-blue-500/40">
                      Open
                    </span>
                  </div>
                  {role.notes && (
                    <p className="mt-2 text-xs text-slate-400">{role.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

