"use client";

import { useState, useEffect } from "react";
import { Plus, FolderKanban, Loader2 } from "lucide-react";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !domain.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), domain: domain.trim() }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects((p) => [data.project, ...p]);
        setName("");
        setDomain("");
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            Projects
          </h1>
          <p className="mt-1 text-zinc-500">
            Organize your sites and track keywords per project.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 font-medium text-white hover:bg-[var(--accent-muted)]"
        >
          <Plus className="h-5 w-5" />
          Add Project
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
        >
          <h3 className="font-semibold text-zinc-100">New Project</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-zinc-500">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Website"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-4 py-2 text-zinc-100 placeholder:text-zinc-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-500">Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-4 py-2 text-zinc-100 placeholder:text-zinc-600"
                required
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-muted)] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-zinc-400 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] py-16">
          <FolderKanban className="h-12 w-12 text-zinc-600" />
          <p className="mt-4 text-zinc-500">No projects yet</p>
          <p className="mt-1 text-sm text-zinc-600">
            Add a project to organize keywords and audits
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-white hover:bg-[var(--accent-muted)]"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 transition-colors hover:border-zinc-600"
            >
              <FolderKanban className="h-10 w-10 text-[var(--accent)]" />
              <h3 className="mt-3 font-semibold text-zinc-100">{p.name}</h3>
              <p className="mt-1 text-sm text-zinc-500">{p.domain}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
