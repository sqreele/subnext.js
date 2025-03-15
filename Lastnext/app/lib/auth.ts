import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextAuthOptions } from 'next-auth';
import {prisma} from '@/app/lib/prisma';
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
          const tokenResponse = await fetch(`${API_BASE_URL}/api/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });
          
          const tokenData = await tokenResponse.json();
          if (!tokenResponse.ok || !tokenData.access || !tokenData.refresh) {
            throw new Error('Invalid credentials or token response.');
          }
          
          const decoded = jwt.decode(tokenData.access) as JwtPayload;
          if (!decoded || typeof decoded !== 'object') {
            throw new Error('Failed to decode access token.');
          }
          
          const userId = String(decoded.user_id);
          let user = await prisma.user.findUnique({
            where: { id: userId },
            include: { properties: true },
          });

          let profileData: ProfileData = {};
          if (!user) {
            const profileResponse = await fetch(`${API_BASE_URL}/api/user-profiles/${userId}/`, {
              headers: { Authorization: `Bearer ${tokenData.access}`, 'Content-Type': 'application/json' },
            });
            profileData = profileResponse.ok ? await profileResponse.json() : {};

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
          
          const propertiesData = await fetch(`${API_BASE_URL}/api/properties/`, {
            headers: { Authorization: `Bearer ${tokenData.access}`, 'Content-Type': 'application/json' },
          }).then(res => res.ok ? res.json() : []);

          const normalizedProperties: Property[] = user.properties.map((userProp: { propertyId: any; }) => {
  const apiProperty = propertiesData.find((p: any) => String(p.id) === String(userProp.propertyId));
  
  return {
    property_id: String(userProp.propertyId),
    id: String(userProp.propertyId),
    name: apiProperty?.name || 'Unknown',
    description: apiProperty?.description || '',
    created_at: apiProperty?.created_at || new Date().toISOString(),
    users: [],
  };
});


          const userProfile: UserProfile = {
            id: userId,
            username: credentials.username,
            email: user.email,
            profile_image: user.profile_image,
            positions: user.positions,
            properties: normalizedProperties,
            created_at: user.created_at.toISOString(),
          };

          return { ...userProfile, accessToken: tokenData.access, refreshToken: tokenData.refresh };
        } catch (error) {
          console.error('Authorize Error:', error);
          throw new Error('Unable to log in. Please check your credentials.');
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        Object.assign(token, { ...user });
      }

      return token;
    },
    async session({ session, token }) {
      session.user = token as any;
      return session;
    },
  },
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== 'production',
};

export default NextAuth(authOptions);
