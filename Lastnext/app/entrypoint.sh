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

# Clean old generated files
echo "🧹 Cleaning old generated files..."
rm -rf node_modules/.prisma
rm -rf .next

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