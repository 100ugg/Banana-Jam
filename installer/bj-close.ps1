# Banana Jam setup: closes Banana Jam (and its game window) if they are running.
#
# Only programs that run from Banana Jam's own folders are closed, so a
# Strawberry Jam (or any other) install on the same PC is never touched.
$ErrorActionPreference = 'SilentlyContinue'

$programs = Join-Path $env:LOCALAPPDATA 'Programs'
$mine = @((Join-Path $programs 'bananajam'), (Join-Path $programs 'bananajam-classic'))

Get-CimInstance Win32_Process | Where-Object {
  $path = $_.ExecutablePath
  $path -and ($mine | Where-Object { $path.StartsWith($_ + '\', [System.StringComparison]::OrdinalIgnoreCase) })
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
