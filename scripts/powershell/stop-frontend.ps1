<#
.SYNOPSIS
    Detiene de forma limpia el frontend Next.js de Automotors Garage.
.DESCRIPTION
    Identifica el PID registrado en .run/frontend.pid o el proceso node asociado al puerto 3000,
    verifica que pertenezca a apps/frontend y lo detiene sin afectar procesos externos.
.PARAMETER Port
    Puerto TCP monitoreado (por defecto: 3000).
.PARAMETER Force
    Si se especifica, fuerza la detencion si el proceso no responde al cierre limpio.
#>
[CmdletBinding()]
param(
    [int]$Port = 3000,
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

$pidFile = Join-Path $repoRoot ".run/frontend.pid"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- DETENCION DE FRONTEND (PORT: $Port)" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

function Test-IsFrontendProcess([int]$procId) {
    try {
        $cimProc = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
        if ($cimProc -and $cimProc.CommandLine) {
            $cmd = $cimProc.CommandLine
            if ($cmd -like "*apps/frontend*" -or $cmd -like "*next*" -or $cmd -like "*AutomotorsGarage*") {
                return $true
            }
        }
    } catch {}
    return $false
}

$targetPid = $null

# 1. Obtener PID desde archivo .run/frontend.pid
if (Test-Path $pidFile) {
    $rawPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($rawPid -match '^\d+$') {
        $candidateProc = Get-Process -Id ([int]$rawPid) -ErrorAction SilentlyContinue
        if ($candidateProc -and ($candidateProc.ProcessName -like "*node*")) {
            $targetPid = [int]$rawPid
            Write-Host "  PID identificado desde .run/frontend.pid: $targetPid" -ForegroundColor DarkGray
        }
    }
}

# 2. Si no se hallo por PID file, buscar por conexion al puerto
if (-not $targetPid) {
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conn) {
        $portPid = $conn[0].OwningProcess
        $candidateProc = Get-Process -Id $portPid -ErrorAction SilentlyContinue
        if ($candidateProc -and ($candidateProc.ProcessName -like "*node*")) {
            $targetPid = $portPid
            Write-Host "  PID identificado escuchando en puerto ${Port}: $targetPid" -ForegroundColor DarkGray
        }
    }
}

if (-not $targetPid) {
    Write-Host "  [INFO] No se encontro ningun proceso activo del Frontend en puerto $Port." -ForegroundColor Green
    if (Test-Path $pidFile) {
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
    exit 0
}

# 3. Validar pertenencia estricta del proceso
$isOurProcess = Test-IsFrontendProcess -procId $targetPid
if (-not $isOurProcess) {
    $storedPid = if (Test-Path $pidFile) { (Get-Content $pidFile -ErrorAction SilentlyContinue) } else { $null }
    if ($storedPid -ne "$targetPid") {
        Write-Host "  [PROTECCION] El proceso PID $targetPid en puerto $Port no pertenece a Automotors Garage Frontend." -ForegroundColor Yellow
        Write-Host "               Operacion abortada para no interferir con procesos ajenos." -ForegroundColor Yellow
        exit 1
    }
}

# 4. Detener proceso
$procToStop = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
if ($procToStop) {
    Write-Host "  Enviando senal de detencion al proceso node (PID: $targetPid)..." -ForegroundColor Yellow
    
    try {
        if ($Force) {
            Stop-Process -Id $targetPid -Force -ErrorAction Stop
        } else {
            $procToStop.CloseMainWindow() | Out-Null
            Start-Sleep -Milliseconds 800
            
            $stillAlive = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
            if ($stillAlive) {
                Write-Host "  Proceso aun activo; forzando cierre seguro..." -ForegroundColor DarkGray
                Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        Write-Host "  [WARN] Fallo el cierre regular; ejecutando detencion forzada..." -ForegroundColor Yellow
        Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Milliseconds 500
    $verify = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
    if ($verify) {
        Write-Host "  [FAIL] No fue posible detener el proceso PID $targetPid." -ForegroundColor Red
        exit 1
    } else {
        Write-Host "  [OK] Proceso PID $targetPid detenido correctamente." -ForegroundColor Green
    }
}

# 5. Limpiar archivo de PID
if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

Write-Host "  Puerto $Port liberado exitosamente.`n" -ForegroundColor Green
exit 0
