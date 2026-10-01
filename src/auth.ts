import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation/auth";
import { createDefaultCategories } from "@/server/categories";

// Make `session.user.id` a required string everywhere in the app.
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      const user = await db.user.findUnique({ where: { email } });
      // Always run scrypt, even for unknown emails, so timing can't reveal
      // which addresses have accounts.
      const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !user.passwordHash || !ok) return null;

      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

if (features.googleSignIn) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      // Lets someone who signed up with email+password later use "Continue with
      // Google" on the same address. Safe for Google because Google verifies
      // email ownership; don't enable this for providers that don't.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The adapter stores users and Google account links in our database.
  // The cast is needed because Prisma 7 generates the client into src/generated
  // instead of @prisma/client, which is the type the adapter was written against.
  adapter: PrismaAdapter(db as unknown as Parameters<typeof PrismaAdapter>[0]),
  // The Credentials provider only works with JWT sessions (a signed, encrypted
  // cookie) rather than database sessions.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: env.AUTH_SECRET,
  trustHost: true,
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    // Runs when the adapter creates a user, i.e. a first Google sign-in.
    // Email+password sign-ups get their categories in the sign-up action.
    async createUser({ user }) {
      if (user.id) await createDefaultCategories(user.id);
    },
  },
});
