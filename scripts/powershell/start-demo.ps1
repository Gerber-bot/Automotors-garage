<#
.SYNOPSIS
    Inicia Automotors Garage en modo demostracion interactiva.
.DESCRIPTION
    Prepara la base demo aislada, ejecuta el sembrado idempotente, arranca el servidor,
    valida el healthcheck y presenta la guia de demostracion con credenciales seguras.
.PARAMETER Port
    Puerto TCP para la demo (por defecto: 4000).
.PARAMETER OpenBrowser
    Si se especifica, abre el navegador por defecto en la URL de la demo.
.PARAMETER Foreground
    Si se especifica, mantiene el servidor en primer plano en la consola.
#>
[CmdletBinding()]
param(
    [int]$Port = 4000,
    [string]$HostAddress = "127.0.0.1",
    [switch]$NoBrowser,
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

$demoDataDir = "./.data/postgres_demo"
$pidFile = Join-Path $repoRoot ".run/server.pid"
$logFile = Join-Path $repoRoot ".logs/server_demo.log"
$errLogFile = Join-Path $repoRoot ".logs/server_demo.err.log"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- MODO DEMOSTRACION (PORT: $Port)" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

# 0. Salvaguarda de produccion
if ($env:NODE_ENV -eq "production") {
    Write-Host "  [SEGURIDAD] NODE_ENV esta configurado como 'production'." -ForegroundColor Red
    Write-Host "              Los scripts locales estan disenados exclusivamente para desarrollo y demo." -ForegroundColor Red
    Write-Host "              Operacion cancelada para evitar interferir con entornos de produccion.`n" -ForegroundColor Red
    exit 1
}

# 1. Verificar entorno
Write-Host "PASO 1/4: Verificando requisitos de ejecucion..." -ForegroundColor Yellow
$checkEnvScript = Join-Path $repoRoot "scripts/utilities/check-env.ps1"
& powershell -ExecutionPolicy Bypass -File $checkEnvScript -Port $Port
if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo la verificacion de entorno para la demo."
    exit 1
}

# 2. Sembrado de base de demostracion aislada
Write-Host "`nPASO 2/4: Preparando y sembrando datos demo..." -ForegroundColor Yellow
$seedScript = Join-Path $repoRoot "scripts/database/seed-demo.ps1"
& powershell -ExecutionPolicy Bypass -File $seedScript -DataDir $demoDataDir -Environment "demo"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo el sembrado de datos de demostracion."
    exit 1
}

# 3. Iniciar servidor con entorno demo
Write-Host "`nPASO 3/4: Iniciando servidor en modo DEMO..." -ForegroundColor Yellow

$env:NODE_ENV = "demo"
$env:PORT = "$Port"
$env:HOST = if ($env:HOST) { $env:HOST } else { $HostAddress }
$env:PG_DATA_DIR = $demoDataDir
$env:PID_FILE = $pidFile

if ($Foreground) {
    Write-Host "  Iniciando en primer plano (Ctrl+C para salir)...`n" -ForegroundColor Yellow
    & node --experimental-strip-types apps/backend/src/main.ts
    exit $LASTEXITCODE
} else {
    $startArgs = @(
        "--experimental-strip-types",
        "apps/backend/src/main.ts"
    )

    $process = Start-Process -FilePath "node" `
        -ArgumentList $startArgs `
        -WorkingDirectory $repoRoot `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError $errLogFile `
        -WindowStyle Hidden `
        -PassThru

    Set-Content -Path $pidFile -Value $process.Id -Encoding UTF8

    Write-Host "  Proceso demo iniciado con PID: $($process.Id)" -ForegroundColor Green
    Write-Host "  Aguardando confirmacion de disponibilidad..." -ForegroundColor Yellow

    $deadline = (Get-Date).AddSeconds(15)
    $serverReady = $false

    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 600
        $checkProc = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
        if (-not $checkProc) {
            Write-Host "  [FAIL] El proceso demo finalizo inesperadamente. Ver $logFile." -ForegroundColor Red
            if (Test-Path $logFile) {
                Get-Content $logFile -Tail 15 | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkRed }
            }
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
            exit 1
        }

        $checkHealthScript = Join-Path $repoRoot "scripts/utilities/check-health.ps1"
        & powershell -ExecutionPolicy Bypass -File $checkHealthScript -Port $Port -Silent
        if ($LASTEXITCODE -eq 0) {
            $serverReady = $true
            break
        }
    }

    if (-not $serverReady) {
        Write-Host "  [FAIL] El servidor demo no respondio a tiempo." -ForegroundColor Red
        exit 1
    }
}

# 4. Presentacion de credenciales y acceso
$demoUrl = "http://localhost:$Port/demo"
Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " DEMOSTRACION INTERACTIVA LISTA" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  URL Principal : $demoUrl" -ForegroundColor Cyan
Write-Host "  API Backend   : http://localhost:$Port/api/v1" -ForegroundColor Cyan
Write-Host "  Logs          : $logFile`n" -ForegroundColor DarkGray

Write-Host "CREDENCIALES DE DESARROLLO FICTICIAS (Taller Alpha Motors):" -ForegroundColor Yellow
Write-Host "  - Jefe de Taller : mario@alphamotors.com  / Password123!" -ForegroundColor White
Write-Host "  - Mecanico       : lucas@alphamotors.com  / Password123!" -ForegroundColor White
Write-Host "  - Taller Beta    : carlos@betaservice.com / Password123!`n" -ForegroundColor White

Write-Host "CIRCUITO DE DEMOSTRACION RECOMENDADO:" -ForegroundColor Cyan
Write-Host "  1. Seleccionar 'VW Golf VII' en el catalogo." -ForegroundColor White
Write-Host "  2. Ir a 'Quick Service Entry' (registro <60s)." -ForegroundColor White
Write-Host "  3. Registrar cambio de aceite y kilometraje a 45.000 km." -ForegroundColor White
Write-Host "  4. Comprobar cierre atomico transaccional y recalculacion a 60.000 km." -ForegroundColor White
Write-Host "  5. Alternar entre 'Modo Taller' y 'Modo Publico B2C' en el Pasaporte.`n" -ForegroundColor White

if (-not $NoBrowser) {
    try {
        Start-Process $demoUrl
        Write-Host "  [INFO] Navegador abierto en $demoUrl" -ForegroundColor Green
    } catch {
        # Si falla abrir navegador automaticamente, no es fatal
    }
}

Write-Host "Para detener la demo ejecute: powershell -File scripts/stop-dev.ps1 -Port $Port`n" -ForegroundColor DarkGray
