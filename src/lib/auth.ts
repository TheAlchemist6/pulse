import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, authUsers, accounts, sessions, verificationTokens } from "@/lib/db/schema";
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
  adapter: DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
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

        // Upsert into Pulse users table with OAuth tokens + YouTube data
        if (user.id && account.access_token) {
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);

          if (existingUser.length === 0) {
            await db.insert(users).values({
              id: user.id,
              name: user.name || "Unknown",
              avatarUrl: user.image || null,
              youtubeChannelId: "",  // populated during import
              oauthAccessToken: account.access_token,
              oauthRefreshToken: account.refresh_token || "",
              oauthExpiresAt: account.expires_at
                ? new Date(account.expires_at * 1000)
                : new Date(Date.now() + 3600 * 1000),
            });
          } else {
            await db
              .update(users)
              .set({
                name: user.name || existingUser[0].name,
                avatarUrl: user.image || existingUser[0].avatarUrl,
                oauthAccessToken: account.access_token,
                oauthRefreshToken: account.refresh_token || existingUser[0].oauthRefreshToken,
                oauthExpiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : new Date(Date.now() + 3600 * 1000),
              })
              .where(eq(users.id, user.id));
          }
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
    async jwt({ token, user, account }) {
      // On sign-in, user object has the Auth.js user ID (UUID)
      if (user?.id) {
        token.sub = user.id;
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
