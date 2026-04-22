# Prisma <-> Supabase Drift Checker
# ---------------------------------
# Supabase DB is the source of truth.
# Drift output = what the live DB has that prisma/schema.prisma does NOT yet reflect.
# ALL fixes go in prisma/schema.prisma. NEVER apply the drift SQL to the database.
#
# Diff direction: from-schema-datamodel (Prisma) -> to-url (DB)
# Interpretation:
#   ADD COLUMN   in output = DB has a column Prisma doesnt  -> add field to schema.prisma
#   DROP COLUMN  in output = Prisma has a column DB doesnt  -> remove field from schema.prisma
#   CREATE TABLE in output = DB has a table Prisma doesnt   -> add model to schema.prisma
#   DROP TABLE   in output = Prisma has a table DB doesnt   -> remove model from schema.prisma
#   DropFK+AddFK in output = DB FK differs from Prisma      -> update @relation() in schema.prisma
#
# Uses DATABASE_URL with port switched to 5432 (session-mode pooler) because
# prisma migrate diff uses prepared statements that fail on PgBouncer transaction
# mode (port 6543), and the direct DB host (port 5432) is unreachable.

Write-Host ""
Write-Host "Checking Prisma schema vs Supabase database..." -ForegroundColor Cyan
Write-Host "(Supabase is the source of truth - fix drift in schema.prisma, never in the database)" -ForegroundColor DarkGray

# ---------- Load DATABASE_URL from .env if not already set ----------
if (-not $env:DATABASE_URL) {
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Get-Location }
    $envFile = Join-Path $scriptDir ".env"
    if (Test-Path $envFile) {
        $dbLine = Get-Content $envFile | Where-Object { $_ -match "^\s*DATABASE_URL\s*=" }
        if ($dbLine) {
            $raw = ($dbLine -replace "^\s*DATABASE_URL\s*=\s*", "").Trim()
            $env:DATABASE_URL = $raw.Trim('"').Trim("'")
        }
    }
}

if (-not $env:DATABASE_URL) {
    Write-Host "DATABASE_URL is not set and could not be loaded from .env" -ForegroundColor Red
    exit 1
}

# Switch from transaction-mode pooler (port 6543) to session-mode pooler (port 5432)
# so that Prisma prepared statements work.
$sessionUrl = $env:DATABASE_URL -replace ":6543/", ":5432/"

# ---------- Run Prisma diff ----------
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

# ---------- Parse drift into human-readable schema.prisma actions ----------
$lines = Get-Content $diffFile

$createTables = [System.Collections.Generic.List[string]]::new()
$dropTables   = [System.Collections.Generic.List[string]]::new()
$addCols      = [System.Collections.Generic.List[string]]::new()
$dropCols     = [System.Collections.Generic.List[string]]::new()
$addIndexes   = [System.Collections.Generic.List[string]]::new()
$dropIndexes  = [System.Collections.Generic.List[string]]::new()
$fkChanges    = [System.Collections.Generic.List[string]]::new()
$otherAlters  = [System.Collections.Generic.List[string]]::new()

# Collect FK drops and adds separately (Prisma outputs all DROPs first, then all ADDs)
$fkDrops = @{}
$fkAdds  = @{}
# FK action values can be two words e.g. "NO ACTION", "SET NULL", "SET DEFAULT"
$fkActionPattern = "NO ACTION|CASCADE|RESTRICT|SET NULL|SET DEFAULT"

foreach ($line in $lines) {
    if ($line -match 'CREATE TABLE [^(]*"([^"]+)"') {
        $createTables.Add($Matches[1])
    } elseif ($line -match 'DROP TABLE [^(]*"([^"]+)"') {
        $dropTables.Add($Matches[1])
    } elseif ($line -match 'ADD COLUMN "([^"]+)"') {
        $addCols.Add($Matches[1])
    } elseif ($line -match 'DROP COLUMN "([^"]+)"') {
        $dropCols.Add($Matches[1])
    } elseif ($line -match 'CREATE\s+\w*\s*INDEX\s+"([^"]+)"') {
        $addIndexes.Add($Matches[1])
    } elseif ($line -match 'DROP\s+INDEX\s+"([^"]+)"') {
        $dropIndexes.Add($Matches[1])
    } elseif ($line -match 'DROP CONSTRAINT "([^"]+_fkey)"') {
        $fkDrops[$Matches[1]] = $true
    } elseif ($line -match ('ADD CONSTRAINT "([^"]+_fkey)" FOREIGN KEY \("([^"]+)"\).*ON DELETE (' + $fkActionPattern + ') ON UPDATE (' + $fkActionPattern + ')')) {
        $fkAdds[$Matches[1]] = @{ field = $Matches[2]; onDelete = $Matches[3]; onUpdate = $Matches[4] }
    } elseif ($line -match "ALTER TABLE" -and $line -notmatch "ADD COLUMN|DROP COLUMN|ADD CONSTRAINT|DROP CONSTRAINT") {
        $otherAlters.Add($line.Trim())
    }
}

# Translate Prisma onDelete/onUpdate keyword from SQL value
function ConvertTo-PrismaAction($sqlAction) {
    switch ($sqlAction) {
        "NO ACTION" { return "NoAction" }
        "CASCADE"   { return "Cascade" }
        "RESTRICT"  { return "Restrict" }
        "SET NULL"  { return "SetNull" }
        "SET DEFAULT" { return "SetDefault" }
        default     { return $sqlAction }
    }
}

foreach ($constraintName in ($fkDrops.Keys | Sort-Object)) {
    if ($fkAdds.ContainsKey($constraintName)) {
        $info = $fkAdds[$constraintName]
        $prismaOnDelete = ConvertTo-PrismaAction $info.onDelete
        $prismaOnUpdate = ConvertTo-PrismaAction $info.onUpdate
        $fkChanges.Add("  FK     : $constraintName")
        $fkChanges.Add("  Field  : $($info.field)")
        $fkChanges.Add("  DB has : ON DELETE $($info.onDelete)  ON UPDATE $($info.onUpdate)")
        $fkChanges.Add("  Fix    : In the @relation for '$($info.field)', set onDelete: $prismaOnDelete  onUpdate: $prismaOnUpdate")
        $fkChanges.Add("           (If value is Cascade, you can omit it - Prisma defaults to Cascade)")
        $fkChanges.Add("")
    } elseif (-not $fkAdds.ContainsKey($constraintName)) {
        # FK was removed from DB entirely
        $fkChanges.Add("  FK removed in DB: $constraintName - remove the @relation reference in schema.prisma")
        $fkChanges.Add("")
    }
}
# FKs only in ADD (new FKs added to DB that Prisma doesnt know about)
foreach ($constraintName in $fkAdds.Keys) {
    if (-not $fkDrops.ContainsKey($constraintName)) {
        $info = $fkAdds[$constraintName]
        $fkChanges.Add("  New FK in DB: $constraintName (field: $($info.field))")
        $fkChanges.Add("  Add @relation for field '$($info.field)' with onDelete: $(ConvertTo-PrismaAction $info.onDelete) onUpdate: $(ConvertTo-PrismaAction $info.onUpdate)")
        $fkChanges.Add("")
    }
}

# ---------- Report drift ----------
Write-Host ""
Write-Host "Drift detected - the following changes are needed in prisma/schema.prisma:" -ForegroundColor Yellow
Write-Host "  (Supabase is source of truth. Do NOT run drift.sql against the database.)" -ForegroundColor Red
Write-Host "----------------------------------------"

if ($createTables.Count -gt 0) {
    Write-Host ""
    Write-Host "[+] DB has tables NOT in schema.prisma - add these models:" -ForegroundColor Cyan
    $createTables | ForEach-Object { Write-Host "    + $_" -ForegroundColor Cyan }
}
if ($dropTables.Count -gt 0) {
    Write-Host ""
    Write-Host "[-] schema.prisma has models the DB does NOT have - remove them:" -ForegroundColor Red
    $dropTables | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
}
if ($addCols.Count -gt 0) {
    Write-Host ""
    Write-Host "[+] DB has columns NOT in schema.prisma - add these fields:" -ForegroundColor Cyan
    $addCols | ForEach-Object { Write-Host "    + $_" -ForegroundColor Cyan }
}
if ($dropCols.Count -gt 0) {
    Write-Host ""
    Write-Host "[-] schema.prisma has fields the DB does NOT have - remove them:" -ForegroundColor Red
    $dropCols | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
}
if ($fkChanges.Count -gt 0) {
    Write-Host ""
    Write-Host "[~] FK constraints differ - update @relation() in schema.prisma:" -ForegroundColor Magenta
    $fkChanges | ForEach-Object { Write-Host "    $_" -ForegroundColor Magenta }
}
if ($addIndexes.Count -gt 0) {
    Write-Host ""
    Write-Host "[+] DB has indexes NOT in schema.prisma - add @@index() to relevant models:" -ForegroundColor Cyan
    $addIndexes | ForEach-Object { Write-Host "    + @@index: $_" -ForegroundColor Cyan }
}
if ($dropIndexes.Count -gt 0) {
    Write-Host ""
    Write-Host "[-] schema.prisma has @@index entries the DB does NOT have - remove them:" -ForegroundColor Red
    $dropIndexes | ForEach-Object { Write-Host "    - @@index: $_" -ForegroundColor Red }
}
if ($otherAlters.Count -gt 0) {
    Write-Host ""
    Write-Host "[~] Other ALTER TABLE differences (types, defaults, constraints):" -ForegroundColor Magenta
    $otherAlters | ForEach-Object { Write-Host "    $_" -ForegroundColor Magenta }
}

Write-Host ""
Write-Host "----------------------------------------"
Write-Host "Next steps (edit schema.prisma to match DB - do NOT touch the database):" -ForegroundColor Yellow
Write-Host "  1. Edit prisma/schema.prisma to reflect the DB state shown above" -ForegroundColor White
Write-Host "  2. Run: npm run db:generate" -ForegroundColor White
Write-Host "  3. Run this script again to confirm zero drift" -ForegroundColor White
Write-Host ""
Write-Host "Raw diff saved to drift.sql for reference (do NOT apply it to the database)." -ForegroundColor DarkGray