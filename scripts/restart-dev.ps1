<#
.SYNOPSIS
    Automotors Garage - Forwarder Shim (Backward Compatibility).
.DESCRIPTION
    Delegates execution to scripts/powershell/restart-dev.ps1.
#>
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    $ArgsList
)
$target = Join-Path $PSScriptRoot "powershell/restart-dev.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $target @args
exit $LASTEXITCODE
