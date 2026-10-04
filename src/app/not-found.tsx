import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-sm font-semibold text-brand">404</p>
      <h1 className="text-2xl font-bold">We couldn&apos;t find that</h1>
      <p className="text-foreground/60">It may have been deleted, or the link is wrong.</p>
      <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
    </main>
  );
}
