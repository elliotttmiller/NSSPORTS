# Agent System Setup Script
# Run this to set up the database for the new agent system

Write-Host "🚀 Setting up Agent System..." -ForegroundColor Cyan

# Navigate to nssports directory
Set-Location "C:\Users\AMD\NSSPORTS\nssports"

Write-Host "`n📦 Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

Write-Host "`n🗄️  Creating Database Migration..." -ForegroundColor Yellow
npx prisma migrate dev --name add_agent_system

Write-Host "`n✅ Agent System Setup Complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Run 'npm run dev' to start the development server" -ForegroundColor White
Write-Host "2. Navigate to /auth/login and click 'Agent Login'" -ForegroundColor White
Write-Host "3. Create an agent account first using the register page" -ForegroundColor White
