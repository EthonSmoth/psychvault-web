# Prisma <-> Supabase Drift Checker
# ---------------------------------
# Supabase DB is the source of truth.
# This script detects when prisma/schema.prisma has drifted from the live database
# so you know what to update in the Prisma schema.
#
# Uses DATABASE_URL with port switched to 5432 (session-mode pooler) because
# prisma migrate diff uses prepared statements that fail on PgBouncer transaction
# mode (port 6543), and the direct DB host (port 5432) is unreachable.

Write-Host ""
Write-Host "Checking Prisma schema vs Supabase database..." -ForegroundColor Cyan

# ---------- Load DATABASE_URL from .env if not already set ----------
if (-not $env:DATABASE_URL) {
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Get-Location }
    $envFile = Join-Path $scriptDir ".env"
    if (Test-Path $envFile) {
        $dbLine = Get-Content $envFile | Where-Object { $_ -match "^\s*DATABASE_URL\s*=" }
        if ($dbLine) {
            $env:DATABASE_URL = ($dbLine -replace '^\s*DATABASE_URL\s*=\s*', '').Trim('"', "'", ' ')
        }
    }
}

if (-not $env:DATABASE_URL) {
    Write-Host "DATABASE_URL is not set and could not be loaded from .env" -ForegroundColor Red
    exit 1
}

# Switch from transaction-mode pooler (port 6543) to session-mode pooler (port 5432)
# so that Prisma's prepared statements work.
$sessionUrl = $env:DATABASE_URL -replace ':6543/', ':5432/'

# ---------- Run Prisma diff ----------
# Direction: from Prisma schema -> to live DB
# The output SQL describes what the DB has that Prisma doesn't (and vice-versa).
$baseDir = if ($PSScriptRoot) { $PSScriptRoot } else { Get-Location }
$diffFile = Join-Path $baseDir "drift.sql"

npx prisma migrate diff `
  --from-schema-datamodel prisma/schema.prisma `
  --to-url $sessionUrl `
  --script 2>$null > $diffFile

if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 2) {
    Write-Host "prisma migrate diff failed (exit code $LASTEXITCODE). Check your DATABASE_URL and network." -ForegroundColor Red
    Remove-Item $diffFile -ErrorAction SilentlyContinue
    exit 1
}

$content = if (Test-Path $diffFile) { (Get-Content $diffFile -Raw).Trim() } else { "" }

if (-not $content -or $content -eq "--" -or $content -eq "-- This is an empty migration.") {
    Write-Host ""
    Write-Host "No drift detected. Prisma schema matches the database." -ForegroundColor Green
    Remove-Item $diffFile -ErrorAction SilentlyContinue
    exit 0
}

# ---------- Report drift ----------
Write-Host ""
Write-Host "Drift detected between prisma/schema.prisma and the live database!" -ForegroundColor Yellow
Write-Host "----------------------------------------"

# Labels are from the Prisma-schema perspective:
#   ADD COLUMN  = DB has a column that Prisma doesn't  -> add it to schema.prisma
#   DROP COLUMN = Prisma has a column the DB doesn't   -> remove it from schema.prisma
#   CREATE TABLE = DB has a table Prisma doesn't       -> add model to schema.prisma
#   DROP TABLE   = Prisma has a table the DB doesn't   -> remove model from schema.prisma

if ($content -match "ADD COLUMN") {
    Write-Host "[+] Database has columns not yet in Prisma schema" -ForegroundColor Cyan
}
if ($content -match "DROP COLUMN") {
    Write-Host "[-] Prisma schema has columns the database does not" -ForegroundColor Red
}
if ($content -match "CREATE TABLE") {
    Write-Host "[+] Database has tables not yet in Prisma schema" -ForegroundColor Cyan
}
if ($content -match "DROP TABLE") {
    Write-Host "[-] Prisma schema has tables the database does not" -ForegroundColor Red
}
if ($content -match "CREATE.+INDEX|DROP.+INDEX") {
    Write-Host "[~] Index differences" -ForegroundColor Magenta
}
if ($content -match "ALTER TABLE" -and $content -notmatch "ADD COLUMN|DROP COLUMN") {
    Write-Host '[~] Other table structure changes - constraints, defaults, types' -ForegroundColor Magenta
}

Write-Host ""
Write-Host "SQL that describes the drift (Prisma -> DB):" -ForegroundColor DarkGray
Write-Host "----------------------------------------"
Write-Output $content

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update prisma/schema.prisma to match the live database" -ForegroundColor White
Write-Host "  2. Run: npm run db:generate" -ForegroundColor White
Write-Host "  3. Run this script again to confirm zero drift" -ForegroundColor White
Write-Host ""
Write-Host "DO NOT run drift.sql against the database -- Supabase is the source of truth." -ForegroundColor Red
Write-Host ""
Write-Host 'Diff saved to drift.sql for reference.' -ForegroundColor DarkGray