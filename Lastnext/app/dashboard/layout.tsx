'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { signOut } from 'next-auth/react';
import {
  Home,
  LineChart,
  Package,
  Package2,
  PanelLeft,
  Settings,
  ShoppingCart,
  Users2,
  Search,
  Menu,
  LogOut,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/app/components/ui/breadcrumb';
import { Button } from '@/app/components/ui/button';
import HeaderPropertyList from '@/app/components/jobs/HeaderPropertyList';
import User from '@/app/dashboard/user';
import { Sheet, SheetContent, SheetTrigger } from '@/app/components/ui/sheet';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';
import { PlusCircle } from 'lucide-react';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/myJobs', label: 'My Jobs', icon: ShoppingCart },
  { href: '/dashboard/chartdashboad', label: 'Charts', icon: Package },
  { href: '/dashboard/profile', label: 'Profile', icon: Users2 },
  { href: '/dashboard/createJob', label: 'Create Job', icon: PlusCircle },
  { href: '/analytics', label: 'Analytics', icon: LineChart },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
      <DesktopNav />
      <div className="flex flex-1 flex-col">
        <MobileHeader />
        <DesktopHeader />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function DesktopNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-[240px] flex-col border-r bg-white shadow-lg">
      <div className="p-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <Package2 className="h-6 w-6 text-blue-600 group-hover:text-blue-700 transition-colors" />
          <span className="font-semibold text-lg text-gray-800 group-hover:text-blue-700 transition-colors">
            Admin Panel
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ease-in-out',
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t">
        <User />
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 text-sm h-10 bg-white text-red-500 border-gray-300 hover:bg-red-50 mt-4" 
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}

// Optimized Mobile Header Component
function MobileHeader() {
  return (
    <header className="lg:hidden sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between h-14 px-3">
        <div className="flex items-center gap-3">
          <MobileNav />
          <Link href="/dashboard" className="flex items-center gap-2">
            <Package2 className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Admin</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <MobileSearch />
          {/* User component moved to the mobile menu */}
        </div>
      </div>
      
      {/* Property selector row */}
      <div className="flex items-center px-3 py-2 border-t border-gray-100">
        <HeaderPropertyList />
      </div>
      
      {/* Mobile Breadcrumb */}
      <div className="px-3 py-2 border-t border-gray-100 overflow-x-auto scrollbar-none">
        <MobileBreadcrumb />
      </div>
    </header>
  );
}

// Desktop Header Component
function DesktopHeader() {
  return (
    <header className="hidden lg:flex sticky top-0 z-50 h-16 items-center border-b bg-white/95 backdrop-blur-sm px-6 shadow-sm">
      <div className="flex items-center flex-1 gap-4">
        <DashboardBreadcrumb />
      </div>
      <div className="flex items-center gap-4">
        <SearchInput />
        <HeaderPropertyList />
        {/* User component not needed here since it's shown in the sidebar */}
      </div>
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Menu className="h-5 w-5 text-gray-600" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 border-r bg-white flex flex-col">
        {/* Brand/Logo Section */}
        <div className="p-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <Package2 className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Admin Panel</span>
          </Link>
        </div>
        
        {/* User Profile Section at the top of mobile menu */}
        <div className="p-4 border-b bg-gray-50">
          <div className="touch-manipulation">
            <User />
          </div>
        </div>
        
        {/* Navigation Links */}
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid gap-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all duration-200 ease-in-out',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* Footer with logout option */}
        <div className="mt-auto p-4 border-t">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-sm h-10 bg-white text-red-500 border-gray-300 hover:bg-red-50" 
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: '/auth/signin' })
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Updated SearchInput with search functionality
function SearchInput() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  function searchAction(formData: FormData) {
    const value = formData.get('q');
    
    // Don't trigger search for empty queries
    if (!value || (typeof value === 'string' && value.trim() === '')) return;
    
    // Make sure we're passing a string to URLSearchParams
    const searchValue = typeof value === 'string' ? value : String(value);
    const params = new URLSearchParams({ q: searchValue });
    
    startTransition(() => {
      // Navigate to the search page
      router.push(`/dashboard/search?${params.toString()}`);
    });
  }

  return (
    <form action={searchAction} className="w-[300px] relative">
      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
      <Input
        name="q"
        type="search"
        placeholder="Search jobs, properties..."
        className="w-full pl-9 bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 rounded-full h-10 text-sm"
      />
      {isPending && (
        <div className="absolute right-3 top-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      )}
    </form>
  );
}

// Updated mobile search with search functionality
function MobileSearch() {
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  function searchAction(formData: FormData) {
    const value = formData.get('q');
    
    // Check if value is a string before using trim
    if (!value || (typeof value === 'string' && value.trim() === '')) return;
    
    // Make sure we're passing a string
    const searchValue = typeof value === 'string' ? value : String(value);
    const params = new URLSearchParams({ q: searchValue });
    
    startTransition(() => {
      router.push(`/dashboard/search?${params.toString()}`);
      setIsOpen(false);
    });
  }
  
  return (
    <>
      {!isOpen ? (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9" 
          onClick={() => setIsOpen(true)}
        >
          <Search className="h-5 w-5 text-gray-600" />
          <span className="sr-only">Search</span>
        </Button>
      ) : (
        <div className="fixed inset-0 z-50 bg-white/95 p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9" 
              onClick={() => setIsOpen(false)}
            >
              <PanelLeft className="h-5 w-5 text-gray-600" />
            </Button>
            <span className="font-medium text-gray-800">Search</span>
          </div>
          
          <form action={searchAction} className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input
              name="q"
              type="search"
              placeholder="Search jobs, properties..."
              autoFocus
              className="w-full pl-9 bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 rounded-full h-10 text-sm"
            />
            {isPending && (
              <div className="absolute right-3 top-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              </div>
            )}
          </form>
        </div>
      )}
    </>
  );
}

// Desktop breadcrumb
function DashboardBreadcrumb() {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
            Dashboard
          </BreadcrumbLink>
        </BreadcrumbItem>
        {paths.map((path, index) => {
          const href = `/${paths.slice(0, index + 1).join('/')}`;
          const isLast = index === paths.length - 1;
          const label = path.charAt(0).toUpperCase() + path.slice(1);

          return (
            <React.Fragment key={path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-sm text-gray-800 font-semibold">{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href} className="text-sm text-gray-500 hover:text-gray-800">
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// Mobile breadcrumb (more compact)
function MobileBreadcrumb() {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  return (
    <div className="flex items-center whitespace-nowrap text-xs">
      <Link href="/dashboard" className="text-gray-500">
        Dashboard
      </Link>
      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join('/')}`;
        const isLast = index === paths.length - 1;
        const label = path.charAt(0).toUpperCase() + path.slice(1);

        return (
          <React.Fragment key={path}>
            <span className="mx-1.5 text-gray-400">/</span>
            {isLast ? (
              <span className="font-medium text-gray-800">{label}</span>
            ) : (
              <Link href={href} className="text-gray-500">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
