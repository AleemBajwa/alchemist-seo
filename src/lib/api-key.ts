import { createHash, randomBytes } from "crypto";
import { prisma } from "./db";

const PREFIX = "alc_";
const KEY_BYTES = 32;

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = PREFIX + randomBytes(KEY_BYTES).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, PREFIX.length + 8);
  return { raw, hash, prefix };
}

export async function validateApiKey(headerValue: string | null): Promise<{ userId: string } | null> {
  if (!headerValue?.trim()) return null;
  const raw = headerValue.trim();
  if (!raw.startsWith(PREFIX)) return null;
  const hash = createHash("sha256").update(raw).digest("hex");

  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    include: { user: true },
  });
  if (!key) return null;

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return { userId: key.user.clerkId };
}
