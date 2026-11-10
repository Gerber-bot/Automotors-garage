$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $root
# The integration suites own fixed per-installation manifest names. Never overwrite a live run.
if (@(Get-ChildItem (Join-Path $root '.run') -Force -ErrorAction SilentlyContinue).Count) {
    throw 'Process tests require an installation with no runtime records; stop/review it first.'
}
foreach ($test in @('owned-process','graceful-stop','double-start','backend-lifecycle','frontend-lifecycle','frontend-runtime')) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "$test.spec.ps1")
    if ($LASTEXITCODE -ne 0) { throw "Process suite failed: $test" }
}
& node --experimental-strip-types (Join-Path $PSScriptRoot 'shutdown-control.spec.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Shutdown control suite failed' }
Write-Host 'PASS: all seven Windows process suites'
