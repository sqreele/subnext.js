import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextAuthOptions } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { UserProfile, Property } from '@/app/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://pmcs.site');

interface ProfileData {
  email?: string | null;
  profile_image?: string | null;
  positions?: string;
  created_at?: string;
  properties?: any[];
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Missing credentials.');
        }

        try {
          // Step 1: Get authentication tokens
          const tokenResponse = await fetch(`${API_BASE_URL}/api/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });

          if (!tokenResponse.ok) {
            const text = await tokenResponse.text();
            console.error(`Token fetch failed: ${tokenResponse.status} - ${text}`);
            throw new Error('Invalid credentials or token response.');
          }

          const tokenData = await tokenResponse.json().catch((err) => {
            console.error('Failed to parse token response JSON:', err);
            throw new Error('Invalid token response format.');
          });

          if (!tokenData.access || !tokenData.refresh) {
            console.error('Token response missing required fields:', tokenData);
            throw new Error('Token response missing required fields.');
          }

          // Step 2: Decode the token to get user ID
          const decoded = jwt.decode(tokenData.access) as JwtPayload;
          if (!decoded || typeof decoded !== 'object') {
            console.error('Failed to decode access token:', tokenData.access);
            throw new Error('Failed to decode access token.');
          }

          const userId = String(decoded.user_id);

          // Step 3: Fetch user from database or API
          let user = await prisma.user.findUnique({
            where: { id: userId },
            include: { properties: true },
          });

          // Step 4: If user doesn't exist in database, fetch from API and create it
          let profileData: ProfileData = {};
          if (!user) {
            console.log(`User ${userId} not found in database, fetching from API...`);
            const profileResponse = await fetch(`${API_BASE_URL}/api/user-profiles/${userId}/`, {
              headers: { 
                Authorization: `Bearer ${tokenData.access}`, 
                'Content-Type': 'application/json' 
              },
            });

            if (!profileResponse.ok) {
              const text = await profileResponse.text();
              console.error(`Failed to fetch profile for user ${userId}: ${profileResponse.status} - ${text}`);
            } else {
              profileData = await profileResponse.json().catch((err) => {
                console.error(`Failed to parse profile JSON for user ${userId}:`, err);
                return {};
              });
              console.log(`Fetched profile data for user ${userId}:`, profileData);
            }

            // Create or update user in database
            user = await prisma.user.upsert({
              where: { id: userId },
              update: {
                username: credentials.username,
                email: profileData.email || null,
                profile_image: profileData.profile_image || null,
                positions: profileData.positions || 'User',
                created_at: new Date(profileData.created_at || Date.now()),
              },
              create: {
                id: userId,
                username: credentials.username,
                email: profileData.email || null,
                profile_image: profileData.profile_image || null,
                positions: profileData.positions || 'User',
                created_at: new Date(profileData.created_at || Date.now()),
              },
              include: { properties: true },
            });
          }

          // Step 5: Fetch properties from API
          console.log(`Fetching properties for user ${userId}...`);
          let propertiesData = [];
          try {
            const propertiesResponse = await fetch(`${API_BASE_URL}/api/properties/`, {
              headers: { 
                Authorization: `Bearer ${tokenData.access}`, 
                'Content-Type': 'application/json' 
              },
            });

            if (!propertiesResponse.ok) {
              const text = await propertiesResponse.text();
              console.error(`Failed to fetch properties: ${propertiesResponse.status} - ${text}`);
            } else {
              propertiesData = await propertiesResponse.json().catch((err) => {
                console.error('Failed to parse properties JSON:', err);
                return [];
              });
              console.log(`Fetched ${propertiesData.length} properties from API`);
            }
          } catch (error) {
            console.error('Error fetching properties:', error);
          }

          // Step 6: Create normalized properties array
          let normalizedProperties: Property[] = [];

          if (user.properties && user.properties.length > 0) {
            console.log(`User has ${user.properties.length} properties in database`);
            normalizedProperties = user.properties.map((userProp: { propertyId: any }) => {
              const propId = String(userProp.propertyId);
              const apiProperty = propertiesData.find((p: any) => String(p.id) === propId);

              return {
                property_id: propId,
                id: propId,
                name: apiProperty?.name || `Property ${propId}`,
                description: apiProperty?.description || '',
                created_at: apiProperty?.created_at || new Date().toISOString(),
                users: [],
              };
            });
          } else {
            console.log(`User has no properties in database, checking API data...`);
            if (profileData.properties && profileData.properties.length > 0) {
              console.log(`Found ${profileData.properties.length} properties in profile data`);
              normalizedProperties = profileData.properties.map((prop: any) => {
                const propId = String(prop.id || prop.property_id);
                return {
                  property_id: propId,
                  id: propId,
                  name: prop.name || `Property ${propId}`,
                  description: prop.description || '',
                  created_at: prop.created_at || new Date().toISOString(),
                  users: [],
                };
              });
            } else {
              console.log(`No properties found for user ${userId} in API data either`);
            }
          }

          console.log(`Normalized ${normalizedProperties.length} properties for user ${userId}`);

          // Step 7: Create user profile with normalized properties
          const userProfile: UserProfile = {
            id: userId,
            username: credentials.username,
            email: user.email,
            profile_image: user.profile_image,
            positions: user.positions,
            properties: normalizedProperties,
            created_at: user.created_at.toISOString(),
          };

          return { 
            ...userProfile, 
            accessToken: tokenData.access, 
            refreshToken: tokenData.refresh 
          };
        } catch (error) {
          console.error('Authorization Error:', error);
          throw new Error('Unable to log in. Please check your credentials.');
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token = {
          ...token,
          ...user,
          properties: user.properties || [], // Ensure properties is always an array
        };
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...token,
        properties: token.properties || [], // Fallback to empty array
      } as any;
      return session;
    },
  },
  pages: { signIn: '/auth/signin' },
  session: { 
    strategy: 'jwt', 
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60 // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== 'production',
};

export default NextAuth(authOptions);