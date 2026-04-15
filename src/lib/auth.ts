import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      avatar_url?: string | null;
      youtube_channel_id?: string | null;
      subscription_count?: number;
      last_synced_at?: Date | null;
    };
  }
}

export const authOptions: NextAuthConfig = {
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "profile",
            "email",
            "https://www.googleapis.com/auth/youtube.readonly",
          ].join(" "),
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile) {
        const hasYouTubeScope = account.scope?.includes("https://www.googleapis.com/auth/youtube.readonly");
        if (!hasYouTubeScope) {
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, token.sub))
          .limit(1);

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.avatar_url = dbUser.avatarUrl;
          session.user.youtube_channel_id = dbUser.youtubeChannelId;
          session.user.subscription_count = dbUser.subscriptionCount;
          session.user.last_synced_at = dbUser.lastSyncedAt;
        }
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account && profile && profile.sub) {
        token.sub = profile.sub;
      }
      return token;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  session: {
    strategy: "jwt",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
