# Starts backend and frontend dev servers in two new PowerShell windows.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$Root\backend\.venv") -or -not (Test-Path "$Root\frontend\node_modules")) {
  Write-Host "ERROR: Run scripts\setup.ps1 first." -ForegroundColor Red; exit 1
}
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$Root\backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$Root\frontend'; npm run dev"
Write-Host ""
Write-Host "Frontend : http://localhost:5173" -ForegroundColor Green
Write-Host "Backend  : http://localhost:8000"
Write-Host "API docs : http://localhost:8000/docs"
Write-Host "(Close the two new windows to stop the servers.)"
