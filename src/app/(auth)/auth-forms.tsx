"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/form";
import { googleSignInAction, loginAction, signupAction } from "./actions";

function GoogleButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <form action={googleSignInAction} className="mt-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <SubmitButton variant="secondary" className="w-full" pendingText="Redirecting…">
        Continue with Google
      </SubmitButton>
    </form>
  );
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs text-foreground/50">
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function LoginForm({ callbackUrl, google }: { callbackUrl: string; google: boolean }) {
  const [state, action] = useActionState(loginAction, initialFormState);
  return (
    <Card>
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-foreground/60">Welcome back to your shop ledger.</p>
      {google ? (
        <>
          <GoogleButton callbackUrl={callbackUrl} />
          <Divider />
        </>
      ) : null}
      <form key={state.nonce} action={action} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {state.message ? <Alert>{state.message}</Alert> : null}
        <Field label="Email" name="email" error={state.errors?.["email"]}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.values?.["email"]}
            error={state.errors?.["email"]}
          />
        </Field>
        <Field label="Password" name="password" error={state.errors?.["password"]}>
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={state.errors?.["password"]}
          />
        </Field>
        <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-foreground/60">
        New here?{" "}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </Card>
  );
}

export function SignupForm({ google }: { google: boolean }) {
  const [state, action] = useActionState(signupAction, initialFormState);
  return (
    <Card>
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-foreground/60">Free. Takes 30 seconds.</p>
      {google ? (
        <>
          <GoogleButton callbackUrl="/dashboard" />
          <Divider />
        </>
      ) : null}
      <form key={state.nonce} action={action} className="mt-4 flex flex-col gap-4">
        {state.message ? <Alert>{state.message}</Alert> : null}
        <Field label="Your name or shop name" name="name" error={state.errors?.["name"]}>
          <Input
            name="name"
            autoComplete="organization"
            required
            defaultValue={state.values?.["name"]}
            error={state.errors?.["name"]}
          />
        </Field>
        <Field label="Email" name="email" error={state.errors?.["email"]}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.values?.["email"]}
            error={state.errors?.["email"]}
          />
        </Field>
        <Field
          label="Password"
          name="password"
          error={state.errors?.["password"]}
          hint="At least 8 characters."
        >
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            error={state.errors?.["password"]}
          />
        </Field>
        <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-foreground/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
