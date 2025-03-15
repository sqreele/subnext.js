// ./app/dashboard/User.tsx
'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Button } from '@/app/components/ui/button';
import { User2, LogOut } from 'lucide-react';
import { cn } from '@/app/lib/utils';

const User: React.FC = () => {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  const initials = session.user.username
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center hover:from-primary-600 hover:to-primary-800 transition-all duration-200"
        >
         {session.user.profile_image && session.user.profile_image !== '' ? (
  <img src={session.user.profile_image} alt={session.user.username} className="h-full w-full object-cover rounded-full" />
) : (
  <User2 className="h-5 w-5" />
)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 shadow-lg">
        <DropdownMenuItem className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <User2 className="h-4 w-4" />
          {session.user.username}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default User;