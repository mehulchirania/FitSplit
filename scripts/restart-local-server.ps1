# restart-local-server.ps1
# Kills anything on port 3000 and 3001, then starts the Next.js dev server clean on port 3000.

$ports = @(3000, 3001)

Write-Host ""
Write-Host "  FitSplit — local server restart" -ForegroundColor Cyan
Write-Host "  --------------------------------" -ForegroundColor DarkGray

foreach ($port in $ports) {
    $pids = netstat -ano | Select-String ":$port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Sort-Object -Unique | Where-Object { $_ -match '^\d+$' }

    if ($pids) {
        foreach ($pid in $pids) {
            try {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "  Killed PID $pid ($($proc.Name)) on port $port" -ForegroundColor Yellow
                }
            } catch {}
        }
    } else {
        Write-Host "  Port $port  — nothing running" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "  Starting Next.js dev server on http://localhost:3000 ..." -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot
npm run dev
