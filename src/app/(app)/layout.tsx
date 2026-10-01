import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCurrentUser } from "@/server/auth/session";
import { signOutAction } from "../(auth)/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="text-lg font-bold tracking-tight text-brand">
              LedgerLite
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-foreground/60 sm:inline">
                {user.name ?? user.email}
              </span>
              <form action={signOutAction}>
                <SubmitButton variant="ghost" pendingText="Signing out…">
                  Sign out
                </SubmitButton>
              </form>
            </div>
          </div>
          <AppNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
