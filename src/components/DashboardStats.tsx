"use client";

import { Search, FileSearch, BarChart3, FolderKanban, Link2, Clock } from "lucide-react";
import Link from "next/link";

const stats = [
  {
    label: "Projects",
    description: "Organize sites & keywords",
    icon: FolderKanban,
    href: "/projects",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    label: "Keyword Research",
    description: "Discover keywords & search volume",
    icon: Search,
    href: "/keywords",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    label: "Site Audit",
    description: "Crawl & fix SEO issues",
    icon: FileSearch,
    href: "/audit",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    label: "Position Tracking",
    description: "Check Google rankings",
    icon: BarChart3,
    href: "/positions",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    label: "Backlinks",
    description: "Analyze link profile",
    icon: Link2,
    href: "/backlinks",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    label: "Audit History",
    description: "View past audits",
    icon: Clock,
    href: "/audit/history",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

export function DashboardStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const content = (
          <div
            className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 transition-all hover:border-zinc-600"
          >
            <div className={`mb-4 inline-flex rounded-lg p-2.5 ${stat.bg} ${stat.color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-zinc-100">{stat.label}</h3>
            <p className="mt-1 text-sm text-zinc-500">{stat.description}</p>
          </div>
        );
        return (
          <Link key={stat.label} href={stat.href}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
