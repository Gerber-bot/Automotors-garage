$ErrorActionPreference = 'Stop'
$utils = Join-Path $PSScriptRoot '../../Scripts de ejecucion automatica/utilities/process-utils.ps1'
. $utils
$root = Join-Path ([System.IO.Path]::GetTempPath()) "automotors-graceful-$([guid]::NewGuid().ToString('N'))"
$entry = Join-Path $root 'apps/backend/src/main.ts'
$manifest = Join-Path $root '.run/backend.process.json'
$control = Join-Path $root '.run/backend.control.json'
$dummy = $null
try {
    New-Item -ItemType Directory -Path (Split-Path $entry), (Split-Path $manifest) -Force | Out-Null
    Set-Content -Path (Join-Path $root 'package.json') -Value '{"type":"module"}' -Encoding Ascii
    $helper = (Join-Path $PSScriptRoot '../../apps/backend/src/infrastructure/process/shutdown-control.ts').Replace('\', '/')
    $source = @"
import { startShutdownControl } from 'file:///$helper';
const controlPath = process.argv[2];
let dispose;
dispose = await startShutdownControl(controlPath, async () => { await dispose(); });
"@
    Set-Content -Path $entry -Value $source -Encoding Ascii
    $dummy = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('--experimental-strip-types', "`"$entry`"", "`"$control`"") -PassThru -WindowStyle Hidden
    Start-Sleep -Milliseconds 500
    Save-OwnedProcess -Process $dummy -ManifestPath $manifest -Root $root -Role backend -Marker $entry

    $deadline = (Get-Date).AddSeconds(10)
    while ((Get-Date) -lt $deadline -and -not (Test-Path -LiteralPath $control)) { Start-Sleep -Milliseconds 100 }
    if (-not (Test-Path -LiteralPath $control)) { throw 'Managed process did not publish a shutdown control file' }

    $record = Get-Content -LiteralPath $control -Raw | ConvertFrom-Json
    $forgedStatus = 0
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:$($record.port)/shutdown" -Method Post `
            -Headers @{ Authorization = "Bearer $('0' * 64)" } -UseBasicParsing -TimeoutSec 3 | Out-Null
        $forgedStatus = 200
    } catch {
        if ($_.Exception.Response) { $forgedStatus = [int]$_.Exception.Response.StatusCode }
    }
    if ($forgedStatus -ne 403) { throw "Forged shutdown token was not rejected (HTTP $forgedStatus)" }
    if (-not (Get-Process -Id $dummy.Id -ErrorAction SilentlyContinue)) { throw 'Process exited after a rejected shutdown request' }

    if (-not (Stop-OwnedProcessGracefully -ManifestPath $manifest -ControlPath $control -Root $root -Role backend)) {
        throw 'Verified graceful stop was not reported as successful'
    }
    if (Get-Process -Id $dummy.Id -ErrorAction SilentlyContinue) { throw 'Process remained after graceful stop' }
    if (Test-Path -LiteralPath $manifest) { throw 'Manifest retained after verified graceful stop' }
    if (Test-Path -LiteralPath $control) { throw 'Control file retained after graceful stop' }
    Write-Host 'PASS: authenticated graceful stop, forged token rejection, and owned-record cleanup'
} finally {
    if ($dummy) { Stop-Process -Id $dummy.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}
