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
        return "text-emerald-600 bg-emerald-100";
      case "B":
        return "text-blue-600 bg-blue-100";
      case "C":
        return "text-amber-600 bg-amber-100";
      case "D":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-red-600 bg-red-100";
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
          Audit History
        </h1>
        <p className="mt-2 text-lg text-zinc-500">
          Past site audits. Run new audits from the Site Audit page.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : audits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] py-16 shadow-[var(--shadow-sm)]">
          <FileSearch className="h-12 w-12 text-zinc-400" />
          <p className="mt-4 font-medium text-zinc-600">No audits yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Run your first audit from the Site Audit page
          </p>
          <Link
            href="/audit"
            className="mt-4 rounded-xl bg-[var(--accent)] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[var(--accent-muted)]"
          >
            Go to Site Audit
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[#1a1236]/90">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    URL
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    Score
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    Grade
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--border)]/50 transition-colors hover:bg-[#1a1236]/55"
                  >
                    <td className="px-6 py-4">
                      <span className="block max-w-xs truncate font-medium text-foreground">
                        {a.url}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600">{a.score}/100</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-lg px-2 py-1 font-heading text-sm font-bold ${getGradeColor(a.grade)}`}
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
