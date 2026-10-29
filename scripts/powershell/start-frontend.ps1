<#
.SYNOPSIS
    Inicia el frontend principal Next.js 15 de Automotors Garage.
.DESCRIPTION
    Verifica precondiciones, dependencias, previene instancias duplicadas,
    inicia Next.js en segundo plano (o primer plano), registra el PID,
    comprueba disponibilidad HTTP y abre el navegador.
.PARAMETER Port
    Puerto TCP a utilizar para Next.js (por defecto: 3000).
.PARAMETER HostAddress
    Direccion IP a escuchar (por defecto: 127.0.0.1; 0.0.0.0 para LAN).
.PARAMETER Foreground
    Ejecuta el servidor en primer plano en la consola actual.
.PARAMETER NoBrowser
    Omite la apertura automatica del navegador web.
.PARAMETER TimeoutSec
    Segundos maximos de sondeo HTTP antes de declarar timeout (por defecto: 30).
#>
[CmdletBinding()]
param(
    [int]$Port = 3000,
    [string]$HostAddress = "127.0.0.1",
    [switch]$Foreground,
    [switch]$NoBrowser,
    [switch]$Clean,
    [int]$TimeoutSec = 30
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptDir "../..")).Path
$utilsPath = Join-Path $scriptDir "../utilities/process-utils.ps1"
if (Test-Path $utilsPath) {
    . $utilsPath
}
Set-Location $repoRoot

$pidFile = Join-Path $repoRoot ".run/frontend.pid"
$logFile = Join-Path $repoRoot ".logs/frontend_dev.log"
$errLogFile = Join-Path $repoRoot ".logs/frontend_dev.err.log"
$frontendDir = Join-Path $repoRoot "apps/frontend"
$nextBin = Join-Path $frontendDir "node_modules/next/dist/bin/next"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- FRONTEND NEXT.JS (PORT: $Port)" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

# 0. Salvaguarda de produccion
if ($env:NODE_ENV -eq "production") {
    Write-Host "  [SEGURIDAD] NODE_ENV esta configurado como 'production'." -ForegroundColor Red
    Write-Host "              Los scripts locales estan disenados exclusivamente para desarrollo y demo." -ForegroundColor Red
    exit 1
}

# 1. Comprobar si ya existe una instancia activa registrada
if (Test-Path $pidFile) {
    $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($existingPid) {
        $existingProc = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
        if ($existingProc -and ($existingProc.ProcessName -like "*node*")) {
            Write-Host "  [WARN] Ya existe una instancia del Frontend ejecutandose (PID: $existingPid)." -ForegroundColor Yellow
            Write-Host "         Para detenerla use: powershell -File scripts/stop-frontend.ps1 -Port $Port" -ForegroundColor DarkGray
            Write-Host "         Acceso web: http://localhost:$Port/`n" -ForegroundColor Green
            if (-not $NoBrowser) {
                Start-Process "http://localhost:$Port"
            }
            exit 0
        } else {
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        }
    }
}

# 2. Comprobar si el puerto ya esta en uso
$portConn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($portConn) {
    $owningPid = $portConn[0].OwningProcess
    $owningProc = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
    $pName = if ($owningProc) { $owningProc.ProcessName } else { "PID $owningPid" }
    Write-Host "  [FAIL] El puerto $Port ya esta ocupado por otro proceso: $pName." -ForegroundColor Red
    Write-Host "         Detenga ese proceso o especifique un puerto diferente con -Port <numero>.`n" -ForegroundColor Yellow
    exit 1
}

# 3. Validar dependencias locales
if (-not (Test-Path (Join-Path $frontendDir "node_modules")) -or -not (Test-Path $nextBin)) {
    Write-Host "  [INFO] Dependencias de frontend faltantes. Instalando..." -ForegroundColor Yellow
    npm --prefix $frontendDir install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Error al instalar dependencias de apps/frontend." -ForegroundColor Red
        exit 1
    }
}

# 4. Asegurar directorios de soporte
$folders = @(".run", ".logs")
foreach ($f in $folders) {
    $fp = Join-Path $repoRoot $f
    if (-not (Test-Path $fp)) {
        New-Item -ItemType Directory -Path $fp -Force | Out-Null
    }
}

# Limpieza controlada opcional unicamente si el operador pasa -Clean explicitamente
if ($Clean) {
    $devCacheDir = Join-Path $frontendDir ".next-dev"
    if (Test-Path $devCacheDir) {
        Write-Host "  [INFO] Limpiando cache de desarrollo ($devCacheDir)..." -ForegroundColor DarkGray
        Remove-Item -Recurse -Force $devCacheDir -ErrorAction SilentlyContinue
    }
}

# 5. Ejecucion
$startArgs = @(
    $nextBin,
    "dev",
    ".",
    "-p",
    "$Port",
    "-H",
    "$HostAddress"
)

if ($Foreground) {
    Write-Host "  Iniciando Next.js en primer plano (Ctrl+C para detener)...`n" -ForegroundColor Yellow
    Set-Location $frontendDir
    & node $startArgs
    exit $LASTEXITCODE
} else {
    Write-Host "  Iniciando proceso Next.js en segundo plano..." -ForegroundColor Yellow
    Write-Host "  Directorio  : $frontendDir" -ForegroundColor DarkGray
    Write-Host "  Archivo log : $logFile" -ForegroundColor DarkGray

    $process = Start-Process -FilePath "node" `
        -ArgumentList $startArgs `
        -WorkingDirectory $frontendDir `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError $errLogFile `
        -WindowStyle Hidden `
        -PassThru

    Set-Content -Path $pidFile -Value $process.Id -Encoding UTF8

    Write-Host "  Proceso iniciado con PID: $($process.Id)" -ForegroundColor Green
    Write-Host "  Esperando disponibilidad HTTP (http://127.0.0.1:$Port/)..." -ForegroundColor Yellow

    # Sondeo HTTP hasta TimeoutSec
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $ready = $false

    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 800

        # Verificar que el proceso continue vivo
        $checkProc = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
        if (-not $checkProc) {
            Write-Host "  [FAIL] El proceso Next.js finalizo abruptamente. Revise los logs en $logFile." -ForegroundColor Red
            if (Test-Path $logFile) {
                Get-Content $logFile -Tail 15 | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkRed }
            }
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
            exit 1
        }

        try {
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) {
                $ready = $true
                break
            }
        } catch {}
    }

    if ($ready) {
        Write-Host "`n=======================================================" -ForegroundColor Green
        Write-Host " FRONTEND NEXT.JS EN LINEA" -ForegroundColor Green
        Write-Host "=======================================================" -ForegroundColor Green
        Write-Host "  Dashboard SaaS : http://localhost:$Port/" -ForegroundColor Cyan
        Write-Host "  Host Address   : $HostAddress" -ForegroundColor DarkGray
        Write-Host "  PID            : $($process.Id)" -ForegroundColor DarkGray
        Write-Host "  Logs en vivo   : Get-Content $logFile -Wait" -ForegroundColor DarkGray
        Write-Host "  Para detener   : powershell -File scripts/stop-frontend.ps1 -Port $Port`n" -ForegroundColor DarkGray

        if (-not $NoBrowser) {
            Start-Process "http://localhost:$Port"
        }
        exit 0
    } else {
        Write-Host "`n  [FAIL] El frontend Next.js no respondio dentro de $TimeoutSec segundos." -ForegroundColor Red
        if (Test-Path $logFile) {
            Write-Host "  Ultimas lineas del log ($logFile):" -ForegroundColor Yellow
            Get-Content $logFile -Tail 15 | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkGray }
        }
        exit 1
    }
}
