# One-time setup for Windows 10/11 (PowerShell 5.1+). Run:  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# --- find Python (py launcher, python, python3) ---
$py = $null
foreach ($c in @("py", "python", "python3")) {
  if (Get-Command $c -ErrorAction SilentlyContinue) {
    & $c -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" 2>$null
    if ($LASTEXITCODE -eq 0) { $py = $c; break }
  }
}
if (-not $py) { Fail "Python 3.10+ not found. Install it from https://www.python.org/downloads/ and tick 'Add python.exe to PATH', then re-run." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js not found. Install the LTS version from https://nodejs.org/ and re-run." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail "npm not found. It is installed with Node.js: https://nodejs.org/" }
$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 18) { Fail "Node.js 18+ required (found $nodeMajor)." }

Write-Host "==> Backend setup" -ForegroundColor Cyan
Set-Location "$Root\backend"
if (-not (Test-Path ".venv")) { & $py -m venv .venv; if ($LASTEXITCODE -ne 0) { Fail "Could not create virtual environment." } }
$venvPy = ".\.venv\Scripts\python.exe"
& $venvPy -m pip install --upgrade pip | Out-Null
& $venvPy -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { Fail "Dependency installation failed. See troubleshooting in README.md." }
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  $key = & $venvPy -c "import secrets; print(secrets.token_urlsafe(48))"
  (Get-Content ".env") -replace "^SECRET_KEY=.*", "SECRET_KEY=$key" | Set-Content ".env"
  Write-Host "Created backend\.env with a freshly generated SECRET_KEY"
}
New-Item -ItemType Directory -Force -Path "data\uploads" | Out-Null
& $venvPy -m app.db.seed
if ($LASTEXITCODE -ne 0) { Fail "Database initialisation failed." }

Write-Host "==> Frontend setup" -ForegroundColor Cyan
Set-Location "$Root\frontend"
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }

Write-Host ""
Write-Host "Setup complete. Start the app with:  powershell -ExecutionPolicy Bypass -File scripts\start.ps1" -ForegroundColor Green
