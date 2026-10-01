"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { features } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { echo, invalid, type FormState } from "@/lib/form";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import { createDefaultCategories } from "@/server/categories";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeRedirectPath(formData.get("callbackUrl")),
    });
  } catch (error) {
    // signIn() redirects by throwing a special Next.js error on success, so
    // only Auth.js errors are handled here; everything else is re-thrown.
    if (error instanceof AuthError) {
      return {
        message:
          error.type === "CredentialsSignin"
            ? "Wrong email or password."
            : "Couldn't sign you in. Please try again.",
        ...echo(formData),
      };
    }
    throw error;
  }
  return {};
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return {
      errors: { email: ["An account with this email already exists. Sign in instead."] },
      ...echo(formData),
    };
  }

  const passwordHash = await hashPassword(password);
  // One transaction: a user is never left without their starter categories.
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, passwordHash } });
    await createDefaultCategories(user.id, tx);
  });

  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return {};
}

export async function googleSignInAction(formData: FormData) {
  if (!features.googleSignIn) return;
  await signIn("google", { redirectTo: safeRedirectPath(formData.get("callbackUrl")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
