<#
.SYNOPSIS
    Automotors Garage - Forwarder Shim (Backward Compatibility).
.DESCRIPTION
    Delegates execution to scripts/powershell/start-demo.ps1.
#>
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    $ArgsList
)
$target = Join-Path $PSScriptRoot "powershell/start-demo.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $target @args
exit $LASTEXITCODE
