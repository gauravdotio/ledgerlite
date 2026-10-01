import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

// The real security check. The proxy only does a quick cookie-based redirect;
// every page and server action that touches data calls this instead.
// `cache` makes repeated calls within one request read the session once.
export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});

export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user.id;
}
