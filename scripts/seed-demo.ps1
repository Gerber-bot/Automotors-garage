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
    [string]$Environment = "demo",
    [switch]$Reset,
    [switch]$ConfirmReset
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
Set-Location $repoRoot

# 1. Validacion estricta de entorno
if ($Environment -eq "production" -or $env:NODE_ENV -eq "production") {
    Write-Error "ACCESO DENEGADO: No se permite sembrar datos ficticios en el entorno de produccion."
    exit 1
}

# 2. Proteccion estricta de reseteo: solo permitido en entorno demo con confirmacion explicita y ruta validada
if ($Reset) {
    if ($Environment -ne "demo") {
        Write-Error "OPERACION DENEGADA: El reseteo de almacenamiento (-Reset) solo esta permitido para el entorno 'demo'."
        exit 1
    }

    if (-not $ConfirmReset) {
        Write-Error "CONFIRMACION REQUERIDA: Para reiniciar la base demo debe especificar explicitamente -ConfirmReset."
        exit 1
    }

    # Validacion estricta de ruta exacta: solo la carpeta .data/postgres_demo dentro del repo
    $canonicalAllowedPath = (Join-Path $repoRoot ".data/postgres_demo")
    $targetPath = if (Test-Path $DataDir) { (Resolve-Path $DataDir).Path } else { [System.IO.Path]::GetFullPath((Join-Path $repoRoot $DataDir)) }

    if ($targetPath -ne $canonicalAllowedPath) {
        Write-Error "RUTA NO PERMITIDA: El reseteo solo puede aplicarse sobre la ruta canonica '$canonicalAllowedPath'."
        exit 1
    }

    Write-Host "  [RESET] Reinicializando almacenamiento demo a peticion explicita y confirmada..." -ForegroundColor Yellow
    if (Test-Path $canonicalAllowedPath) {
        Remove-Item -Recurse -Force $canonicalAllowedPath -ErrorAction SilentlyContinue
    }
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
