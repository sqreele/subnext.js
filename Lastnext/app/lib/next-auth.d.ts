// ./app/lib/next-auth.d.ts
import { Property } from '@/app/lib/types';
import type { DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    username: string;
    email: string | null;
    profile_image: string | null;
    positions: string;
    properties: Property[];
    accessToken: string;
    refreshToken?: string;
    created_at: string;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      email: string | null;
      profile_image: string | null;
      positions: string;
      properties: Property[];
      accessToken: string;
      created_at: string;
      error?: string;
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    email: string | null;
    profile_image: string | null;
    positions: string;
    accessToken: string;
    refreshToken: string;
    error?: string;
  }
}