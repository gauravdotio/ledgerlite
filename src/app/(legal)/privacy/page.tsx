import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

const UPDATED = "5 October 2026";

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="text-sm text-foreground/60">Last updated {UPDATED}</p>
      <p>
        LedgerLite is a personal project: an expense tracker for small shop owners. This page explains what it
        stores and why, in plain words.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your name and email address. With email sign-in, a one-way hash of
          your password (never the password itself). With Google sign-in, the name, email and profile picture
          Google shares with us, and an ID linking your Google account. We do not receive your Google
          password.
        </li>
        <li>
          <strong>What you enter:</strong> expenses, categories, budgets and notes.
        </li>
        <li>
          <strong>Receipt photos you upload,</strong> and the details read from them.
        </li>
      </ul>

      <h2>How it&apos;s used</h2>
      <ul>
        <li>Only to run the app for you: sign you in and show you your own records.</li>
        <li>Your data is never sold, shared for advertising, or shown to other users.</li>
        <li>
          Data from Google sign-in is used only to create and sign in to your account, in line with the Google
          API Services User Data Policy.
        </li>
      </ul>

      <h2>Services that process your data</h2>
      <ul>
        <li>
          <strong>Vercel</strong> hosts the app and stores receipt images privately.
        </li>
        <li>
          <strong>Neon</strong> hosts the database (Singapore region).
        </li>
        <li>
          <strong>Google Gemini</strong> reads receipt photos and answers questions you ask on the Ask page.
          Only the photo or question, and the expense figures needed to answer it, are sent.
        </li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>You can edit or delete any expense, receipt or category at any time.</li>
        <li>
          To delete your whole account and all its data, email the address below. Deleting an account removes
          all of its records.
        </li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions or deletion requests:{" "}
        <a className="text-brand underline" href="mailto:gauravdotio@gmail.com">
          gauravdotio@gmail.com
        </a>
      </p>
    </>
  );
}
