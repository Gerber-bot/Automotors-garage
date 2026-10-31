<#
.SYNOPSIS
    Inicia el stack completo de desarrollo de Automotors Garage (Backend + Frontend Next.js).
.DESCRIPTION
    Verifica precondiciones, dependencias, inicia el servidor backend (puerto 4000), valida /health/ready,
    inicia el frontend Next.js (puerto 3000), comprueba disponibilidad HTTP, abre el
    dashboard SaaS y maneja limpiezas controladas ante eventuales fallas.
.PARAMETER BackendPort
    Puerto TCP del backend API (por defecto: 4000).
.PARAMETER FrontendPort
    Puerto TCP del frontend Next.js (por defecto: 3000).
.PARAMETER HostAddress
    Direccion IP a escuchar (por defecto: 127.0.0.1; o 0.0.0.0 con -LAN).
.PARAMETER LAN
    Habilita el modo de escucha en todas las interfaces para pruebas desde telefonos o tablets en la red local.
.PARAMETER Demo
    Si se especifica, inicia el backend con seed de datos de demostracion preconfigurados.
.PARAMETER NoBrowser
    Omite la apertura automatica del navegador web.
.PARAMETER TimeoutSec
    Segundos maximos de espera por servicio (por defecto: 35).
#>
[CmdletBinding()]
param(
    [int]$BackendPort = 4000,
    [int]$FrontendPort = 3000,
    [string]$HostAddress = "127.0.0.1",
    [switch]$LAN,
    [switch]$Demo,
    [switch]$NoBrowser,
    [int]$TimeoutSec = 35
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptDir "../..")).Path
$utilsPath = Join-Path $scriptDir "../utilities/process-utils.ps1"
if (Test-Path $utilsPath) {
    . $utilsPath
}
Set-Location $repoRoot

Ensure-RuntimeDirectories -Root $repoRoot

$backendPidFile = Join-Path $repoRoot ".run/server.pid"
$frontendPidFile = Join-Path $repoRoot ".run/frontend.pid"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- STACK COMPLETO (DESARROLLO LOCAL)" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

# 0. Salvaguarda de produccion
if ($env:NODE_ENV -eq "production") {
    Write-Host "  [SEGURIDAD] NODE_ENV esta configurado como 'production'." -ForegroundColor Red
    Write-Host "              Los scripts locales estan disenados exclusivamente para desarrollo y pruebas." -ForegroundColor Red
    exit 1
}

# 1. Asegurar archivo .env
$envPath = Join-Path $repoRoot ".env"
$envExamplePath = Join-Path $repoRoot ".env.example"
if (-not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item -Path $envExamplePath -Destination $envPath
        Write-Host "  [CONFIG] Creado archivo .env a partir de .env.example (PGlite predeterminado)." -ForegroundColor Green
    }
}

# 2. Configuracion de interfaz y deteccion LAN
$detectedLanIp = $null
if ($LAN) {
    $HostAddress = "0.0.0.0"
    $lanInfo = Get-LanIPv4Address
    if ($lanInfo) {
        $detectedLanIp = $lanInfo.IP
        Write-Host "  [LAN] Interfaz privada detectada: $detectedLanIp ($($lanInfo.AdapterName))" -ForegroundColor Green
    } else {
        Write-Host "  [LAN] No se detecto IP privada activa; usando 0.0.0.0 con fallback local." -ForegroundColor Yellow
        $detectedLanIp = "127.0.0.1"
    }
}

# 3. Rastrear instancias preexistentes
$backendWasAlreadyRunning = $false
$frontendWasAlreadyRunning = $false

if (Test-Path $backendPidFile) {
    $bPid = Get-Content $backendPidFile -ErrorAction SilentlyContinue
    if ($bPid -and (Get-Process -Id ([int]$bPid) -ErrorAction SilentlyContinue)) {
        $backendWasAlreadyRunning = $true
    }
}
$bConn = Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue
if ($bConn) { $backendWasAlreadyRunning = $true }

if (Test-Path $frontendPidFile) {
    $fPid = Get-Content $frontendPidFile -ErrorAction SilentlyContinue
    if ($fPid -and (Get-Process -Id ([int]$fPid) -ErrorAction SilentlyContinue)) {
        $frontendWasAlreadyRunning = $true
    }
}
$fConn = Get-NetTCPConnection -LocalPort $FrontendPort -State Listen -ErrorAction SilentlyContinue
if ($fConn) { $frontendWasAlreadyRunning = $true }

# 4. Validar entorno
Write-Host "[1/4] Verificando requisitos de ejecucion..." -ForegroundColor Yellow
$checkEnvScript = Join-Path $repoRoot "scripts/utilities/check-env.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $checkEnvScript -Port $BackendPort
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] La verificacion de entorno reporto errores no recuperables." -ForegroundColor Red
    exit 1
}

# 5. Iniciar Backend
Write-Host "`n[2/4] Preparando servidor Backend (puerto: $BackendPort)..." -ForegroundColor Yellow
if ($backendWasAlreadyRunning) {
    Write-Host "  [INFO] El Backend ya se encuentra activo en puerto $BackendPort." -ForegroundColor Green
} else {
    $backendScript = if ($Demo) { "start-demo.ps1" } else { "start-dev.ps1" }
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptDir $backendScript) `
        -Port $BackendPort -HostAddress $HostAddress -TimeoutSec $TimeoutSec

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] No fue posible iniciar el servidor Backend." -ForegroundColor Red
        exit 1
    }
}

# 6. Verificar salud y persistencia del Backend (/health/ready)
Write-Host "`n[3/4] Verificando salud y persistencia del Backend (/health/ready)..." -ForegroundColor Yellow
$deadline = (Get-Date).AddSeconds(15)
$backendReady = $false

while ((Get-Date) -lt $deadline) {
    $checkHealthScript = Join-Path $repoRoot "scripts/utilities/check-health.ps1"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $checkHealthScript -Port $BackendPort -Silent
    if ($LASTEXITCODE -eq 0) {
        $backendReady = $true
        break
    }
    Start-Sleep -Milliseconds 600
}

if (-not $backendReady) {
    Write-Host "  [FAIL] El backend no confirmo readiness (Base de datos desconectada o timeout)." -ForegroundColor Red
    if (-not $backendWasAlreadyRunning) {
        Write-Host "  [ROLLBACK] Limpiando backend recien iniciado..." -ForegroundColor Yellow
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptDir "stop-dev.ps1") -Port $BackendPort
    }
    exit 1
}
Write-Host "  [OK] Backend y motor PGlite listos para operar." -ForegroundColor Green

# 7. Iniciar Frontend Next.js
Write-Host "`n[4/4] Preparando Frontend Next.js 15 (puerto: $FrontendPort)..." -ForegroundColor Yellow
if ($frontendWasAlreadyRunning) {
    Write-Host "  [INFO] El Frontend Next.js ya se encuentra activo en puerto $FrontendPort." -ForegroundColor Green
} else {
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptDir "start-frontend.ps1") `
        -Port $FrontendPort -HostAddress $HostAddress -NoBrowser -TimeoutSec $TimeoutSec

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] No fue posible iniciar el Frontend Next.js." -ForegroundColor Red
        if (-not $backendWasAlreadyRunning) {
            Write-Host "  [ROLLBACK] Deteniendo backend para mantener el sistema limpio..." -ForegroundColor Yellow
            & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptDir "stop-dev.ps1") -Port $BackendPort
        }
        exit 1
    }
}

# 8. Informar estado final consolidado
$finalBackendPid = if (Test-Path $backendPidFile) { Get-Content $backendPidFile -ErrorAction SilentlyContinue } else { "Activo" }
$finalFrontendPid = if (Test-Path $frontendPidFile) { Get-Content $frontendPidFile -ErrorAction SilentlyContinue } else { "Activo" }

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " AUTOMOTORS GARAGE -- STACK COMPLETO OPERATIVO" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Landing SaaS      : http://localhost:$FrontendPort/   (PID: $finalFrontendPid)" -ForegroundColor Cyan
Write-Host "  Demo Propietario  : http://localhost:$FrontendPort/demo/propietario" -ForegroundColor Cyan
Write-Host "  Demo Taller       : http://localhost:$FrontendPort/demo/taller" -ForegroundColor Cyan
Write-Host "  Backend API v1    : http://localhost:$BackendPort/api/v1  (PID: $finalBackendPid)" -ForegroundColor DarkCyan
Write-Host "  Health Ready      : http://localhost:$BackendPort/health/ready" -ForegroundColor DarkGray

if ($detectedLanIp -and $LAN) {
    Write-Host "`n  ACCESO DESDE DISPOSITIVOS EN RED LOCAL (MISMA RED WI-FI):" -ForegroundColor Magenta
    Write-Host "  Landing Movil/LAN : http://${detectedLanIp}:${FrontendPort}/" -ForegroundColor Yellow
    Write-Host "  Demo Propietario  : http://${detectedLanIp}:${FrontendPort}/demo/propietario" -ForegroundColor Yellow
    Write-Host "  Demo Taller       : http://${detectedLanIp}:${FrontendPort}/demo/taller" -ForegroundColor Yellow
    Write-Host "  Backend API v1    : http://${detectedLanIp}:${BackendPort}/api/v1" -ForegroundColor DarkGray
    Write-Host "`n  [AVISO FIREWALL WINDOWS]" -ForegroundColor DarkCyan
    Write-Host "  Si otro dispositivo no logra cargar la pagina, verifique que la red este" -ForegroundColor DarkGray
    Write-Host "  configurada como 'Red Privada' en Windows y que el firewall permita Node.js." -ForegroundColor DarkGray
    Write-Host "  Comando seguro (PowerShell admin en red privada):" -ForegroundColor DarkGray
    Write-Host "  New-NetFirewallRule -DisplayName 'Automotors Dev LAN' -Direction Inbound -LocalPort $FrontendPort,$BackendPort -Protocol TCP -Profile Private -Action Allow" -ForegroundColor DarkGray
}

Write-Host "`n-------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Para detener el sistema:" -ForegroundColor Yellow
Write-Host "  Haga doble clic en DETENER_AUTOMOTORS.bat" -ForegroundColor Yellow
Write-Host "  O ejecute: powershell -File scripts/powershell/stop-stack.ps1" -ForegroundColor Yellow
Write-Host "=======================================================`n" -ForegroundColor Green

if (-not $NoBrowser) {
    Start-Process "http://localhost:$FrontendPort/"
}

exit 0
