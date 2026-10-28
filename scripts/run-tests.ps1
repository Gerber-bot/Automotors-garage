<#
.SYNOPSIS
    Automotors Garage - Forwarder Shim (Backward Compatibility).
.DESCRIPTION
    Delegates execution to scripts/utilities/run-tests.ps1.
#>
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    $ArgsList
)
$target = Join-Path $PSScriptRoot "utilities/run-tests.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $target @args
exit $LASTEXITCODE
