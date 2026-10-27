<#
.SYNOPSIS
    Detiene de forma limpia el servidor backend de Automotors Garage.
.DESCRIPTION
    Identifica el PID registrado en .run/server.pid o el proceso node asociado al puerto,
    verifica que pertenezca a este repositorio y lo cierra ordenadamente sin tocar procesos ajenos.
.PARAMETER Port
    Puerto TCP monitoreado (por defecto: 4000).
.PARAMETER Force
    Si se especifica, fuerza la detencion si el proceso no responde al cierre limpio.
#>
[CmdletBinding()]
param(
    [int]$Port = 4000,
    [switch]$Force
)

$ErrorActionPreference = "Continue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
Set-Location $repoRoot

$pidFile = Join-Path $repoRoot ".run/server.pid"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- DETENCION DE SERVICIOS" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

function Test-IsAutomotorsProcess([int]$procId) {
    try {
        $cimProc = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
        if ($cimProc -and $cimProc.CommandLine) {
            $cmd = $cimProc.CommandLine
            if ($cmd -like "*AutomotorsGarage*" -or $cmd -like "*apps/backend/src/main.ts*" -or $cmd -like "*seed-demo*") {
                return $true
            }
        }
    } catch {}
    return $false
}

$targetPid = $null

# 1. Obtener PID desde archivo .run/server.pid
if (Test-Path $pidFile) {
    $rawPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($rawPid -match '^\d+$') {
        $candidateProc = Get-Process -Id ([int]$rawPid) -ErrorAction SilentlyContinue
        if ($candidateProc -and ($candidateProc.ProcessName -like "*node*")) {
            $targetPid = [int]$rawPid
            Write-Host "  PID identificado desde .run/server.pid: $targetPid" -ForegroundColor DarkGray
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
    Write-Host "  [INFO] No se encontro ningun proceso activo de Automotors Garage en puerto $Port." -ForegroundColor Green
    if (Test-Path $pidFile) {
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
    exit 0
}

# 3. Validar pertenencia estricta del proceso al proyecto Automotors Garage
$isOurProcess = Test-IsAutomotorsProcess -procId $targetPid
if (-not $isOurProcess) {
    # Si no coincide la linea de comando pero el PID coincide exactamente con el archivo .run/server.pid local:
    $storedPid = if (Test-Path $pidFile) { (Get-Content $pidFile -ErrorAction SilentlyContinue) } else { $null }
    if ($storedPid -ne "$targetPid") {
        Write-Host "  [PROTECCION] El proceso PID $targetPid en puerto $Port no pertenece a Automotors Garage." -ForegroundColor Yellow
        Write-Host "               Operacion abortada para no interferir con procesos externos al proyecto." -ForegroundColor Yellow
        exit 1
    }
}

# 3. Detener proceso
$procToStop = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
if ($procToStop) {
    Write-Host "  Enviando senal de detencion al proceso node (PID: $targetPid)..." -ForegroundColor Yellow
    
    try {
        if ($Force) {
            Stop-Process -Id $targetPid -Force -ErrorAction Stop
        } else {
            # Intento de cierre ordenado
            $procToStop.CloseMainWindow() | Out-Null
            # Esperar hasta 4 segundos por salida ordenada
            $procToStop.WaitForExit(4000)
            
            if (-not $procToStop.HasExited) {
                Write-Host "  El proceso no cerro voluntariamente; finalizando..." -ForegroundColor Yellow
                Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
            }
        }
        Write-Host "  [OK] Proceso $targetPid detenido con exito." -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] Error al detener proceso: $_" -ForegroundColor Yellow
        Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
    }
}

# 4. Limpieza del archivo de PID
if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "  Registro .run/server.pid eliminado." -ForegroundColor DarkGray
}

# 5. Confirmar liberacion del puerto
Start-Sleep -Milliseconds 500
$remainingConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($remainingConn) {
    Write-Host "  [WARN] El puerto $Port aun aparece en TIME_WAIT o activo." -ForegroundColor Yellow
} else {
    Write-Host "  [OK] Puerto $Port completamente liberado." -ForegroundColor Green
}

Write-Host "  [OK] Datos locales (.data/) preservados intactos.`n" -ForegroundColor DarkGray
exit 0
