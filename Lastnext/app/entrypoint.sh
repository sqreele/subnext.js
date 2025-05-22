#!/bin/sh
set -e

echo "🚀 Complete Setup: Next.js + Prisma + NextAuth"
echo "================================================"

# Detect platform for optimal binary targets
detect_platform() {
    case "$(uname -s)" in
        Linux*)
            if [ -f /etc/alpine-release ]; then
                echo "linux-musl-openssl-3.0.x"
            else
                echo "debian-openssl-3.0.x"
            fi
            ;;
        Darwin*)
            case "$(uname -m)" in
                arm64) echo "darwin-arm64" ;;
                *) echo "darwin" ;;
            esac
            ;;
        *) echo "debian-openssl-3.0.x" ;;
    esac
}

PLATFORM=$(detect_platform)
echo "🔍 Detected platform: $PLATFORM"

# Function to create or update schema with proper binary targets
create_unified_schema() {
    echo "📝 Creating unified Prisma schema..."
    
    mkdir -p prisma
    
    cat > prisma/schema.prisma << EOF
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x", "debian-openssl-3.0.x", "linux-arm64-openssl-3.0.x", "darwin", "darwin-arm64"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// NextAuth.js Models
model Account {
  id                 String   @id @default(uuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?  @db.Text
  access_token       String?  @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?  @db.Text
  session_state      String?
  
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// Application Models
model User {
  id            String     @id @default(uuid())
  username      String     @unique
  email         String?    @unique
  emailVerified DateTime?  @map("email_verified")
  name          String?
  image         String?
  profile_image String?
  positions     String     @default("User")
  created_at    DateTime   @default(now())
  accessToken   String?
  refreshToken  String?
  sessionToken  String?
  
  // NextAuth Relations
  accounts       Account[]
  sessions       Session[]
  
  // Application Relations
  userProperties UserProperty[]
  
  @@map("users")
}

model Property {
  id            String     @id @default(uuid())
  name          String
  description   String?
  created_at    DateTime   @default(now())
  
  userProperties UserProperty[]
  
  @@map("properties")
}

model UserProperty {
  userId     String
  propertyId String
  createdAt  DateTime @default(now())
  
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  property   Property  @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@id([userId, propertyId])
  @@map("user_properties")
}
EOF
    
    echo "✅ Unified schema created with comprehensive binary targets"
}

# Function to update existing schema with binary targets
update_binary_targets() {
    local schema_file="$1"
    
    if [ ! -f "$schema_file" ]; then
        echo "❌ Schema file $schema_file not found!"
        return 1
    fi
    
    echo "🔧 Updating binary targets for $schema_file..."
    
    if grep -q "binaryTargets" "$schema_file"; then
        echo "✅ Binary targets already configured in $schema_file"
    else
        # Create backup
        cp "$schema_file" "$schema_file.backup"
        
        # Add comprehensive binary targets
        sed -i.tmp '/generator client {/,/}/ {
            /provider/a\
  binaryTargets = ["native", "linux-musl-openssl-3.0.x", "debian-openssl-3.0.x", "linux-arm64-openssl-3.0.x", "darwin", "darwin-arm64"]
        }' "$schema_file"
        
        rm -f "$schema_file.tmp"
        echo "✅ Binary targets added to $schema_file"
    fi
}

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check and install missing dependencies
echo "🔍 Checking for missing dependencies..."

# Function to install dependency if not present
install_if_missing() {
    local package="$1"
    local dev="$2"
    
    if ! npm list "$package" > /dev/null 2>&1; then
        echo "📦 Installing missing dependency: $package"
        if [ "$dev" = "dev" ]; then
            npm install --save-dev "$package"
        else
            npm install "$package"
        fi
    else
        echo "✅ $package already installed"
    fi
}

# Install essential dependencies
install_if_missing "tailwindcss" "dev"
install_if_missing "autoprefixer" "dev"
install_if_missing "postcss" "dev"
install_if_missing "@types/node" "dev"
install_if_missing "@types/react" "dev"
install_if_missing "@types/react-dom" "dev"
install_if_missing "typescript" "dev"

# Install runtime dependencies if missing
install_if_missing "next"
install_if_missing "react"
install_if_missing "react-dom"
install_if_missing "@prisma/client"
install_if_missing "prisma" "dev"
install_if_missing "next-auth"

# Create missing config files
create_config_files() {
    echo "📝 Creating missing configuration files..."
    
    # Create tailwind.config.js
    if [ ! -f "tailwind.config.js" ] && [ ! -f "tailwind.config.ts" ]; then
        echo "📝 Creating tailwind.config.js..."
        cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
}
EOF
        echo "✅ tailwind.config.js created"
    fi
    
    # Create postcss.config.js
    if [ ! -f "postcss.config.js" ] && [ ! -f "postcss.config.mjs" ]; then
        echo "📝 Creating postcss.config.js..."
        cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
        echo "✅ postcss.config.js created"
    fi
    
    # Create tsconfig.json if missing
    if [ ! -f "tsconfig.json" ]; then
        echo "📝 Creating tsconfig.json..."
        cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
        echo "✅ tsconfig.json created"
    fi
    
    # Create next.config.js if missing
    if [ ! -f "next.config.js" ] && [ ! -f "next.config.mjs" ]; then
        echo "📝 Creating next.config.js..."
        cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig
EOF
        echo "✅ next.config.js created"
    fi
}

create_config_files

# Create missing directory structure and placeholder files
create_missing_structure() {
    echo "📂 Creating missing directory structure..."
    
    # Create essential directories
    mkdir -p app/components/profile
    mkdir -p app/lib
    mkdir -p app/dashboard/Preventive_maintenance
    mkdir -p app/dashboard/preventive-maintenance
    mkdir -p app/api/health
    mkdir -p app/auth/register
    
    # Create missing context files
    if [ ! -f "app/lib/PropertyContext.tsx" ] && [ ! -f "app/lib/PropertyContext.js" ]; then
        echo "📝 Creating PropertyContext..."
        cat > app/lib/PropertyContext.tsx << 'EOF'
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Property {
  id: string;
  property_id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface PropertyContextType {
  selectedProperty: string | null;
  userProperties: Property[];
  setSelectedProperty: (propertyId: string | null) => void;
  setUserProperties: (properties: Property[]) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: React.ReactNode }) {
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [userProperties, setUserProperties] = useState<Property[]>([]);

  return (
    <PropertyContext.Provider
      value={{
        selectedProperty,
        userProperties,
        setSelectedProperty,
        setUserProperties,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
}
EOF
        echo "✅ PropertyContext created"
    fi
    
    # Create missing user-context
    if [ ! -f "app/lib/user-context.tsx" ] && [ ! -f "app/lib/user-context.js" ]; then
        echo "📝 Creating user-context..."
        cat > app/lib/user-context.tsx << 'EOF'
'use client';

import React, { createContext, useContext, useState } from 'react';

interface User {
  id: string;
  username: string;
  email?: string;
  name?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
EOF
        echo "✅ user-context created"
    fi
    
    # Create missing RegisterForm component
    if [ ! -f "app/components/profile/RegisterForm.tsx" ] && [ ! -f "app/components/profile/RegisterForm.js" ]; then
        echo "📝 Creating RegisterForm component..."
        cat > app/components/profile/RegisterForm.tsx << 'EOF'
'use client';

import { useState } from 'react';

interface RegisterFormProps {
  onSubmit?: (data: any) => void;
}

export default function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Register
        </button>
      </form>
    </div>
  );
}
EOF
        echo "✅ RegisterForm component created"
    fi
    
    # Create missing PreventiveMaintenanceDashboard
    if [ ! -f "app/dashboard/Preventive_maintenance/PreventiveMaintenanceDashboard.tsx" ] && [ ! -f "app/dashboard/Preventive_maintenance/PreventiveMaintenanceDashboard.js" ]; then
        echo "📝 Creating PreventiveMaintenanceDashboard..."
        cat > app/dashboard/Preventive_maintenance/PreventiveMaintenanceDashboard.tsx << 'EOF'
'use client';

import { useEffect, useState } from 'react';

interface MaintenanceItem {
  id: string;
  title: string;
  scheduled_date: string;
  status: string;
}

export default function PreventiveMaintenanceDashboard() {
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setMaintenanceItems([
        {
          id: '1',
          title: 'Sample Maintenance Task',
          scheduled_date: new Date().toISOString(),
          status: 'pending'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading preventive maintenance dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Preventive Maintenance Dashboard</h1>
      
      <div className="grid gap-4">
        {maintenanceItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No maintenance items found
          </div>
        ) : (
          maintenanceItems.map(item => (
            <div key={item.id} className="border rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-gray-600">
                Scheduled: {new Date(item.scheduled_date).toLocaleDateString()}
              </p>
              <span className={`inline-block px-2 py-1 rounded text-xs ${
                item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                {item.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
EOF
        echo "✅ PreventiveMaintenanceDashboard component created"
    fi
    
    # Create globals.css if missing
    if [ ! -f "app/globals.css" ]; then
        echo "📝 Creating globals.css..."
        cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
EOF
        echo "✅ globals.css created"
    fi
}

# Clean old generated files
echo "🧹 Cleaning old generated files..."
rm -rf node_modules/.prisma
rm -rf .next

# Create missing structure before Prisma operations
create_missing_structure

# Handle schema files intelligently
if [ -f "./prisma/auth.prisma" ] && [ ! -f "./prisma/schema.prisma" ]; then
    echo "📄 Found auth.prisma only - updating it..."
    
    update_binary_targets "./prisma/auth.prisma"
    
    echo "⚙️  Generating Prisma client for auth schema..."
    npx prisma generate --schema=./prisma/auth.prisma
    
    echo "🗄️  Creating NextAuth tables in database..."
    npx prisma db push --schema=./prisma/auth.prisma --accept-data-loss
    
elif [ -f "./prisma/auth.prisma" ] && [ -f "./prisma/schema.prisma" ]; then
    echo "📄 Found both schemas - handling separately..."
    
    update_binary_targets "./prisma/auth.prisma"
    update_binary_targets "./prisma/schema.prisma"
    
    echo "⚙️  Generating Prisma client for auth schema..."
    npx prisma generate --schema=./prisma/auth.prisma
    
    echo "⚙️  Generating Prisma client for main schema..."
    npx prisma generate --schema=./prisma/schema.prisma
    
    echo "🗄️  Creating NextAuth tables..."
    npx prisma db push --schema=./prisma/auth.prisma --accept-data-loss
    
    echo "🗄️  Creating application tables..."
    npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss
    
elif [ -f "./prisma/schema.prisma" ]; then
    echo "📄 Found unified schema.prisma..."
    
    update_binary_targets "./prisma/schema.prisma"
    
    echo "⚙️  Generating Prisma client..."
    npx prisma generate
    
    echo "🗄️  Creating all tables in database..."
    npx prisma db push --accept-data-loss
    
else
    echo "📄 No schema found - creating unified schema..."
    create_unified_schema
    
    echo "⚙️  Generating Prisma client..."
    npx prisma generate
    
    echo "🗄️  Creating all tables in database..."
    npx prisma db push --accept-data-loss
fi

# Verify Prisma setup
echo "✅ Verifying Prisma setup..."
if [ -f "./prisma/auth.prisma" ]; then
    npx prisma validate --schema=./prisma/auth.prisma
fi

if [ -f "./prisma/schema.prisma" ]; then
    npx prisma validate --schema=./prisma/schema.prisma
fi

# Create health check endpoint
create_health_endpoint() {
    if [ ! -f "pages/api/health.js" ] && [ ! -f "app/api/health/route.js" ]; then
        echo "🏥 Creating health check endpoint..."
        
        if [ -d "app" ] || [ -f "app/layout.js" ] || [ -f "app/layout.tsx" ]; then
            # Next.js 13+ App Router
            mkdir -p app/api/health
            cat > app/api/health/route.js << 'EOF'
export async function GET() {
  try {
    // Test database connection if Prisma is available
    let dbStatus = 'unknown';
    try {
      if (typeof require !== 'undefined') {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
        await prisma.$disconnect();
      }
    } catch (e) {
      dbStatus = 'disconnected';
    }
    
    return Response.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    return Response.json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: error.message 
    }, { status: 500 });
  }
}
EOF
        else
            # Next.js Pages Router
            mkdir -p pages/api
            cat > pages/api/health.js << 'EOF'
export default async function handler(req, res) {
  try {
    // Test database connection if Prisma is available
    let dbStatus = 'unknown';
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
      await prisma.$disconnect();
    } catch (e) {
      dbStatus = 'disconnected';
    }
    
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: error.message 
    });
  }
}
EOF
        fi
        echo "✅ Health check endpoint created"
    else
        echo "✅ Health check endpoint already exists"
    fi
}

create_health_endpoint

# Create .env.example if it doesn't exist
if [ ! -f ".env.example" ]; then
    echo "📝 Creating .env.example..."
    cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
JWT_SECRET="your-jwt-secret-here"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# API URLs
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PRIVATE_API_URL="http://localhost:8000"
API_URL="http://localhost:8000"
EOF
    echo "✅ .env.example created"
fi

# Build for production if NODE_ENV is set
if [ "$NODE_ENV" = "production" ]; then
    echo "🏗️  Building application for production..."
    npm run build
else
    echo "💡 Skipping build (development mode)"
fi

# Display platform-specific information
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📊 Summary:"
echo "  ✅ Platform: $PLATFORM"
echo "  ✅ Dependencies installed"
echo "  ✅ Prisma client generated with platform-specific binaries"
echo "  ✅ Database schema applied"
echo "  ✅ Health check endpoint created"
if [ "$NODE_ENV" = "production" ]; then
    echo "  ✅ Production build completed"
fi
echo ""
echo "🔗 Useful commands:"
echo "  • Check health: curl http://localhost:3000/api/health"
echo "  • View database: npx prisma studio"
echo "  • Reset database: npx prisma db push --force-reset"
echo "  • Generate client: npx prisma generate"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "   Please copy .env.example to .env and configure your environment variables"
    echo ""
fi

echo "🚀 Starting Next.js application..."

# Start the application
exec npm start