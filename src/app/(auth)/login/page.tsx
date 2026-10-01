import type { Metadata } from "next";
import { features } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  return <LoginForm callbackUrl={safeRedirectPath(callbackUrl)} google={features.googleSignIn} />;
}
