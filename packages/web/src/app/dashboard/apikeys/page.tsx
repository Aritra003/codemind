import { auth } from "@/lib/auth";
import { listApiKeys } from "@/lib/api-keys";
import { ApiKeysClient } from "./client";

export default async function ApiKeysPage() {
  const session = await auth();
  const userId = (session?.user as { id: string })?.id;
  const keys = await listApiKeys(userId);
  return <ApiKeysClient keys={keys} />;
}
