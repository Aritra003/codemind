import { createHash, randomBytes } from "crypto";
import { db } from "./db";

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `cm_${randomBytes(24).toString("base64url")}`;
  const prefix = raw.slice(0, 10);
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, prefix, hash };
}

export async function verifyApiKey(raw: string): Promise<string | null> {
  if (!raw.startsWith("cm_")) return null;
  const hash = createHash("sha256").update(raw).digest("hex");
  const key = await db.apiKey.findUnique({
    where: { keyHash: hash },
    select: { userId: true, id: true },
  });
  if (!key) return null;
  await db.apiKey.update({ where: { id: key.id }, data: { lastUsed: new Date() } });
  return key.userId;
}

export async function createApiKey(userId: string, name: string) {
  const { raw, prefix, hash } = generateApiKey();
  await db.apiKey.create({ data: { userId, name, keyHash: hash, prefix } });
  return raw;
}

export async function listApiKeys(userId: string) {
  return db.apiKey.findMany({
    where: { userId },
    select: { id: true, name: true, prefix: true, lastUsed: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteApiKey(id: string, userId: string) {
  return db.apiKey.deleteMany({ where: { id, userId } });
}
