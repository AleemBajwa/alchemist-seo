import { auth, currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { DashboardStats } from "@/components/DashboardStats";
import { DashboardCharts } from "@/components/DashboardCharts";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      projects: true,
      auditRuns: true,
    },
  });

  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${userId}@clerk.user`;
    const name = clerkUser?.firstName
      ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ")
      : null;
    user = await prisma.user.create({
      data: { clerkId: userId, email, name },
      include: { projects: true, auditRuns: true },
    });
  }

  const projectsCount = user.projects.length;
  const auditsCount = user.auditRuns.length;
  const hasApiKeys = !!(
    process.env.DATA_FOR_SEO_API_KEY?.trim() ||
    process.env.DATAFORSEO_API_KEY?.trim() ||
    (process.env.DATA_FOR_SEO_LOGIN?.trim() &&
      process.env.DATA_FOR_SEO_PASSWORD?.trim())
  );

  return (
    <div className="space-y-6">
      <div className="hero-shell p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <span className="hero-kicker">Dashboard</span>
        <h1 className="hero-title mt-4 max-w-4xl">
          SEO tools in one place.
        </h1>
        <p className="mt-3 max-w-3xl text-[1.02rem] text-zinc-600">
          Research keywords, run audits, track positions, and manage projects—powered by live data.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <span className="soft-badge">DataForSEO</span>
          <span className="soft-badge">Projects · Audits · Rankings</span>
        </div>
      </div>

      <div className="compact-grid sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Projects"
          value={projectsCount}
          href="/projects"
          description="Sites you're tracking"
        />
        <StatCard
          label="Audits"
          value={auditsCount}
          href="/audit/history"
          description="Completed site audits"
        />
        <StatCard
          label="API Status"
          value={hasApiKeys ? "Connected" : "Not configured"}
          href="/settings"
          description={hasApiKeys ? "Managed by owner" : "Owner setup required"}
          highlight={!hasApiKeys}
        />
      </div>

      <DashboardStats />

      <DashboardCharts />

      {!hasApiKeys && (
        <div className="panel border-fuchsia-400/40 bg-fuchsia-500/10 p-5">
          <h2 className="font-heading text-lg font-semibold text-fuchsia-200">Setup required</h2>
          <p className="mt-2 text-sm text-zinc-500">
            DataForSEO is configured by the account owner in{" "}
            <Link href="/settings" className="font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-muted)] hover:underline">
              Settings
            </Link>{" "}
            and server environment variables.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  description,
  highlight,
}: {
  label: string;
  value: string | number;
  href: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-2xl border p-4 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] ${
        highlight
          ? "border-fuchsia-400/40 bg-fuchsia-500/10 hover:border-fuchsia-300/70"
          : "border-[var(--border)] bg-[var(--card)] hover:border-cyan-400/45"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`mt-1.5 font-heading text-[1.65rem] font-semibold ${highlight ? "text-fuchsia-200" : "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </Link>
  );
}
