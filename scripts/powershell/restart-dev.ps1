<#
.SYNOPSIS
    Reinicia el servidor de desarrollo de Automotors Garage.
.DESCRIPTION
    Detiene de forma limpia la instancia actual, verifica la liberacion de recursos
    e inicia una nueva instancia con los parametros indicados.
.PARAMETER Port
    Puerto TCP a utilizar (por defecto: 4000).
.PARAMETER Foreground
    Si se activa, ejecuta la nueva instancia en primer plano.
#>
[CmdletBinding()]
param(
    [int]$Port = 4000,
    [switch]$Foreground
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptDir "../..")).Path
$utilsPath = Join-Path $scriptDir "../utilities/process-utils.ps1"
if (Test-Path $utilsPath) {
    . $utilsPath
}
Set-Location $repoRoot

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- REINICIO DE SERVICIOS" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

# 0. Salvaguarda de produccion
if ($env:NODE_ENV -eq "production") {
    Write-Host "  [SEGURIDAD] NODE_ENV esta configurado como 'production'." -ForegroundColor Red
    Write-Host "              Los scripts locales estan disenados exclusivamente para desarrollo y demo." -ForegroundColor Red
    Write-Host "              Operacion cancelada para evitar interferir con entornos de produccion.`n" -ForegroundColor Red
    exit 1
}

# 1. Detener instancia existente
Write-Host "PASO 1/2: Deteniendo instancia activa..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "stop-dev.ps1") -Port $Port

Start-Sleep -Seconds 1

# 2. Iniciar nueva instancia
Write-Host "PASO 2/2: Iniciando nueva instancia..." -ForegroundColor Yellow
if ($Foreground) {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "start-dev.ps1") -Port $Port -Foreground
} else {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "start-dev.ps1") -Port $Port
}
