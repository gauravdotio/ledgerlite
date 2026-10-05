import "server-only";
import { z } from "zod";

// Validate environment variables once, at import time. A typo or a missing
// variable crashes on boot with a clear message instead of failing on the
// first database query.
const optional = z
  .string()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Pooled connection string used by the running app (Neon "-pooler" host).
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Signs the session cookie. Generate with: openssl rand -base64 32
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  // Google sign-in is optional: the button only shows when both are set.
  AUTH_GOOGLE_ID: optional,
  AUTH_GOOGLE_SECRET: optional,
  // Receipt AI (free key from Google AI Studio). Without it, receipts still
  // upload and the user types the details in by hand.
  GOOGLE_GENERATIVE_AI_API_KEY: optional,
  AI_MODEL: z.string().default("gemini-flash-latest"),
  // Tried when the main model is overloaded or rate-limited (common on the
  // free tier). Set to "none" to disable.
  AI_FALLBACK_MODEL: z.string().default("gemini-flash-lite-latest"),
  // Vercel Blob. Without it, receipts are saved to ./.local/uploads (dev only).
  BLOB_READ_WRITE_TOKEN: optional,
});

// CI builds the app without real secrets; SKIP_ENV_VALIDATION=1 fills in
// placeholders so `next build` can run. Never set it in production.
const source =
  process.env["SKIP_ENV_VALIDATION"] === "1"
    ? {
        DATABASE_URL: "postgresql://build:build@localhost:5432/build",
        AUTH_SECRET: "x".repeat(32),
        ...process.env,
      }
    : process.env;

const parsed = envSchema.safeParse(source);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", z.flattenError(parsed.error).fieldErrors);
  throw new Error("Invalid environment variables. Compare your .env with .env.example.");
}

export const env = parsed.data;

export const features = {
  googleSignIn: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
  ai: Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY), // receipt reading + Ask
  blobStorage: Boolean(env.BLOB_READ_WRITE_TOKEN),
};
