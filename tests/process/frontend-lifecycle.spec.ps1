$ErrorActionPreference = 'Stop'
$utils = Join-Path $PSScriptRoot '../../Scripts de ejecucion automatica/utilities/process-utils.ps1'
. $utils
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$frontendDir = Join-Path $repoRoot 'apps/frontend'
$entry = Join-Path $frontendDir 'dev-server.mjs'
$name = "test-frontend-$([guid]::NewGuid().ToString('N'))"
$manifest = Join-Path $repoRoot '.run/frontend.process.json'
$control = Join-Path $repoRoot '.run/frontend.control.json'
$outLog = Join-Path $repoRoot ".logs/$name.out.log"
$errLog = Join-Path $repoRoot ".logs/$name.err.log"
$frontend = $null
$port = $null
try {
    New-Item -ItemType Directory -Path (Join-Path $repoRoot '.run'), (Join-Path $repoRoot '.logs') -Force | Out-Null
    $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $probe.Start()
    $port = ([System.Net.IPEndPoint]$probe.LocalEndpoint).Port
    $probe.Stop()

    $env:NODE_ENV = 'development'
    $env:FRONTEND_PORT = "$port"
    $env:HOST = '127.0.0.1'

    $env:AUTOMOTORS_MANAGED_START = 'true'
    try {
        $frontend = Start-Process -FilePath 'node' `
            -ArgumentList @('--experimental-strip-types', "`"$entry`"") `
            -WorkingDirectory $frontendDir `
            -RedirectStandardOutput $outLog `
            -RedirectStandardError $errLog `
            -WindowStyle Hidden `
            -PassThru
    } finally {
        Remove-Item Env:AUTOMOTORS_MANAGED_START -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 300
    Save-OwnedProcess -Process $frontend -ManifestPath $manifest -Root $repoRoot -Role frontend -Marker $entry

    $deadline = (Get-Date).AddSeconds(120)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        if (-not (Get-Process -Id $frontend.Id -ErrorAction SilentlyContinue)) { break }
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200 -and (Test-Path -LiteralPath $control)) { $ready = $true; break }
        } catch {}
        Start-Sleep -Milliseconds 750
    }
    if (-not $ready) {
        $tail = if (Test-Path $outLog) { (Get-Content $outLog -Tail 25) -join "`n" } else { 'no log' }
        $errTail = if (Test-Path $errLog) { (Get-Content $errLog -Tail 25) -join "`n" } else { 'no error log' }
        throw "Frontend did not become ready.`n$tail`n$errTail"
    }
    $owned = Get-OwnedProcess -ManifestPath $manifest -Root $repoRoot -Role frontend
    if (-not $owned -or $owned.pid -ne $frontend.Id) { throw 'Frontend identity was not verified' }

    if (-not (Stop-OwnedProcessGracefully -ManifestPath $manifest -ControlPath $control -Root $repoRoot -Role frontend)) {
        throw 'Frontend did not stop gracefully'
    }
    if (Get-Process -Id $frontend.Id -ErrorAction SilentlyContinue) { throw 'Frontend remained alive after stop' }
    if (Test-Path -LiteralPath $manifest) { throw 'Frontend manifest retained after stop' }
    if (Test-Path -LiteralPath $control) { throw 'Frontend control retained after stop' }
    Write-Host 'PASS: managed frontend readiness, verified identity, and graceful stop'
} finally {
    if ($frontend) { Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item -LiteralPath $outLog, $errLog, $manifest, $control -Force -ErrorAction SilentlyContinue
    foreach ($dir in @('.run', '.logs')) {
        $path = Join-Path $repoRoot $dir
        if ((Test-Path $path) -and -not (Get-ChildItem $path -Force | Select-Object -First 1)) {
            Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
        }
    }
}
