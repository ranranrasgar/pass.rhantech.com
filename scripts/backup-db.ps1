# Backup database VenuePass (PostgreSQL) ke folder backups\ dengan rotasi.
# Pakai:   powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1
# Opsi:    -Keep 30   (jumlah file backup yang disimpan, default 14)
#          -PgBin "C:\laragon\bin\postgresql\postgresql-14.5-1\bin"
# DATABASE_URL dibaca dari .env (tidak pernah ditampilkan).
param(
  [int]$Keep = 14,
  [string]$PgBin = "C:\laragon\bin\postgresql\postgresql-14.5-1\bin",
  [string]$OutDir = (Join-Path $PSScriptRoot "..\backups")
)
$ErrorActionPreference = "Stop"

function Get-DatabaseUrl {
  $envFile = Join-Path $PSScriptRoot "..\.env"
  $line = Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
  if (-not $line) { throw "DATABASE_URL tidak ditemukan di .env" }
  return ($line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim('"', "'", ' ') -replace '\?.*$', ''
}

$url = Get-DatabaseUrl
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $OutDir "venuepass-$stamp.dump"

& (Join-Path $PgBin "pg_dump.exe") --format=custom --no-owner --file="$file" --dbname="$url"
if ($LASTEXITCODE -ne 0) { throw "pg_dump gagal (kode $LASTEXITCODE)" }

$size = [math]::Round((Get-Item $file).Length / 1KB, 1)
Write-Output "Backup dibuat: $file ($size KB)"

# Rotasi: simpan $Keep file terbaru.
Get-ChildItem $OutDir -Filter "venuepass-*.dump" | Sort-Object Name -Descending | Select-Object -Skip $Keep |
  ForEach-Object { Remove-Item $_.FullName -Confirm:$false; Write-Output "Dihapus (rotasi): $($_.Name)" }
