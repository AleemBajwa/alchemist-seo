"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  FileSearch,
  BarChart3,
  Link2,
  LayoutDashboard,
  Settings,
  FolderKanban,
  Clock,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/keywords", label: "Keyword Research", icon: Search },
  { href: "/audit", label: "Site Audit", icon: FileSearch },
  { href: "/audit/history", label: "Audit History", icon: Clock },
  { href: "/positions", label: "Position Tracking", icon: BarChart3 },
  { href: "/backlinks", label: "Backlinks", icon: Link2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-[var(--accent)]">SEO</span>
          <span className="text-xl font-bold text-zinc-400">Tools</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border)] p-4">
        <div className="flex items-center gap-3">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: { avatarBox: "h-9 w-9" },
            }}
          />
          <Link
            href="/settings"
            className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 hover:bg-white/5 hover:text-zinc-400"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </div>
      </div>
    </aside>
  );
}
