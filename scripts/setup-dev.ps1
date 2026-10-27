<#
.SYNOPSIS
    Configuracion inicial del entorno local de desarrollo para Automotors Garage.
.DESCRIPTION
    Verifica dependencias, inicializa directorios locales, crea archivo .env si falta
    y valida el estado de compilacion con typecheck.
#>
[CmdletBinding()]
param(
    [switch]$SkipTypecheck
)

$ErrorActionPreference = "Stop"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- SETUP DE ENTORNO LOCAL" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
Set-Location $repoRoot

# 1. Diagnostico previo
Write-Host "PASO 1/4: Ejecutando verificacion de entorno..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "check-env.ps1")
if ($LASTEXITCODE -ne 0) {
    Write-Error "El chequeo de entorno fallo. Corrija los errores antes de continuar."
    exit 1
}

# 2. Inicializacion de carpetas de runtime
Write-Host "`nPASO 2/4: Creando directorios de persistencia y runtime..." -ForegroundColor Yellow
$folders = @(
    ".data",
    ".run",
    ".logs"
)
foreach ($f in $folders) {
    $targetPath = Join-Path $repoRoot $f
    if (-not (Test-Path $targetPath)) {
        New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
        Write-Host "   Creado: $f" -ForegroundColor Green
    } else {
        Write-Host "   Existente: $f" -ForegroundColor DarkGray
    }
}

# 3. Configuracion de variables de entorno (.env)
Write-Host "`nPASO 3/4: Comprobando archivo de configuracion .env..." -ForegroundColor Yellow
$envPath = Join-Path $repoRoot ".env"
$envExamplePath = Join-Path $repoRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item -Path $envExamplePath -Destination $envPath
        Write-Host "   Creado .env a partir de .env.example." -ForegroundColor Green
    } else {
        $defaultEnvContent = @"
# AUTOMOTORS GARAGE -- CONFIGURACION LOCAL DE DESARROLLO
NODE_ENV=development
PORT=4000
JWT_SECRET=super-secret-local-key-automotors-garage-32chars
PG_DATA_DIR=./.data/postgres_dev
PID_FILE=./.run/server.pid
LOG_FILE=./.logs/server_dev.log
"@
        Set-Content -Path $envPath -Value $defaultEnvContent -Encoding UTF8
        Write-Host "   Creado archivo .env con valores predeterminados para desarrollo local." -ForegroundColor Green
    }
} else {
    Write-Host "   Archivo .env existente respetado." -ForegroundColor DarkGray
}

# 4. Validacion de Tipos
if (-not $SkipTypecheck) {
    Write-Host "`nPASO 4/4: Verificando integridad de tipos TypeScript..." -ForegroundColor Yellow
    npm run typecheck
    if ($LASTEXITCODE -ne 0) {
        Write-Error "La verificacion de tipos fallo."
        exit 1
    }
    Write-Host "   TypeScript estricto validado en todos los modulos (0 errores)." -ForegroundColor Green
} else {
    Write-Host "`nPASO 4/4: Typecheck omitido por parametro -SkipTypecheck." -ForegroundColor DarkGray
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " SETUP COMPLETADO CON EXITO" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Comandos utiles para comenzar:" -ForegroundColor White
Write-Host "  - Iniciar entorno de desarrollo:  powershell -File scripts/start-dev.ps1" -ForegroundColor Cyan
Write-Host "  - Iniciar demostracion rapida:   powershell -File scripts/start-demo.ps1" -ForegroundColor Cyan
Write-Host "  - Comprobar estado de salud:     powershell -File scripts/check-health.ps1" -ForegroundColor Cyan
Write-Host "  - Ejecutar todas las pruebas:    powershell -File scripts/run-tests.ps1`n" -ForegroundColor Cyan
