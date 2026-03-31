param(
  [int]$PreferredBackendPort = 8000,
  [int]$PreferredFrontendPort = 3000
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $root ".env"
$composeFile = Join-Path $root "docker-compose.prod.yml"

function Get-EnvMap {
  param([string]$Path)

  $map = @{}
  if (Test-Path $Path) {
    foreach ($line in Get-Content -Path $Path) {
      if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) {
        continue
      }
      $index = $line.IndexOf("=")
      if ($index -gt 0) {
        $key = $line.Substring(0, $index)
        $value = $line.Substring($index + 1)
        $map[$key] = $value
      }
    }
  }
  return $map
}

function Set-EnvValue {
  param(
    [string]$Path,
    [string]$Key,
    [string]$Value
  )

  if (-not (Test-Path $Path)) {
    New-Item -ItemType File -Path $Path -Force | Out-Null
  }

  $lines = Get-Content -Path $Path -ErrorAction SilentlyContinue
  if (-not $lines) {
    $lines = @()
  }

  $updated = $false
  $newLines = foreach ($line in $lines) {
    if ($line -match "^$([regex]::Escape($Key))=") {
      $updated = $true
      "$Key=$Value"
    } else {
      $line
    }
  }

  if (-not $updated) {
    $newLines += "$Key=$Value"
  }

  Set-Content -Path $Path -Value $newLines
}

function Test-PortInUse {
  param([int]$Port)

  try {
    $existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    return $existing.Count -gt 0
  } catch {
    $netstat = netstat -ano | Select-String -Pattern "LISTENING\s+\d+$"
    return ($netstat | Select-String -Pattern "[:.]$Port\s").Count -gt 0
  }
}

function Find-AvailablePort {
  param(
    [int]$StartPort,
    [int]$Attempts = 25
  )

  $port = $StartPort
  for ($i = 0; $i -lt $Attempts; $i++) {
    if (-not (Test-PortInUse -Port $port)) {
      return $port
    }
    $port++
  }

  throw "Unable to find a free port near $StartPort after $Attempts attempts."
}

if (-not (Test-Path $envFile)) {
  Copy-Item -Path (Join-Path $root ".env.example") -Destination $envFile -Force
  Write-Host "Created .env from .env.example"
}

$envMap = Get-EnvMap -Path $envFile
$backendPreferred = if ($envMap.ContainsKey("BACKEND_PORT")) { [int]$envMap["BACKEND_PORT"] } else { $PreferredBackendPort }
$frontendPreferred = if ($envMap.ContainsKey("FRONTEND_PORT")) { [int]$envMap["FRONTEND_PORT"] } else { $PreferredFrontendPort }

$backendSelected = Find-AvailablePort -StartPort $backendPreferred
$frontendSelected = Find-AvailablePort -StartPort $frontendPreferred

Set-EnvValue -Path $envFile -Key "BACKEND_PORT" -Value "$backendSelected"
Set-EnvValue -Path $envFile -Key "FRONTEND_PORT" -Value "$frontendSelected"
Set-EnvValue -Path $envFile -Key "NEXT_PUBLIC_API_BASE_URL" -Value "http://localhost:$backendSelected"
Set-EnvValue -Path $envFile -Key "ADMANAGEMENT_FRONTEND_ORIGINS" -Value "[`"http://127.0.0.1:$frontendSelected`",`"http://localhost:$frontendSelected`"]"

if ($backendPreferred -ne $backendSelected) {
  Write-Host "Backend port $backendPreferred is busy. Using $backendSelected instead."
}

if ($frontendPreferred -ne $frontendSelected) {
  Write-Host "Frontend port $frontendPreferred is busy. Using $frontendSelected instead."
}

Push-Location $root
try {
  docker compose -f $composeFile up -d --build
} finally {
  Pop-Location
}

Write-Host "Frontend: http://localhost:$frontendSelected"
Write-Host "Backend API: http://localhost:$backendSelected"
Write-Host "Onboarding: http://localhost:$frontendSelected/onboarding"
