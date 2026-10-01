import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/session";

const FEATURES = [
  ["Snap a receipt", "AI reads the vendor, date, total and GST. You check it and save."],
  ["GST at a glance", "See how much GST you paid each month, ready for your accountant."],
  ["Budgets that warn you", "Set a monthly limit per category and see when you're close."],
  ["Ask in plain words", "“How much did I spend on transport in September?”"],
] as const;

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">LedgerLite</p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Snap a receipt. Know where every rupee went.
      </h1>
      <p className="text-lg text-foreground/70">
        A simple expense tracker for small shop owners in India: cash, UPI and card, GST-aware,
        with monthly budgets.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/signup">Create free account</ButtonLink>
        <ButtonLink href="/login" variant="secondary">
          Sign in
        </ButtonLink>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map(([title, body]) => (
          <li key={title} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-foreground/60">{body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
