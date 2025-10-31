# Admin Dashboard Setup Script
# This script creates the database schema and initial admin user

Write-Host "🚀 Setting up Admin Dashboard System..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Generate Prisma Client
Write-Host "📦 Generating Prisma Client with new models..." -ForegroundColor Yellow
cd nssports
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prisma client generated successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Create Migration
Write-Host "📝 Creating database migration..." -ForegroundColor Yellow
npx prisma migrate dev --name add_admin_system --create-only

Write-Host "✅ Migration created" -ForegroundColor Green
Write-Host ""

# Step 3: Apply Migration
Write-Host "🔄 Applying migration to database..." -ForegroundColor Yellow
npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to apply migration" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database schema updated" -ForegroundColor Green
Write-Host ""

# Step 4: Create initial admin user
Write-Host "👤 Creating initial admin user..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Default Admin Credentials:" -ForegroundColor Cyan
Write-Host "Username: admin" -ForegroundColor White
Write-Host "Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Change this password immediately after first login!" -ForegroundColor Red
Write-Host ""

# Create a seed script for initial admin
$seedScript = @"
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createInitialAdmin() {
  try {
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { username: 'admin' },
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    await prisma.adminUser.create({
      data: {
        username: 'admin',
        email: 'admin@northstarsports.com',
        password: hashedPassword,
        role: 'superadmin',
        status: 'active',
      },
    });

    console.log('✅ Initial admin user created successfully');
    console.log('   Username: admin');
    console.log('   Password: Admin123!');
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  } finally {
    await prisma.`$disconnect();
  }
}

createInitialAdmin();
"@

$seedScript | Out-File -FilePath "prisma/seed-admin.js" -Encoding UTF8

node prisma/seed-admin.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create initial admin" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Admin Dashboard setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access the admin dashboard at:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000/admin/login" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Login with:" -ForegroundColor Cyan
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: Admin123!" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Remember to change the default password!" -ForegroundColor Red
Write-Host ""
