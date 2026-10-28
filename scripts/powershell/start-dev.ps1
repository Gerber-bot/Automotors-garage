<#
.SYNOPSIS
    Inicia el servidor backend de Automotors Garage en entorno de desarrollo local.
.DESCRIPTION
    Verifica precondiciones, previene instancias duplicadas, inicia el proceso en
    segundo plano o primer plano, aguarda la confirmacion de salud y muestra URLs de acceso.
.PARAMETER Port
    Puerto TCP a utilizar (por defecto: 4000).
.PARAMETER Foreground
    Si se activa, ejecuta el servidor en primer plano en la consola actual.
.PARAMETER TimeoutSec
    Segundos maximos para esperar que el healthcheck responda (por defecto: 15).
#>
[CmdletBinding()]
param(
    [int]$Port = 4000,
    [string]$HostAddress = "127.0.0.1",
    [switch]$Foreground,
    [int]$TimeoutSec = 15
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptDir "../..")).Path
$utilsPath = Join-Path $scriptDir "../utilities/process-utils.ps1"
if (Test-Path $utilsPath) {
    . $utilsPath
}
Set-Location $repoRoot

$pidFile = Join-Path $repoRoot ".run/server.pid"
$logFile = Join-Path $repoRoot ".logs/server_dev.log"
$errLogFile = Join-Path $repoRoot ".logs/server_dev.err.log"
$dataDir = "./.data/postgres_dev"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- INICIO DE DESARROLLO (PORT: $Port)" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

# 0. Salvaguarda de produccion
if ($env:NODE_ENV -eq "production") {
    Write-Host "  [SEGURIDAD] NODE_ENV esta configurado como 'production'." -ForegroundColor Red
    Write-Host "              Los scripts locales estan disenados exclusivamente para desarrollo y demo." -ForegroundColor Red
    Write-Host "              Operacion cancelada para evitar interferir con entornos de produccion.`n" -ForegroundColor Red
    exit 1
}

# 1. Comprobar si ya existe una instancia activa registrada
if (Test-Path $pidFile) {
    $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($existingPid) {
        $existingProc = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
        if ($existingProc -and ($existingProc.ProcessName -like "*node*")) {
            Write-Host "  [WARN] Ya existe una instancia de Automotors Garage ejecutandose (PID: $existingPid)." -ForegroundColor Yellow
            Write-Host "         Para detenerla use: powershell -File scripts/stop-dev.ps1 -Port $Port" -ForegroundColor DarkGray
            Write-Host "         Acceso web: http://localhost:$Port/`n" -ForegroundColor Green
            exit 0
        } else {
            # PID huerfano o finalizado
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        }
    }
}

# 2. Comprobar si el puerto ya esta en uso
$portConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portConn) {
    $owningPid = $portConn[0].OwningProcess
    $owningProc = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
    $pName = if ($owningProc) { $owningProc.ProcessName } else { "PID $owningPid" }
    Write-Host "  [FAIL] El puerto $Port ya esta ocupado por otro proceso: $pName." -ForegroundColor Red
    Write-Host "         Detenga ese proceso o especifique un puerto diferente con -Port <numero>.`n" -ForegroundColor Yellow
    exit 1
}

# 3. Asegurar directorios locales
$folders = @(".run", ".logs", ".data")
foreach ($f in $folders) {
    $fp = Join-Path $repoRoot $f
    if (-not (Test-Path $fp)) {
        New-Item -ItemType Directory -Path $fp -Force | Out-Null
    }
}

# 4. Variables de entorno para el proceso
$env:NODE_ENV = "development"
$env:PORT = "$Port"
$env:HOST = if ($env:HOST) { $env:HOST } else { $HostAddress }
$env:PG_DATA_DIR = $dataDir
$env:PID_FILE = $pidFile

# 5. Ejecucion
if ($Foreground) {
    Write-Host "  Iniciando servidor en primer plano (Ctrl+C para detener)...`n" -ForegroundColor Yellow
    & node --experimental-strip-types apps/backend/src/main.ts
    exit $LASTEXITCODE
} else {
    Write-Host "  Iniciando proceso en segundo plano..." -ForegroundColor Yellow
    Write-Host "  Persistencia: $dataDir" -ForegroundColor DarkGray
    Write-Host "  Archivo log : $logFile" -ForegroundColor DarkGray

    # Iniciar proceso redirigiendo stdout y stderr
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

    Write-Host "  Proceso iniciado con PID: $($process.Id)" -ForegroundColor Green
    Write-Host "  Esperando respuesta de salud (/health/live)..." -ForegroundColor Yellow

    # Sondeo de salud hasta TimeoutSec
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $serverReady = $false

    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 600
        
        # Verificar que el proceso siga vivo
        $checkProc = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
        if (-not $checkProc) {
            Write-Host "  [FAIL] El proceso finalizo abruptamente. Revise los logs en $logFile." -ForegroundColor Red
            if (Test-Path $logFile) {
                Get-Content $logFile -Tail 15 | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkRed }
            }
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
            exit 1
        }

        $healthCheckScript = Join-Path $repoRoot "scripts/utilities/check-health.ps1"
        & powershell -ExecutionPolicy Bypass -File $healthCheckScript -Port $Port -Silent
        if ($LASTEXITCODE -eq 0) {
            $serverReady = $true
            break
        }
    }

    if ($serverReady) {
        Write-Host "`n=======================================================" -ForegroundColor Green
        Write-Host " AUTOMOTORS GARAGE ESTA EN LINEA" -ForegroundColor Green
        Write-Host "=======================================================" -ForegroundColor Green
        Write-Host "  Dashboard Web : http://localhost:$Port/" -ForegroundColor Cyan
        Write-Host "  Demo UI       : http://localhost:$Port/demo" -ForegroundColor Cyan
        Write-Host "  Health Live   : http://localhost:$Port/health/live" -ForegroundColor Cyan
        Write-Host "  Health Ready  : http://localhost:$Port/health/ready" -ForegroundColor Cyan
        Write-Host "  Logs en vivo  : Get-Content $logFile -Wait" -ForegroundColor DarkGray
        Write-Host "  Para detener  : powershell -File scripts/stop-dev.ps1 -Port $Port`n" -ForegroundColor DarkGray
        exit 0
    } else {
        Write-Host "`n  [FAIL] El servidor no respondio dentro de $TimeoutSec segundos." -ForegroundColor Red
        if (Test-Path $logFile) {
            Write-Host "  Ultimas lineas del log ($logFile):" -ForegroundColor Yellow
            Get-Content $logFile -Tail 15 | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkGray }
        }
        exit 1
    }
}
