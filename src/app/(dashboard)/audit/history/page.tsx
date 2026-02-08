"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, FileSearch, ExternalLink } from "lucide-react";

type Audit = {
  id: string;
  url: string;
  score: number;
  grade: string;
  createdAt: string;
};

export default function AuditHistoryPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit/history")
      .then((r) => r.json())
      .then((d) => setAudits(d.audits || []))
      .finally(() => setLoading(false));
  }, []);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "text-emerald-400 bg-emerald-400/20";
      case "B":
        return "text-blue-400 bg-blue-400/20";
      case "C":
        return "text-amber-400 bg-amber-400/20";
      case "D":
        return "text-orange-400 bg-orange-400/20";
      default:
        return "text-red-400 bg-red-400/20";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Audit History
        </h1>
        <p className="mt-1 text-zinc-500">
          Past site audits. Run new audits from the Site Audit page.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : audits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] py-16">
          <FileSearch className="h-12 w-12 text-zinc-600" />
          <p className="mt-4 text-zinc-500">No audits yet</p>
          <p className="mt-1 text-sm text-zinc-600">
            Run your first audit from the Site Audit page
          </p>
          <Link
            href="/audit"
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-muted)]"
          >
            Go to Site Audit
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-zinc-900/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                    URL
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                    Score
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                    Grade
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--border)]/50 hover:bg-white/5"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-zinc-200 truncate max-w-xs block">
                        {a.url}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-300">{a.score}/100</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded px-2 py-1 text-sm font-bold ${getGradeColor(a.grade)}`}
                      >
                        {a.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-sm">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/audit?url=${encodeURIComponent(a.url)}`}
                        className="text-[var(--accent)] hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        Re-audit <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
