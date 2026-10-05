import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of service</h1>
      <p className="text-sm text-foreground/60">Last updated 5 October 2026</p>
      <p>
        LedgerLite is a free personal project, provided as is, without any warranty. By using it you agree to
        the following.
      </p>
      <ul>
        <li>
          Use it only for your own records, and don&apos;t try to access other people&apos;s data or disrupt the
          service.
        </li>
        <li>
          AI-read receipt details and AI answers can be wrong. Check them before relying on them, especially
          for tax or GST filings. LedgerLite is not accounting or tax advice.
        </li>
        <li>
          Keep your own copy of important records (the Expenses page has a CSV export). The service may change
          or end.
        </li>
        <li>We may suspend accounts that abuse the service.</li>
      </ul>
      <p>
        Contact:{" "}
        <a className="text-brand underline" href="mailto:gauravdotio@gmail.com">
          gauravdotio@gmail.com
        </a>
      </p>
    </>
  );
}
