"use client";

import { Search, FileSearch, BarChart3, FolderKanban, Clock, Sparkles, Globe, GitCompare } from "lucide-react";
import Link from "next/link";

const stats = [
  {
    label: "Projects",
    description: "Organize sites & keywords",
    icon: FolderKanban,
    href: "/projects",
    iconClasses: "bg-[var(--accent)]/15 text-[var(--accent-muted)]",
  },
  {
    label: "Domain Overview",
    description: "Analyze domain rank, ETV, keywords & backlinks",
    icon: Globe,
    href: "/domain",
    iconClasses: "bg-emerald-500/15 text-emerald-300",
  },
  {
    label: "Keyword Gap",
    description: "Compare domains for overlapping & unique keywords",
    icon: GitCompare,
    href: "/domain/gap",
    iconClasses: "bg-teal-500/15 text-teal-300",
  },
  {
    label: "Keyword Research",
    description: "Discover keywords & search volume",
    icon: Search,
    href: "/keywords",
    iconClasses: "bg-fuchsia-500/15 text-fuchsia-300",
  },
  {
    label: "Site Audit",
    description: "Crawl & fix SEO issues",
    icon: FileSearch,
    href: "/audit",
    iconClasses: "bg-cyan-500/15 text-cyan-300",
  },
  {
    label: "AI Content",
    description: "Generate SEO-ready long-form content & briefs",
    icon: Sparkles,
    href: "/content",
    iconClasses: "bg-fuchsia-500/15 text-fuchsia-300",
  },
  {
    label: "Position Tracking",
    description: "Check Google rankings",
    icon: BarChart3,
    href: "/positions",
    iconClasses: "bg-indigo-500/15 text-indigo-300",
  },
  {
    label: "Audit History",
    description: "View past audits",
    icon: Clock,
    href: "/audit/history",
    iconClasses: "bg-violet-500/15 text-violet-300",
  },
];

export function DashboardStats() {
  return (
    <div>
      <h2 className="mb-3 font-heading text-xl font-semibold text-foreground">Tools</h2>
      <div className="compact-grid sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[var(--shadow-lg)]"
            >
              <div className={`mb-3 inline-flex rounded-xl p-2.5 transition-transform duration-200 group-hover:scale-110 ${stat.iconClasses}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">{stat.label}</h3>
              <p className="mt-1 text-sm text-zinc-500">{stat.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
