import { z } from "zod";
import { normaliseAmount } from "@/lib/money";

export const categoryNameSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(40, "Keep it under 40 characters"),
});

// Empty means "remove the budget for this category".
export const budgetSchema = z.object({
  monthlyLimit: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === "") return null;
      const amount = normaliseAmount(value);
      if (amount === null || Number(amount) <= 0) {
        ctx.addIssue({ code: "custom", message: "Enter a monthly limit like 5000, or leave empty" });
        return z.NEVER;
      }
      return amount;
    }),
});
