import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt, { JwtPayload } from "jsonwebtoken";
import { NextAuthOptions } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { UserProfile, Property } from "@/app/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://pmcs.site");

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing credentials.");
        }

        try {
          // Step 1: Get authentication tokens
          const tokenResponse = await fetch(`${API_BASE_URL}/api/token/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });

          if (!tokenResponse.ok) {
            const text = await tokenResponse.text();
            console.error(`Token fetch failed: ${tokenResponse.status} - ${text}`);
            throw new Error("Invalid credentials or token response.");
          }

          const tokenData = await tokenResponse.json();
          if (!tokenData.access || !tokenData.refresh) {
            console.error("Token response missing required fields:", tokenData);
            throw new Error("Token response missing required fields.");
          }

          // Step 2: Decode the token to get user ID
          const decoded = jwt.decode(tokenData.access) as JwtPayload;
          if (!decoded || typeof decoded !== "object") {
            console.error("Failed to decode access token:", tokenData.access);
            throw new Error("Failed to decode access token.");
          }
          const userId = String(decoded.user_id);

          // Step 3: Fetch user from Prisma database
          let user = await prisma.user.findUnique({
            where: { id: userId },
            include: { properties: true },
          });

          // Step 4: If user not in database, fetch profile and properties from API
          let profileData: { email?: string | null; profile_image?: string | null; positions?: string; created_at?: string; properties?: any[] } = {};
          let propertiesData: any[] = [];
          if (!user) {
            console.log(`User ${userId} not found in database, fetching from API...`);
            const profileResponse = await fetch(`${API_BASE_URL}/api/user-profiles/${userId}/`, {
              headers: { Authorization: `Bearer ${tokenData.access}`, "Content-Type": "application/json" },
            });
            if (profileResponse.ok) {
              profileData = await profileResponse.json();
              console.log(`Fetched profile data for user ${userId}:`, profileData);
            }

            const propertiesResponse = await fetch(`${API_BASE_URL}/api/properties/`, {
              headers: { Authorization: `Bearer ${tokenData.access}`, "Content-Type": "application/json" },
            });
            if (propertiesResponse.ok) {
              propertiesData = await propertiesResponse.json();
              console.log(`Fetched ${propertiesData.length} properties from API`);
            }

            // Create or update user in database
            user = await prisma.user.upsert({
              where: { id: userId },
              update: {
                username: credentials.username,
                email: profileData.email || null,
                profile_image: profileData.profile_image || null,
                positions: profileData.positions || "User",
                created_at: new Date(profileData.created_at || Date.now()),
              },
              create: {
                id: userId,
                username: credentials.username,
                email: profileData.email || null,
                profile_image: profileData.profile_image || null,
                positions: profileData.positions || "User",
                created_at: new Date(profileData.created_at || Date.now()),
              },
              include: { properties: true },
            });
          }

          // Step 5: Normalize properties
          const normalizedProperties: Property[] = propertiesData.length > 0
            ? propertiesData.map((prop: any) => ({
                property_id: String(prop.property_id || prop.id),
                id: String(prop.property_id || prop.id),
                name: prop.name || `Property ${prop.property_id || prop.id}`,
                description: prop.description || "",
                created_at: prop.created_at || new Date().toISOString(),
                users: prop.users || [],
              }))
            : (user.properties || []).map((prop: any) => ({
                property_id: String(prop.propertyId),
                id: String(prop.propertyId),
                name: prop.name || `Property ${prop.propertyId}`,
                description: prop.description || "",
                created_at: prop.created_at || new Date().toISOString(),
                users: [],
              }));

          console.log(`Normalized ${normalizedProperties.length} properties for user ${userId}:`, normalizedProperties);

          // Step 6: Construct user profile
          const userProfile: UserProfile = {
            id: userId,
            username: credentials.username,
            email: user.email,
            profile_image: user.profile_image,
            positions: user.positions,
            properties: normalizedProperties,
            created_at: user.created_at.toISOString(),
          };

          // Step 7: Return user with required refreshToken
          return {
            ...userProfile,
            accessToken: tokenData.access,
            refreshToken: tokenData.refresh, // Always present and required
          };
        } catch (error) {
          console.error("Authorization Error:", error);
          throw new Error("Unable to log in. Please check your credentials.");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.email = user.email;
        token.profile_image = user.profile_image;
        token.positions = user.positions;
        token.properties = user.properties || [];
        token.created_at = user.created_at;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken; // Required string
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id as string,
        username: token.username as string,
        email: token.email as string | null,
        profile_image: token.profile_image as string | null,
        positions: token.positions as string,
        properties: token.properties as Property[],
        created_at: token.created_at as string,
        accessToken: token.accessToken as string,
        refreshToken: token.refreshToken as string, // Required string
        sessionToken: undefined, // Optional, only if you add it later
        error: token.error,
      };
      console.log("Session updated with properties:", session.user.properties);
      return session;
    },
  },
  pages: { signIn: "/auth/signin" },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== "production",
};

export default NextAuth(authOptions);