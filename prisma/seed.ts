// Seeds a demo user with default categories, budgets and ~6 months of
// realistic sample expenses for a small shop.
//
//   npm run db:seed                 # safe to run repeatedly; adds samples only once
//   SEED_RESET=1 npm run db:seed    # wipe and regenerate the demo user's expenses
//
// This script runs under plain Node via tsx, outside Next.js, so it creates
// its own PrismaClient instead of importing src/lib/db.ts (which is marked
// "server-only" and validates Next.js env vars).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PaymentMode, PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_CATEGORIES, type DefaultCategory } from "../src/lib/categories";
import { currentMonth, monthRange, shiftMonth, todayInIndia } from "../src/lib/dates";
import { hashPassword } from "../src/lib/password";

// Demo login for local development only. Never seed this into production.
export const DEMO_EMAIL = "demo@ledgerlite.dev";
export const DEMO_PASSWORD = "demo-ledger-2026";

const connectionString = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Deterministic pseudo-random numbers, so every seed run gives the same data.
let state = 42;
function random() {
  state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
  return state / 2 ** 31;
}
const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
const between = (min: number, max: number) => Math.round(min + random() * (max - min));

type Template = {
  category: DefaultCategory;
  vendors: readonly string[];
  perMonth: [number, number];
  amount: [number, number];
  gstRate: number; // 0, 0.05, 0.12, 0.18
  modes: readonly PaymentMode[];
};

const TEMPLATES: Template[] = [
  { category: "Stock / Inventory", vendors: ["Sharma Wholesale Traders", "Agarwal Distributors", "Metro Cash & Carry"], perMonth: [4, 7], amount: [3000, 18000], gstRate: 0.18, modes: ["UPI", "CARD"] },
  { category: "Rent", vendors: ["Mr. R. K. Malhotra (landlord)"], perMonth: [1, 1], amount: [15000, 15000], gstRate: 0, modes: ["UPI"] },
  { category: "Electricity", vendors: ["BSES Rajdhani"], perMonth: [1, 1], amount: [1800, 3600], gstRate: 0, modes: ["UPI"] },
  { category: "Salaries", vendors: ["Ramesh (helper)", "Sunita (cashier)"], perMonth: [2, 2], amount: [9000, 12000], gstRate: 0, modes: ["CASH", "UPI"] },
  { category: "Transport", vendors: ["Porter", "Raju Tempo Service", "Rapido"], perMonth: [3, 6], amount: [150, 900], gstRate: 0.05, modes: ["UPI", "CASH"] },
  { category: "Packaging", vendors: ["Gupta Packaging Co.", "Shree Ganesh Stores"], perMonth: [1, 2], amount: [500, 2500], gstRate: 0.18, modes: ["UPI", "CASH"] },
  { category: "Internet & Phone", vendors: ["Jio Fiber", "Airtel"], perMonth: [1, 2], amount: [399, 999], gstRate: 0.18, modes: ["UPI", "CARD"] },
  { category: "Food & Tea", vendors: ["Ramu Chai Stall", "Haldiram's", "Local dhaba"], perMonth: [4, 9], amount: [60, 450], gstRate: 0, modes: ["CASH", "UPI"] },
  { category: "Repairs & Maintenance", vendors: ["Sai Electricals", "Verma Carpentry"], perMonth: [0, 1], amount: [400, 4000], gstRate: 0.18, modes: ["CASH", "UPI"] },
];

const BUDGETS: Partial<Record<DefaultCategory, string>> = {
  Electricity: "3000.00",
  Transport: "3500.00",
  "Food & Tea": "2000.00",
  Packaging: "2500.00",
};

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: { email: DEMO_EMAIL, name: "Demo Kirana Store", passwordHash },
  });

  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((name) => ({ userId: user.id, name })),
    skipDuplicates: true,
  });
  const categories = await db.category.findMany({ where: { userId: user.id } });
  const idOf = (name: string): string => {
    const category = categories.find((c) => c.name === name);
    if (!category) throw new Error(`Seed category missing: ${name}`);
    return category.id;
  };

  for (const [name, limit] of Object.entries(BUDGETS)) {
    const categoryId = idOf(name);
    await db.budget.upsert({
      where: { categoryId_userId: { categoryId, userId: user.id } },
      create: { userId: user.id, categoryId, monthlyLimit: limit },
      update: { monthlyLimit: limit },
    });
  }

  if (process.env["SEED_RESET"] === "1") {
    const { count } = await db.expense.deleteMany({ where: { userId: user.id } });
    console.log(`Deleted ${count} demo expenses.`);
  }
  const existing = await db.expense.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log(`Demo user already has ${existing} expenses, skipping samples (SEED_RESET=1 to regenerate).`);
    return;
  }

  const today = todayInIndia();
  const rows = [];
  for (let back = 5; back >= 0; back--) {
    const month = shiftMonth(currentMonth(), -back);
    const { start, end } = monthRange(month);
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    for (const t of TEMPLATES) {
      for (let i = between(...t.perMonth); i > 0; i--) {
        const date = new Date(start);
        date.setUTCDate(between(1, days));
        if (date.toISOString().slice(0, 10) > today) continue; // no future dates
        const amount = between(...t.amount);
        // Amount is GST-inclusive: gst = amount * rate / (1 + rate).
        const gst = t.gstRate ? (amount * t.gstRate) / (1 + t.gstRate) : 0;
        rows.push({
          userId: user.id,
          categoryId: idOf(t.category),
          vendor: pick(t.vendors),
          amount: amount.toFixed(2),
          gstAmount: gst.toFixed(2),
          date,
          paymentMode: pick(t.modes),
        });
      }
    }
  }
  await db.expense.createMany({ data: rows });
  console.log(`Seeded ${rows.length} expenses for ${DEMO_EMAIL}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
