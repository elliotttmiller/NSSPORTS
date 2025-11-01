<#
.SYNOPSIS
    Fix Next.js 15 Turbopack chunk loading errors

.DESCRIPTION
    This script resolves "Failed to load chunk" errors by:
    1. Stopping all Next.js dev servers
    2. Cleaning build artifacts and cache
    3. Clearing Turbopack cache
    4. Regenerating Prisma client
    5. Restarting the dev server

.NOTES
    Run this script when encountering chunk loading errors
#>

Write-Host "🔧 Fixing Next.js Turbopack Chunk Loading Errors..." -ForegroundColor Cyan
Write-Host ""

# Change to nssports directory
Set-Location "C:\Users\AMD\NSSPORTS\nssports"

# Step 1: Kill all Node processes (Next.js dev servers)
Write-Host "1️⃣ Stopping all Node.js processes..." -ForegroundColor Yellow
try {
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "   ✅ Node processes stopped" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ No Node processes to stop" -ForegroundColor Gray
}

# Step 2: Clean .next directory
Write-Host ""
Write-Host "2️⃣ Cleaning .next build directory..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Write-Host "   ✅ .next directory removed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ .next directory not found" -ForegroundColor Gray
}

# Step 3: Clean Turbopack cache
Write-Host ""
Write-Host "3️⃣ Cleaning Turbopack cache..." -ForegroundColor Yellow
if (Test-Path ".next\cache") {
    Remove-Item -Recurse -Force ".next\cache" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Turbopack cache cleared" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Turbopack cache not found" -ForegroundColor Gray
}

# Step 4: Clean node_modules/.cache
Write-Host ""
Write-Host "4️⃣ Cleaning node_modules cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "   ✅ node_modules cache cleared" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ node_modules cache not found" -ForegroundColor Gray
}

# Step 5: Regenerate Prisma client
Write-Host ""
Write-Host "5️⃣ Regenerating Prisma client..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Prisma client regenerated" -ForegroundColor Green
} else {
    Write-Host "   ❌ Prisma generation failed" -ForegroundColor Red
}

# Step 6: Clear browser storage instructions
Write-Host ""
Write-Host "6️⃣ Browser Cache Instructions:" -ForegroundColor Yellow
Write-Host "   📋 In your browser, press:" -ForegroundColor White
Write-Host "      • Ctrl + Shift + Delete (Open Clear Browsing Data)" -ForegroundColor Cyan
Write-Host "      • Select 'Cached images and files'" -ForegroundColor Cyan
Write-Host "      • Click 'Clear data'" -ForegroundColor Cyan
Write-Host ""
Write-Host "   OR perform a hard refresh:" -ForegroundColor White
Write-Host "      • Ctrl + F5 (Windows)" -ForegroundColor Cyan
Write-Host "      • Ctrl + Shift + R (Alternative)" -ForegroundColor Cyan

# Step 7: Restart dev server
Write-Host ""
Write-Host "7️⃣ Restarting development server..." -ForegroundColor Yellow
Write-Host "   🚀 Starting Next.js with Turbopack..." -ForegroundColor Cyan
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Green
Write-Host "   1. The dev server will start automatically" -ForegroundColor White
Write-Host "   2. Wait for compilation to complete" -ForegroundColor White
Write-Host "   3. Hard refresh your browser (Ctrl + F5)" -ForegroundColor White
Write-Host "   4. If error persists, close browser completely and reopen" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Start the dev server
npm run dev
