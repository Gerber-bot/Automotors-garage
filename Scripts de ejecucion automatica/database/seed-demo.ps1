<#
.SYNOPSIS
    Ejecuta el sembrado idempotente de datos demo para Automotors Garage.
.DESCRIPTION
    Carga talleres, clientes VIP (Demo), vehiculos (VW Golf VII) y reglas OEM
    en la base de datos de demostracion de forma aislada e idempotente.
.PARAMETER DataDir
    Directorio explicito de una base PGlite local desechable ya preparada.
.PARAMETER Environment
    Entorno de destino (por defecto: demo). Bloqueado en production.
#>
[CmdletBinding()]
param(
    [string]$DataDir = "",
    [string]$Environment = "demo",
    [switch]$Reset,
    [switch]$ConfirmReset
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "../..")).Path
Set-Location $repoRoot

# 1. Validacion estricta de entorno
if ($Environment -eq "production" -or $env:NODE_ENV -eq "production") {
    Write-Error "ACCESO DENEGADO: No se permite sembrar datos ficticios en el entorno de produccion."
    exit 1
}

# Keep legacy switches recognizable, but never delete data as part of seeding.
if ($Reset -or $ConfirmReset) { throw 'Destructive demo reset is disabled; no data was deleted.' }
if ([string]::IsNullOrWhiteSpace($DataDir)) { throw 'An explicit disposable -DataDir is required.' }

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- SEMBRADO DE DATOS DEMO" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

$env:NODE_ENV = $Environment
$env:PG_DATA_DIR = $DataDir

Write-Host "  Entorno       : $Environment" -ForegroundColor DarkGray
Write-Host "  Almacenamiento: $DataDir`n" -ForegroundColor DarkGray

$output = cmd /c "npm run seed:demo 2>&1"
$seedExit = $LASTEXITCODE
$output | ForEach-Object { Write-Host $_ }
if ($seedExit -ne 0) {
    Write-Error "El sembrado de datos demo finalizo con errores."
    exit 1
}
