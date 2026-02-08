const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
] as const;

export function validateEnv(): { ok: boolean; missing: string[] } {
  const missing = required.filter((key) => !process.env[key]?.trim());
  return { ok: missing.length === 0, missing: [...missing] };
}
