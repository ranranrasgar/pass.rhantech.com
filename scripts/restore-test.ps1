# Uji pemulihan backup: restore file .dump ke database SEMENTARA, bandingkan jumlah baris
# dengan database asli, lalu hapus database sementara. Database asli tidak diubah.
# Pakai:   powershell -ExecutionPolicy Bypass -File scripts\restore-test.ps1 [-File backups\venuepass-....dump]
param(
  [string]$File,
  [string]$PgBin = "C:\laragon\bin\postgresql\postgresql-14.5-1\bin",
  [string]$TempDb = "venuepass_restore_check"
)
$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot "..\.env"
$line = Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
$url = ($line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim('"', "'", ' ') -replace '\?.*$', ''
if (-not $File) {
  $File = (Get-ChildItem (Join-Path $PSScriptRoot "..\backups") -Filter "venuepass-*.dump" | Sort-Object Name -Descending | Select-Object -First 1).FullName
}
if (-not $File -or -not (Test-Path $File)) { throw "File backup tidak ditemukan" }
$tempUrl = $url -replace '/[^/]+$', "/$TempDb"
if ($tempUrl -eq $url) { throw "Database sementara tidak boleh sama dengan database asli" }

$psql = Join-Path $PgBin "psql.exe"
$maint = $url -replace '/[^/]+$', "/postgres"
& $psql -q -d $maint -c "DROP DATABASE IF EXISTS $TempDb;" | Out-Null
& $psql -q -d $maint -c "CREATE DATABASE $TempDb;" | Out-Null
& (Join-Path $PgBin "pg_restore.exe") --no-owner --dbname="$tempUrl" "$File"
if ($LASTEXITCODE -ne 0) { throw "pg_restore gagal (kode $LASTEXITCODE)" }

$tables = "users", "events", "gates", "gate_assignments", "guests", "qr_credentials", "check_ins", "scan_logs", "import_batches", "audit_logs", "print_presets"
$ok = $true
foreach ($t in $tables) {
  $a = (& $psql -t -A -d $url -c "SELECT count(*) FROM $t;").Trim()
  $b = (& $psql -t -A -d $tempUrl -c "SELECT count(*) FROM $t;").Trim()
  $mark = if ($a -eq $b) { "OK " } else { $ok = $false; "BEDA" }
  Write-Output ("{0} {1,-18} asli={2,-6} pulih={3}" -f $mark, $t, $a, $b)
}
& $psql -q -d $maint -c "DROP DATABASE IF EXISTS $TempDb;" | Out-Null
Write-Output "File: $File"
if ($ok) { Write-Output "HASIL: pemulihan berhasil, jumlah baris cocok." } else { Write-Output "HASIL: ADA PERBEDAAN (data berubah sejak backup?)"; exit 1 }
