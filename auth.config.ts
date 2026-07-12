import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";

const allowedIds = (process.env.ALLOWED_DISCORD_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export default {
  providers: [Discord],
  callbacks: {
    async signIn({ account }) {
      if (!account?.providerAccountId) return false;
      return allowedIds.includes(account.providerAccountId);
    },
    async jwt({ token, account }) {
      if (account?.providerAccountId) {
        token.discordId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.discordId = token.discordId as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
} satisfies NextAuthConfig;
