import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  pages: {
    signIn: "/login",
  },

  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID,

      clientSecret:
        process.env
          .AUTH_GOOGLE_SECRET,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, profile }) {
      // "profile" is only present right after sign-in
      if (profile?.sub) {
        token.googleId = profile.sub;
      }

      return token;
    },

    async session({
      session,
      token,
    }) {
      const googleId =
        token.googleId as
          | string
          | undefined;

      if (googleId) {
        (
          session.user as typeof session.user & {
            googleId: string;
          }
        ).googleId = googleId;

        const profile =
          await prisma.profile.findUnique(
            {
              where: {
                googleId,
              },
            }
          );

        (
          session.user as typeof session.user & {
            profileComplete: boolean;
          }
        ).profileComplete =
          Boolean(profile);
      }

      return session;
    },
  },
});
