import type { Metadata } from "next";
import { connection } from "next/server";
import { features } from "@/lib/env";
import { SignupForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  // Render per request, so the Google button reflects the current env vars
  // instead of whatever was set when the app was built.
  await connection();
  return <SignupForm google={features.googleSignIn} />;
}
