"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/receipts", label: "Receipts" },
  { href: "/budgets", label: "Budgets" },
  { href: "/ask", label: "Ask" },
  { href: "/categories", label: "Categories" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    // Scrolls sideways on small phones instead of wrapping onto two lines.
    <nav aria-label="Main" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 whitespace-nowrap">
        {LINKS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-brand/10 text-brand" : "text-foreground/70 hover:bg-muted",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
