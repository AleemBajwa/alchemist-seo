import Link from "next/link";
import { Check, X, ExternalLink } from "lucide-react";

async function checkEnv() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim())
    missing.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  if (!process.env.CLERK_SECRET_KEY?.trim()) missing.push("CLERK_SECRET_KEY");
  const hasDataForSEO =
    !!process.env.DATA_FOR_SEO_LOGIN?.trim() &&
    !!process.env.DATA_FOR_SEO_PASSWORD?.trim();
  return { missing, hasDataForSEO };
}

export default async function SetupPage() {
  const { missing, hasDataForSEO } = await checkEnv();

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="mx-auto max-w-2xl space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-100">
            SEO Tools – Setup
          </h1>
          <p className="mt-2 text-zinc-500">
            Configure these services before delivering to your client.
          </p>
        </div>

        <div className="space-y-4">
          <ConfigItem
            name="DATABASE_URL"
            status={!missing.includes("DATABASE_URL")}
            description="PostgreSQL connection string. Use Neon.tech (free) for production."
            link="https://neon.tech"
          />
          <ConfigItem
            name="Clerk (Auth)"
            status={!missing.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")}
            description="NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY."
            link="https://clerk.com"
          />
          <ConfigItem
            name="DataForSEO"
            status={hasDataForSEO}
            description="DATA_FOR_SEO_LOGIN and DATA_FOR_SEO_PASSWORD. Or add in Settings after sign-in."
            link="https://dataforseo.com"
          />
        </div>

        {missing.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h3 className="font-semibold text-amber-400">Missing configuration</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Add these to your .env file: {missing.join(", ")}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Copy .env.example to .env and fill in the values.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-semibold text-zinc-100">Deploy commands</h3>
          <div className="mt-3 space-y-2 font-mono text-sm text-zinc-400">
            <p>npm install</p>
            <p>npx prisma migrate deploy</p>
            <p>npm run build</p>
            <p>npm start</p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-white hover:bg-[var(--accent-muted)]"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ConfigItem({
  name,
  status,
  description,
  link,
}: {
  name: string;
  status: boolean;
  description: string;
  link: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          status ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
        }`}
      >
        {status ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-zinc-100">{name}</h2>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
        >
          {link.replace("https://", "")} <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
