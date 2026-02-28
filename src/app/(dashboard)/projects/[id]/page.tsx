"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, FileSearch, Loader2, BarChart3 } from "lucide-react";

type Project = {
  id: string;
  name: string;
  domain: string;
  keywords: {
    keyword: string;
    volume: number | null;
    difficulty: number | null;
    folder?: { id: string; name: string } | null;
  }[];
  keywordFolders?: { id: string; name: string; _count: { keywords: number } }[];
  trackedKeywords?: {
    id: string;
    keyword: string;
    domain: string | null;
    position: number | null;
    lastChecked: string | null;
    positionHistory: { position: number | null; checkedAt: string }[];
  }[];
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${params.id}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500">Project not found</p>
        <Link href="/projects" className="mt-4 inline-block text-[var(--accent)]">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
            {project.name}
          </h1>
          <p className="text-zinc-500">{project.domain}</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href={`/keywords?projectId=${project.id}`}
          className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-zinc-300 hover:shadow-[var(--shadow)]"
        >
          <div className="rounded-xl bg-orange-100 p-3">
            <Search className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">Keyword Research</h3>
            <p className="text-sm text-zinc-500">
              {project.keywords?.length || 0} keywords saved
            </p>
          </div>
        </Link>
        <Link
          href={`/audit?projectId=${project.id}&url=${encodeURIComponent(`https://${project.domain}`)}`}
          className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-zinc-300 hover:shadow-[var(--shadow)]"
        >
          <div className="rounded-xl bg-emerald-100 p-3">
            <FileSearch className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">Site Audit</h3>
            <p className="text-sm text-zinc-500">Audit this site</p>
          </div>
        </Link>
        <Link
          href={`/positions?projectId=${project.id}`}
          className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-zinc-300 hover:shadow-[var(--shadow)]"
        >
          <div className="rounded-xl bg-blue-100 p-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">Position Tracking</h3>
            <p className="text-sm text-zinc-500">
              {project.trackedKeywords?.length || 0} keywords tracked
            </p>
          </div>
        </Link>
      </div>

      {project.trackedKeywords && project.trackedKeywords.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
          <h3 className="border-b border-[var(--border)] px-6 py-4 font-heading text-lg font-semibold text-foreground">
            Tracked Keywords
          </h3>
          <div className="divide-y divide-[var(--border)]">
            {project.trackedKeywords.map((tk) => (
              <div key={tk.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{tk.keyword}</span>
                  <span className="text-[var(--accent)] font-bold">
                    #{tk.position ?? "—"}
                  </span>
                </div>
                {tk.positionHistory.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    History: {tk.positionHistory.map((h) => `#${h.position ?? "—"}`).join(" → ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {project.keywords && project.keywords.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
          <h3 className="border-b border-[var(--border)] px-6 py-4 font-heading text-lg font-semibold text-foreground">
            Saved Keywords
          </h3>
          {project.keywordFolders && project.keywordFolders.length > 0 && (
            <div className="border-b border-[var(--border)] px-6 py-3">
              <div className="flex flex-wrap gap-2">
                {project.keywordFolders.map((folder) => (
                  <span
                    key={folder.id}
                    className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100"
                  >
                    {folder.name} ({folder._count.keywords})
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="divide-y divide-[var(--border)]">
            {project.keywords.map((k, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-6 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{k.keyword}</span>
                  {k.folder?.name && (
                    <span className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-2 py-0.5 text-[11px] text-fuchsia-200">
                      {k.folder.name}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-zinc-500">
                  {k.volume != null && <span>Vol: {k.volume.toLocaleString()}</span>}
                  {k.difficulty != null && <span>Diff: {k.difficulty}%</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
