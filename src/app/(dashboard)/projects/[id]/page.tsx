"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, FileSearch, Loader2 } from "lucide-react";

type Project = {
  id: string;
  name: string;
  domain: string;
  keywords: { keyword: string; volume: number | null; difficulty: number | null }[];
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
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            {project.name}
          </h1>
          <p className="text-zinc-500">{project.domain}</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href={`/keywords?projectId=${project.id}`}
          className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 transition-colors hover:border-zinc-600"
        >
          <div className="rounded-lg bg-orange-500/10 p-3">
            <Search className="h-8 w-8 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100">Keyword Research</h3>
            <p className="text-sm text-zinc-500">
              {project.keywords?.length || 0} keywords saved
            </p>
          </div>
        </Link>
        <Link
          href={`/audit?projectId=${project.id}&url=${encodeURIComponent(`https://${project.domain}`)}`}
          className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 transition-colors hover:border-zinc-600"
        >
          <div className="rounded-lg bg-emerald-500/10 p-3">
            <FileSearch className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100">Site Audit</h3>
            <p className="text-sm text-zinc-500">Audit this site</p>
          </div>
        </Link>
      </div>

      {project.keywords && project.keywords.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <h3 className="border-b border-[var(--border)] px-6 py-4 font-semibold text-zinc-100">
            Saved Keywords
          </h3>
          <div className="divide-y divide-[var(--border)]">
            {project.keywords.map((k, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-6 py-3"
              >
                <span className="font-medium text-zinc-200">{k.keyword}</span>
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
