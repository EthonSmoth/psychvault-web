# Prisma ↔ Database Drift Checker
# --------------------------------

Write-Host ""
Write-Host "🔍 Checking Prisma schema vs database..." -ForegroundColor Cyan

# Ensure DATABASE_URL exists
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL is not set." -ForegroundColor Red
    exit 1
}

# Temp file for diff output
$diffFile = ".\drift.sql"

# Run Prisma diff
npx prisma migrate diff `
  --from-schema-datamodel prisma/schema.prisma `
  --to-url $env:DATABASE_URL `
  --script > $diffFile

# Read result
$content = Get-Content $diffFile -Raw

# Trim whitespace
$contentTrimmed = $content.Trim()

if (-not $contentTrimmed) {
    Write-Host ""
    Write-Host "✅ No schema drift detected. Prisma matches database." -ForegroundColor Green
    Remove-Item $diffFile -ErrorAction SilentlyContinue
    exit 0
}

# Drift detected
Write-Host ""
Write-Host "⚠️ Schema drift detected!" -ForegroundColor Yellow
Write-Host "----------------------------------------"

# Highlight types of changes
if ($content -match "ADD COLUMN") {
    Write-Host "➕ Missing columns in database" -ForegroundColor Cyan
}
if ($content -match "DROP COLUMN") {
    Write-Host "❌ Extra columns in database" -ForegroundColor Red
}
if ($content -match "ALTER TABLE") {
    Write-Host "🔧 Table structure changes" -ForegroundColor Magenta
}
if ($content -match "CREATE TABLE") {
    Write-Host "🆕 Missing tables in database" -ForegroundColor Cyan
}
if ($content -match "DROP TABLE") {
    Write-Host "⚠️ Tables exist in DB but not in schema" -ForegroundColor Red
}

Write-Host ""
Write-Host "🧾 SQL required to fix:"
Write-Host "----------------------------------------"

# Output SQL diff
Write-Output $content

Write-Host ""
Write-Host "💡 Next step:"
Write-Host "Run this to apply changes safely:"
Write-Host "psql `$env:DATABASE_URL -f drift.sql" -ForegroundColor DarkGray

# Keep file for manual review
Write-Host ""
Write-Host "📄 Saved to drift.sql for review." -ForegroundColor DarkGray