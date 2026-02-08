import { auth, currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { DashboardStats } from "@/components/DashboardStats";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      projects: true,
      auditRuns: true,
      apiKeys: true,
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
      include: { projects: true, auditRuns: true, apiKeys: true },
    });
  }

  const projectsCount = user.projects.length;
  const auditsCount = user.auditRuns.length;
  const hasApiKeys = !!(user.apiKeys.find((k) => k.provider === "dataforseo")?.login);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Dashboard
        </h1>
        <p className="mt-1 text-zinc-500">
          Your SEO command center. All tools require DataForSEO credentials.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          description={hasApiKeys ? "DataForSEO ready" : "Add credentials"}
          highlight={!hasApiKeys}
        />
      </div>

      <DashboardStats />

      {!hasApiKeys && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h2 className="font-semibold text-amber-400">Setup required</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Add your DataForSEO login and password in{" "}
            <Link href="/settings" className="font-medium text-[var(--accent)] hover:underline">
              Settings
            </Link>{" "}
            to use keyword research, position tracking, and backlinks.
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
      className={`rounded-xl border p-6 transition-colors hover:border-zinc-600 ${
        highlight ? "border-amber-500/30 bg-amber-500/5" : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-amber-400" : "text-zinc-100"}`}>
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>
    </Link>
  );
}
