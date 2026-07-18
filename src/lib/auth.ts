import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role } from "@prisma/client";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email =
        typeof user.email === "string"
          ? user.email
          : typeof profile?.email === "string"
            ? profile.email
            : null;

      if (!email) {
        return "/login?error=google_email_missing";
      }

      if ((profile as { email_verified?: boolean }).email_verified !== true) {
        return "/login?error=google_email_unverified";
      }

      const approvedUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, suspendedAt: true },
      });

      if (!approvedUser) {
        return `/login?error=access_required&email=${encodeURIComponent(email)}`;
      }

      if (approvedUser.suspendedAt) {
        return "/login?error=account_suspended";
      }

      return true;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: Role }).role ?? "VIEWER";
      }
      return session;
    },
  },
});
