import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt, { JwtPayload } from "jsonwebtoken";
import { NextAuthOptions } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { UserProfile, Property } from "@/app/lib/types";
import { getUserProperties } from "./prisma-user-property";

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
          console.log("Token data:", tokenData);

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
          console.log("Decoded user ID:", userId);

          // Step 3: Fetch user from Prisma database with properties
          let user = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
              properties: true
            },
          });
          console.log("Prisma user with properties:", user);

          // Step 4: Fetch profile data from API (includes properties)
          const profileResponse = await fetch(`${API_BASE_URL}/api/user-profiles/${userId}/`, {
            headers: { Authorization: `Bearer ${tokenData.access}`, "Content-Type": "application/json" },
          });
          
          let profileData: { email?: string | null; profile_image?: string | null; positions?: string; created_at?: string; properties?: any[] } = {};
          if (profileResponse.ok) {
            profileData = await profileResponse.json();
            console.log(`Fetched profile data for user ${userId}:`, profileData);
          } else {
            console.error(`Profile fetch failed: ${profileResponse.status}`);
          }

          // If user not in database, create it
          if (!user) {
            user = await prisma.user.upsert({
              where: { id: userId },
              update: {
                username: credentials.username,
                email: profileData.email || null,
                profile_image: profileData.profile_image || null,
                positions: profileData.positions || "User",
                created_at: profileData.created_at ? new Date(profileData.created_at) : new Date(),
              },
              create: {
                id: userId,
                username: credentials.username,
                email: profileData.email || null,
                profile_image: profileData.profile_image || null,
                positions: profileData.positions || "User",
                created_at: profileData.created_at ? new Date(profileData.created_at) : new Date(),
              },
              include: { 
                properties: true
              },
            });
            console.log("Created/updated Prisma user:", user);
          }

          // Step 5: Normalize properties (prefer API data, fallback to Prisma)
          let normalizedProperties: Property[] = [];
          
          // First try to get properties from API
          if (profileData.properties && profileData.properties.length > 0) {
            normalizedProperties = profileData.properties.map((prop: any) => ({
              id: String(prop.property_id || prop.id),
              property_id: String(prop.property_id || prop.id),
              name: prop.name || `Property ${prop.property_id || prop.id}`,
              description: prop.description || "",
              created_at: prop.created_at || new Date().toISOString(),
              users: prop.users || [],
            }));
          } 
          // Then try to get properties from the Prisma relation
          else if (user && user.properties && user.properties.length > 0) {
            normalizedProperties = user.properties.map((prop: any) => ({
              id: String(prop.id),
              property_id: String(prop.id),
              name: prop.name || `Property ${prop.id}`,
              description: prop.description || "",
              created_at: prop.created_at.toISOString(),
              users: [],
            }));
          }
          // If still no properties, try the helper function which handles the m2m relation
          else {
            try {
              normalizedProperties = await getUserProperties(userId);
            } catch (error) {
              console.error("Failed to get properties via helper:", error);
              // Default to empty array if all else fails
              normalizedProperties = [];
            }
          }
          
          console.log(`Normalized ${normalizedProperties.length} properties for user ${userId}:`, normalizedProperties);

          // Step 6: Construct user profile with explicit string conversion
          const userProfile: UserProfile = {
            id: userId,
            username: credentials.username,
            email: user.email || profileData.email || null,
            profile_image: user.profile_image || profileData.profile_image || null,
            positions: user.positions || profileData.positions || "User",
            properties: normalizedProperties,
            created_at: user.created_at.toISOString() || profileData.created_at || new Date().toISOString(),
          };

          // Step 7: Return user with required refreshToken
          const authResult = {
            ...userProfile,
            accessToken: tokenData.access,
            refreshToken: tokenData.refresh,
          };
          console.log("Authorize result:", authResult);
          return authResult;
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
        // Ensure properties is always an array
        const properties = Array.isArray(user.properties) ? user.properties : [];
        
        token.id = user.id;
        token.username = user.username;
        token.email = user.email;
        token.profile_image = user.profile_image;
        token.positions = user.positions;
        token.properties = properties;
        token.created_at = user.created_at;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        console.log("JWT token after user assignment:", token);
      }
      return token;
    },
    async session({ session, token }) {
      // Ensure properties is always an array
      const properties = Array.isArray(token.properties) ? token.properties : [];
      
      session.user = {
        id: token.id,
        username: token.username,
        email: token.email,
        profile_image: token.profile_image,
        positions: token.positions,
        properties: properties,
        created_at: token.created_at as string,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        sessionToken: undefined,
        error: token.error,
      };
      console.log("Session data before return:", session.user);
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