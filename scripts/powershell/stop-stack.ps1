<#
.SYNOPSIS
    Detiene de forma limpia el stack completo de Automotors Garage (Frontend + Backend).
.DESCRIPTION
    Invoca stop-frontend.ps1 y stop-dev.ps1, validando la detencion ordenada de los procesos
    node propios del proyecto y liberando los puertos 3000 y 4000.
.PARAMETER BackendPort
    Puerto TCP del backend (por defecto: 4000).
.PARAMETER FrontendPort
    Puerto TCP del frontend (por defecto: 3000).
.PARAMETER Force
    Fuerza la detencion de los procesos.
#>
[CmdletBinding()]
param(
    [int]$BackendPort = 4000,
    [int]$FrontendPort = 3000,
    [switch]$Force
)

$ErrorActionPreference = "Continue"

$scriptDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptDir "../..")).Path
$utilsPath = Join-Path $scriptDir "../utilities/process-utils.ps1"
if (Test-Path $utilsPath) {
    . $utilsPath
}
Set-Location $repoRoot

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- DETENCION DEL STACK COMPLETO" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

# 1. Detener Frontend Next.js
Write-Host "[1/2] Deteniendo Frontend Next.js (puerto: $FrontendPort)..." -ForegroundColor Yellow
$frontendArgs = @("-Port", "$FrontendPort")
if ($Force) { $frontendArgs += "-Force" }
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptDir "stop-frontend.ps1") @frontendArgs

# 2. Detener Backend
Write-Host "`n[2/2] Deteniendo Backend API (puerto: $BackendPort)..." -ForegroundColor Yellow
$backendArgs = @("-Port", "$BackendPort")
if ($Force) { $backendArgs += "-Force" }
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptDir "stop-dev.ps1") @backendArgs

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " STACK COMPLETO DETENIDO Y RECURSOS LIBERADOS" -ForegroundColor Green
Write-Host "=======================================================`n" -ForegroundColor Green
exit 0
