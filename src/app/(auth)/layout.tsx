import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-lg font-bold tracking-tight text-brand">
        LedgerLite
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-6 text-xs text-foreground/50">
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
      </p>
    </main>
  );
}
