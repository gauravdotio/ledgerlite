// Default categories every new user starts with. Used by the seed script now,
// and by the sign-up flow in Phase 2. `as const` keeps the literal types.
export const DEFAULT_CATEGORIES = [
  "Stock / Inventory",
  "Rent",
  "Electricity",
  "Salaries",
  "Transport",
  "Packaging",
  "Repairs & Maintenance",
  "Internet & Phone",
  "Food & Tea",
  "Miscellaneous",
] as const;

export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number];
