param(
    [int]$ApiPort = 8000,
    [int]$FrontendPort = 3000
)

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendRoot = Join-Path $projectRoot 'frontend'
$venvPython = Join-Path $projectRoot 'venv\Scripts\python.exe'

function Test-PortInUse {
    param([int]$Port)
    try {
        return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop)
    } catch {
        return $false
    }
}

if (-not (Test-Path $venvPython)) {
    throw "Python virtual environment not found at $venvPython"
}

if (-not (Test-Path $frontendRoot)) {
    throw "Frontend directory not found at $frontendRoot"
}

if (Test-PortInUse -Port $ApiPort) {
    Write-Warning "API port $ApiPort is already in use."
}
if (Test-PortInUse -Port $FrontendPort) {
    Write-Warning "Frontend port $FrontendPort is already in use."
}

$apiCommand = "Set-Location '$projectRoot'; & '$venvPython' -m uvicorn admanagement.api.main:app --host 0.0.0.0 --port $ApiPort --reload"
$frontendCommand = "Set-Location '$frontendRoot'; `$env:PORT='$FrontendPort'; npm run dev -- --port $FrontendPort"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiCommand | Out-Null
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand | Out-Null

Write-Output "Started backend on port $ApiPort and frontend on port $FrontendPort in separate windows."
