import Link from "next/link";

// Public, signed-out pages (privacy policy, terms). Google requires a public
// privacy policy link before an OAuth app can be published.
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/" className="text-lg font-bold tracking-tight text-brand">
        LedgerLite
      </Link>
      <article className="mt-8 flex flex-col gap-4 leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </article>
    </main>
  );
}
