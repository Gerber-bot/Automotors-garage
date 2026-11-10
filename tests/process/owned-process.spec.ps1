$ErrorActionPreference = 'Stop'
$utils = Join-Path $PSScriptRoot '../../Scripts de ejecucion automatica/utilities/process-utils.ps1'
. $utils
$root = Join-Path ([System.IO.Path]::GetTempPath()) "automotors-process-$([guid]::NewGuid().ToString('N'))"
$entry = Join-Path $root 'apps/backend/src/main.ts'
$manifest = Join-Path $root '.run/backend.process.json'
$dummy = $null
$other = $null
$listener = $null
try {
    New-Item -ItemType Directory -Path (Split-Path $entry), (Split-Path $manifest) -Force | Out-Null
    Set-Content -Path $entry -Value 'setInterval(() => {}, 1000);' -Encoding Ascii
    $dummy = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('--experimental-strip-types', "`"$entry`"") -PassThru -WindowStyle Hidden
    Start-Sleep -Milliseconds 500
    Save-OwnedProcess -Process $dummy -ManifestPath $manifest -Root $root -Role backend -Marker $entry
    $owned = Get-OwnedProcess -ManifestPath $manifest -Root $root -Role backend
    if (-not $owned -or $owned.pid -ne $dummy.Id) { throw 'Exact owned identity not recognized' }
    $forged = Get-Content $manifest -Raw | ConvertFrom-Json
    $forged.createdUtcTicks = [long]$forged.createdUtcTicks + 1
    $forged | ConvertTo-Json | Set-Content $manifest
    if (Get-OwnedProcess -ManifestPath $manifest -Root $root -Role backend) { throw 'PID reuse guard accepted mismatched creation time' }
    Save-OwnedProcess -Process $dummy -ManifestPath $manifest -Root $root -Role backend -Marker $entry
    if (Get-OwnedProcess -ManifestPath $manifest -Root (Split-Path $root) -Role backend) { throw 'Cross-install identity accepted' }
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $occupiedPort = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    $rejected = $false
    try { Assert-AvailableOwnedPort -Port $occupiedPort -ManifestPath $manifest -Root $root -Role backend | Out-Null } catch { $rejected = $true }
    if (-not $rejected) { throw 'Unrelated port owner accepted' }
    if (Stop-OwnedProcessGracefully -ManifestPath $manifest -ControlPath (Join-Path $root '.run/missing.control.json') -Root $root -Role backend) {
        throw 'Stop reported success without graceful IPC'
    }
    if (-not (Get-Process -Id $dummy.Id -ErrorAction SilentlyContinue)) { throw 'Uncontrolled process was terminated' }
    if (Clear-StaleOwnedRecord -ManifestPath $manifest -ControlPath (Join-Path $root '.run/backend.control.json') -Root $root -Role backend) {
        throw 'Cleared the record of a verified live process'
    }
    if (-not (Test-Path $manifest)) { throw 'Live process record was removed' }

    Stop-Process -Id $dummy.Id -Force
    Wait-Process -Id $dummy.Id -Timeout 5 -ErrorAction SilentlyContinue
    $deadline = (Get-Date).AddSeconds(5)
    while ((Get-Date) -lt $deadline -and (Get-Process -Id $dummy.Id -ErrorAction SilentlyContinue)) { Start-Sleep -Milliseconds 100 }
    $control = Join-Path $root '.run/backend.control.json'
    Set-Content -Path $control -Value '{}' -Encoding Ascii
    if (-not (Clear-StaleOwnedRecord -ManifestPath $manifest -ControlPath $control -Root $root -Role backend)) {
        throw 'Definitively inactive process record was not cleared'
    }
    if ((Test-Path $manifest) -or (Test-Path $control)) { throw 'Stale process records were retained' }
    $dummy = $null
    Write-Host 'PASS: exact identity, creation time, root isolation, unrelated port, fail-closed stop, and stale-record cleanup'
} finally {
    if ($listener) { $listener.Stop() }
    # Test-owned disposable processes only; production stop never force-kills.
    if ($dummy) { Stop-Process -Id $dummy.Id -Force -ErrorAction SilentlyContinue }
    if ($other) { Stop-Process -Id $other.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}
