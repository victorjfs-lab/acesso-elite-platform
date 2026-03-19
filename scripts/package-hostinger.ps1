$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot "dist"
$zipPath = Join-Path $projectRoot "course-platform-hostinger.zip"

if (-not (Test-Path $distPath)) {
  throw "A pasta dist nao existe. Rode 'npm run build' antes de empacotar."
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

$items = Get-ChildItem -LiteralPath $distPath -Force
if ($items.Count -eq 0) {
  throw "A pasta dist esta vazia. Rode 'npm run build' antes de empacotar."
}

Compress-Archive -Path $items.FullName -DestinationPath $zipPath -Force
Write-Output $zipPath
