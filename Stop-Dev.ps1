$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendRoot = Join-Path $projectRoot 'frontend'

$processes = Get-CimInstance Win32_Process | Where-Object {
    ($_.CommandLine -like "*uvicorn admanagement.api.main:app*") -or
    ($_.CommandLine -like "*$frontendRoot*" -and $_.Name -match 'node|powershell')
}

foreach ($process in $processes) {
    try {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
        Write-Output "Stopped PID $($process.ProcessId)"
    } catch {
        Write-Warning "Failed to stop PID $($process.ProcessId): $($_.Exception.Message)"
    }
}
