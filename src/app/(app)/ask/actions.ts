"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/session";
import { askAboutSpending } from "@/server/ai/ask";

export type AskState = {
  question?: string;
  answer?: string;
  lookups?: string[];
  error?: string;
};

const questionSchema = z.string().trim().min(3, "Type a question first.").max(300, "Keep it under 300 characters.");

export async function askAction(_prev: AskState, formData: FormData): Promise<AskState> {
  const userId = await requireUserId();
  const parsed = questionSchema.safeParse(formData.get("question"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid question." };

  const question = parsed.data;
  const result = await askAboutSpending(userId, question);
  return result.ok ? { question, answer: result.answer, lookups: result.lookups } : { question, error: result.error };
}
