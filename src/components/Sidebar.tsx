"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  FileSearch,
  BarChart3,
  LayoutDashboard,
  Settings,
  FolderKanban,
  Clock,
  Sparkles,
  Globe,
  GitCompare,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/domain", label: "Domain Overview", icon: Globe },
  { href: "/domain/gap", label: "Keyword Gap", icon: GitCompare },
  { href: "/keywords", label: "Keyword Research", icon: Search },
  { href: "/audit", label: "Site Audit", icon: FileSearch },
  { href: "/content", label: "AI Content", icon: Sparkles },
  { href: "/audit/history", label: "Audit History", icon: Clock },
  { href: "/positions", label: "Position Tracking", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[var(--border)] bg-[#08041acc] backdrop-blur-xl shadow-[0_24px_48px_rgba(2,6,23,0.55)]">
      <div className="flex h-20 items-center border-b border-[var(--border)] px-5">
        <Link href="/" className="group flex items-center gap-2 transition-opacity hover:opacity-90">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-sm font-bold text-white shadow-[0_8px_20px_rgba(34,211,238,0.42)]">
            A
          </span>
          <span className="font-heading text-2xl font-semibold tracking-tight text-[var(--accent)]">AlChemist</span>
          <span className="font-heading text-base font-medium tracking-tight text-zinc-500">SEO</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-[0.92rem] font-semibold transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-fuchsia-500/18 via-cyan-400/12 to-transparent text-cyan-100 shadow-[var(--shadow-sm)] ring-1 ring-cyan-400/35"
                  : "text-zinc-500 hover:bg-[#150f31] hover:shadow-[var(--shadow-sm)] hover:text-zinc-200"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110", isActive && "text-[var(--accent)]")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border)] p-3.5">
        <div className="flex items-center gap-2">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: { avatarBox: "h-9 w-9 ring-2 ring-[var(--border)]" },
            }}
          />
          <Link
            href="/settings"
            className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2 text-[0.92rem] font-semibold text-zinc-500 transition-all hover:bg-[#150f31] hover:text-zinc-200 hover:shadow-[var(--shadow-sm)]"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </div>
      </div>
    </aside>
  );
}
