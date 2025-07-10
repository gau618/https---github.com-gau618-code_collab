import NextAuth, { type AuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHubProvider from "next-auth/providers/github";
import prisma from "@/app/lib/prisma";
import { encode } from "next-auth/jwt"; // ← used to turn the JWT object into a signed string

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    /* fires on sign-in and every token refresh */
    async jwt({ token, user }) {
      if (user) token.id = user.id; // persist DB id in the JWT payload
      return token;
    },

    /* enrich the Session object sent to the browser */
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;

      /* create a raw, signed JWT string → client can pass it to Hocuspocus */
      session.accessToken = await encode({
        token,
        secret: process.env.NEXTAUTH_SECRET!,
        encryption: false, // <- pass false here as well
      });

      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
