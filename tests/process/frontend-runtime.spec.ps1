$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../../Scripts de ejecucion automatica/utilities/process-utils.ps1')
$source = (Resolve-Path (Join-Path $PSScriptRoot '../../')).Path
$root = Join-Path $env:LOCALAPPDATA "Temp/opencode/automotors-frontend-$([guid]::NewGuid().ToString('N'))"
$frontend = Join-Path $root 'apps/frontend'
$entry = Join-Path $frontend 'dev-server.mjs'
$manifest = Join-Path $root '.run/frontend.process.json'
$controlFile = Join-Path $root '.run/frontend.control.json'
$process = $null
$stopped = $false
$socket = $null
$portProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
try {
    foreach ($dir in @($frontend, (Join-Path $root 'apps/backend/src/infrastructure/process'), (Join-Path $root '.run'))) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    foreach ($item in @('src','public','next.config.mjs','postcss.config.mjs','tailwind.config.ts','package.json','dev-server.mjs')) {
        Copy-Item -LiteralPath (Join-Path $source "apps/frontend/$item") -Destination $frontend -Recurse
    }
    Copy-Item -LiteralPath (Join-Path $source 'apps/backend/src/infrastructure/process/shutdown-control.ts') `
        -Destination (Join-Path $root 'apps/backend/src/infrastructure/process')
    # Node resolves installed dependencies read-only; build output remains in the disposable copy.
    New-Item -ItemType Junction -Path (Join-Path $frontend 'node_modules') `
        -Target (Join-Path $source 'apps/frontend/node_modules') | Out-Null
    $portProbe.Start()
    $port = ([System.Net.IPEndPoint]$portProbe.LocalEndpoint).Port
    $portProbe.Stop()
    $env:FRONTEND_PORT = "$port"
    $env:HOST = '127.0.0.1'
    $env:NODE_ENV = 'development'
    $previousManaged = $env:AUTOMOTORS_MANAGED_START
    try {
        $env:AUTOMOTORS_MANAGED_START = 'true'
        $process = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('--experimental-strip-types', "`"$entry`"") `
            -WorkingDirectory $frontend -RedirectStandardOutput (Join-Path $root 'frontend.log') `
            -RedirectStandardError (Join-Path $root 'frontend.err.log') -PassThru -WindowStyle Hidden
    } finally {
        if ($null -eq $previousManaged) { Remove-Item Env:AUTOMOTORS_MANAGED_START -ErrorAction SilentlyContinue }
        else { $env:AUTOMOTORS_MANAGED_START = $previousManaged }
    }
    Save-OwnedProcess -Process $process -ManifestPath $manifest -Root $root -Role frontend -Marker $entry
    $deadline = (Get-Date).AddSeconds(90)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        if (-not (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) { break }
        if (Test-Path $controlFile) {
            try {
                $response = Invoke-WebRequest "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 4
                if ($response.StatusCode -eq 200) { $ready = $true; break }
            } catch {}
        }
        Start-Sleep -Milliseconds 800
    }
    if (-not $ready) { throw 'Disposable frontend did not serve the application' }
    $owned = Get-OwnedProcess -ManifestPath $manifest -Root $root -Role frontend
    if (-not $owned -or $owned.pid -ne $process.Id) { throw 'Frontend identity was not verified' }
    if (Get-OwnedProcess -ManifestPath $manifest -Root $source -Role frontend) { throw 'A different installation accepted ownership' }
    $socket = [System.Net.WebSockets.ClientWebSocket]::new()
    $cancellation = [System.Threading.CancellationTokenSource]::new(12000)
    $socket.ConnectAsync([uri]"ws://127.0.0.1:$port/_next/webpack-hmr", $cancellation.Token).GetAwaiter().GetResult() | Out-Null
    if ($socket.State -ne 'Open') { throw 'Next development HMR websocket failed to upgrade' }
    $control = Get-Content -LiteralPath $controlFile -Raw | ConvertFrom-Json
    $rejected = $false
    try {
        Invoke-WebRequest "http://127.0.0.1:$($control.port)/shutdown" -Method Post `
            -Headers @{ Authorization = 'Bearer invalid' } -UseBasicParsing -ErrorAction Stop | Out-Null
    } catch { $rejected = [int]$_.Exception.Response.StatusCode -eq 403 }
    if (-not $rejected) { throw 'Unauthenticated stop was not rejected' }
    $stopped = Stop-OwnedProcessGracefully -ManifestPath $manifest -ControlPath $controlFile -Root $root -Role frontend -TimeoutSec 25
    if (-not $stopped) { throw 'Disposable frontend failed to stop gracefully' }
    Write-Host 'PASS: isolated Next 15 page, HMR upgrade, authenticated stop, and graceful exit'
} finally {
    if ($socket) { $socket.Dispose() }
    $portProbe.Stop()
    if ($process -and -not $stopped -and (Test-Path $controlFile)) {
        $stopped = Stop-OwnedProcessGracefully -ManifestPath $manifest -ControlPath $controlFile -Root $root -Role frontend -TimeoutSec 25
    }
    if ($process -and (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) {
        Write-Warning "Disposable frontend remains running (PID $($process.Id)); no force termination attempted. Path: $root"
    } else {
        # Remove junction explicitly so recursive cleanup cannot traverse installed dependencies.
        $junction = Join-Path $frontend 'node_modules'
        if (Test-Path $junction) { [System.IO.Directory]::Delete($junction) }
        Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
    }
}
