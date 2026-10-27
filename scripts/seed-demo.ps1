<#
.SYNOPSIS
    Ejecuta el sembrado idempotente de datos demo para Automotors Garage.
.DESCRIPTION
    Carga talleres, clientes VIP (Mauricio), vehiculos (VW Golf VII) y reglas OEM
    en la base de datos de demostracion de forma aislada e idempotente.
.PARAMETER DataDir
    Directorio de almacenamiento de datos de la base (por defecto: ./.data/postgres_demo).
.PARAMETER Environment
    Entorno de destino (por defecto: demo). Bloqueado en production.
#>
[CmdletBinding()]
param(
    [string]$DataDir = "./.data/postgres_demo",
    [string]$Environment = "demo"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
Set-Location $repoRoot

if ($Environment -eq "production" -or $env:NODE_ENV -eq "production") {
    Write-Error "ACCESO DENEGADO: No se permite sembrar datos ficticios en el entorno de produccion."
    exit 1
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- SEMBRADO DE DATOS DEMO" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

$env:NODE_ENV = $Environment
$env:PG_DATA_DIR = $DataDir

Write-Host "  Entorno       : $Environment" -ForegroundColor DarkGray
Write-Host "  Almacenamiento: $DataDir`n" -ForegroundColor DarkGray

& node --experimental-strip-types scripts/seed-demo.ts
if ($LASTEXITCODE -ne 0) {
    Write-Error "El sembrado de datos demo finalizo con errores."
    exit 1
}
