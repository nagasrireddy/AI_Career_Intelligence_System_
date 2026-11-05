$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location "$Root\backend"; & .\.venv\Scripts\python.exe -m pytest -q; if ($LASTEXITCODE -ne 0) { exit 1 }
Set-Location "$Root\frontend"; npm run lint; if ($LASTEXITCODE -ne 0) { exit 1 }
npm test; if ($LASTEXITCODE -ne 0) { exit 1 }
npm run build; if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "All checks passed." -ForegroundColor Green
