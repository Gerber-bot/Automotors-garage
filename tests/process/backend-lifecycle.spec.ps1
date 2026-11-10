$ErrorActionPreference = 'Stop'
$utils = Join-Path $PSScriptRoot '../../Scripts de ejecucion automatica/utilities/process-utils.ps1'
. $utils
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$name = "test-$([guid]::NewGuid().ToString('N'))"
$dataDir = Join-Path $repoRoot ".data/$name"
$dataRelative = "./.data/$name"
$manifest = Join-Path $repoRoot '.run/backend.process.json'
$control = Join-Path $repoRoot '.run/backend.control.json'
$pidFile = ".run/$name.pid"
$outLog = Join-Path $repoRoot ".logs/$name.out.log"
$errLog = Join-Path $repoRoot ".logs/$name.err.log"
$backend = $null
$port = $null
try {
    New-Item -ItemType Directory -Path (Join-Path $repoRoot '.run'), (Join-Path $repoRoot '.logs'), (Join-Path $repoRoot '.data') -Force | Out-Null
    $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $probe.Start()
    $port = ([System.Net.IPEndPoint]$probe.LocalEndpoint).Port
    $probe.Stop()

    $env:NODE_ENV = 'development'
    $env:DB_PROVIDER = 'pglite'
    $env:PG_DATA_DIR = $dataRelative
    $env:PORT = "$port"
    $env:HOST = '127.0.0.1'
    $env:PID_FILE = $pidFile

    cmd /c "npm run db:status >nul 2>&1"
    if ($LASTEXITCODE -eq 0) { throw 'A new database was reported as ready before preparation' }

    cmd /c "npm run db:apply >nul 2>&1"
    if ($LASTEXITCODE -ne 0) { throw 'Explicit migration application failed on a disposable database' }

    cmd /c "npm run db:status >nul 2>&1"
    if ($LASTEXITCODE -ne 0) { throw 'Migration status was not ready after explicit application' }

    $backendEntry = Join-Path $repoRoot 'apps/backend/src/main.ts'
    $startBackend = {
        $env:AUTOMOTORS_MANAGED_START = 'true'
        try {
            Start-Process -FilePath 'node' `
                -ArgumentList @('--env-file-if-exists=.env', '--experimental-strip-types', "`"$backendEntry`"") `
                -WorkingDirectory $repoRoot `
                -RedirectStandardOutput $outLog `
                -RedirectStandardError $errLog `
                -WindowStyle Hidden `
                -PassThru
        } finally {
            Remove-Item Env:AUTOMOTORS_MANAGED_START -ErrorAction SilentlyContinue
        }
    }

    for ($cycle = 1; $cycle -le 2; $cycle++) {
        $backend = & $startBackend
        Start-Sleep -Milliseconds 300
        Save-OwnedProcess -Process $backend -ManifestPath $manifest -Root $repoRoot -Role backend -Marker $backendEntry
        $deadline = (Get-Date).AddSeconds(45)
        $ready = $false
        while ((Get-Date) -lt $deadline) {
            if (-not (Get-Process -Id $backend.Id -ErrorAction SilentlyContinue)) { break }
            try {
                $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health/ready" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200 -and (Test-Path -LiteralPath $control)) { $ready = $true; break }
            } catch {}
            Start-Sleep -Milliseconds 500
        }
        if (-not $ready) {
            $tail = if (Test-Path $outLog) { (Get-Content $outLog -Tail 20) -join "`n" } else { 'no log' }
            throw "Backend cycle $cycle did not become ready.`n$tail"
        }
        $owned = Get-OwnedProcess -ManifestPath $manifest -Root $repoRoot -Role backend
        if (-not $owned -or $owned.pid -ne $backend.Id) { throw "Backend cycle $cycle identity was not verified" }

        $controller = Join-Path $repoRoot 'Scripts de ejecucion automatica/powershell/automotors.ps1'
        $duplicate = & powershell -NoProfile -ExecutionPolicy Bypass -File $controller -Action START -BackendPort $port -NoBrowser
        if ($LASTEXITCODE -ne 0 -or ($duplicate -join "`n") -notmatch 'already running') {
            throw 'Duplicate/partial start was not recognized before migration preflight'
        }
        if ((Get-OwnedProcess -ManifestPath $manifest -Root $repoRoot -Role backend).pid -ne $backend.Id) {
            throw 'Duplicate start replaced the owned backend'
        }

        if (-not (Stop-OwnedProcessGracefully -ManifestPath $manifest -ControlPath $control -Root $repoRoot -Role backend)) {
            throw "Backend cycle $cycle did not stop gracefully"
        }
        if (Get-Process -Id $backend.Id -ErrorAction SilentlyContinue) { throw "Backend cycle $cycle remained alive after stop" }
        if (-not (Test-Path -LiteralPath $dataDir)) { throw "Backend cycle $cycle removed the disposable data directory" }
        if (Test-Path -LiteralPath (Join-Path $dataDir '.owner.pid')) { throw "Backend cycle $cycle retained a stale owner record" }
        $backend = $null
    }

    Write-Host 'PASS: disposable preparation, readiness, verified ownership, and two graceful start/stop cycles'
} finally {
    if ($backend) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item Env:AUTOMOTORS_MANAGED_START -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $dataDir -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $outLog, $errLog, (Join-Path $repoRoot $pidFile), $manifest, $control -Force -ErrorAction SilentlyContinue
    foreach ($dir in @('.run', '.logs', '.data')) {
        $path = Join-Path $repoRoot $dir
        if ((Test-Path $path) -and -not (Get-ChildItem $path -Force | Select-Object -First 1)) {
            Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
        }
    }
}
