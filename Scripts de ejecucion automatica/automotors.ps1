<#
.SYNOPSIS
    Automotors Garage -- Controlador Unificado de Ejecución Automática.
.DESCRIPTION
    Consolida las operaciones de inicio completo local (START), modo red local / celular (START-LAN)
    y detención segura de servicios (STOP). Maneja dependencias, diagnósticos de salud,
    concurrencia de procesos y persistencia PGlite.
.PARAMETER Action
    Operación a ejecutar: 'START', 'START-LAN' o 'STOP'.
.PARAMETER BackendPort
    Puerto TCP del backend (por defecto: 4000).
.PARAMETER FrontendPort
    Puerto TCP de Next.js (por defecto: 3000).
.PARAMETER NoBrowser
    Omite la apertura automática del navegador web.
.PARAMETER TimeoutSec
    Segundos máximos de espera por servicio (por defecto: 35).
#>
[CmdletBinding()]
param(
    [ValidateSet("START", "START-LAN", "STOP")]
    [string]$Action = "START",
    [int]$BackendPort = 4000,
    [int]$FrontendPort = 3000,
    [switch]$NoBrowser,
    [int]$TimeoutSec = 35
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$utilsPath = Join-Path $scriptDir "utilities/process-utils.ps1"
if (Test-Path $utilsPath) {
    . $utilsPath
}
Set-Location $repoRoot

Ensure-RuntimeDirectories -Root $repoRoot

$backendPidFile = Join-Path $repoRoot ".run/server.pid"
$frontendPidFile = Join-Path $repoRoot ".run/frontend.pid"
$backendLogFile = Join-Path $repoRoot ".logs/server_dev.log"
$backendErrLogFile = Join-Path $repoRoot ".logs/server_dev.err.log"
$frontendLogFile = Join-Path $repoRoot ".logs/frontend_dev.log"
$frontendErrLogFile = Join-Path $repoRoot ".logs/frontend_dev.err.log"
$frontendDir = Join-Path $repoRoot "apps/frontend"
$nextBin = Join-Path $frontendDir "node_modules/next/dist/bin/next"

# ==============================================================================
# SUBRUTINA: DETENER SERVICIOS (STOP)
# ==============================================================================
function Invoke-AutomotorsStop {
    Write-Host "`n=======================================================" -ForegroundColor Cyan
    Write-Host " AUTOMOTORS GARAGE -- DETENCION DE SERVICIOS" -ForegroundColor Cyan
    Write-Host "=======================================================`n" -ForegroundColor Cyan

    # 1. Detener Frontend Next.js
    Write-Host "[1/2] Verificando Frontend Next.js (puerto: $FrontendPort)..." -ForegroundColor Yellow
    $fPid = Get-ActiveStoredPid -PidFilePath $frontendPidFile -ProcessType "frontend"
    if (-not $fPid) {
        $fConn = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue
        if ($fConn) {
            $candidatePid = $fConn[0].OwningProcess
            if (Test-IsAutomotorsProcess -ProcId $candidatePid -ProcessType "frontend") {
                $fPid = $candidatePid
            }
        }
    }

    if ($fPid) {
        Stop-AutomotorsProcessClean -ProcId $fPid -ServiceName "Frontend Next.js" -PidFilePath $frontendPidFile -Force
    } else {
        Write-Host "  [INFO] No hay procesos de Frontend activos en el puerto $FrontendPort." -ForegroundColor Green
        if (Test-Path $frontendPidFile) { Remove-Item $frontendPidFile -Force -ErrorAction SilentlyContinue }
    }

    # 2. Detener Backend API
    Write-Host "`n[2/2] Verificando Backend API (puerto: $BackendPort)..." -ForegroundColor Yellow
    $bPid = Get-ActiveStoredPid -PidFilePath $backendPidFile -ProcessType "backend"
    if (-not $bPid) {
        $bConn = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue
        if ($bConn) {
            $candidatePid = $bConn[0].OwningProcess
            if (Test-IsAutomotorsProcess -ProcId $candidatePid -ProcessType "backend") {
                $bPid = $candidatePid
            }
        }
    }

    if ($bPid) {
        Stop-AutomotorsProcessClean -ProcId $bPid -ServiceName "Backend API" -PidFilePath $backendPidFile -Force
    } else {
        Write-Host "  [INFO] No hay procesos de Backend activos en el puerto $BackendPort." -ForegroundColor Green
        if (Test-Path $backendPidFile) { Remove-Item $backendPidFile -Force -ErrorAction SilentlyContinue }
    }

    # 3. Confirmar preservación de datos
    Write-Host "`n=======================================================" -ForegroundColor Green
    Write-Host " SERVICIOS DETENIDOS Y RECURSOS LIBERADOS" -ForegroundColor Green
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host "  Base de datos PGlite (.data/) preservada intacta." -ForegroundColor DarkGray
    Write-Host "  Archivos de log (.logs/) conservados para diagnostico.`n" -ForegroundColor DarkGray
}

# ==============================================================================
# SUBRUTINA: INICIAR SERVICIOS (START / START-LAN)
# ==============================================================================
function Invoke-AutomotorsStart([bool]$isLanMode) {
    $modeLabel = if ($isLanMode) { "MODO RED LOCAL / LAN" } else { "DESARROLLO LOCAL ESTANDAR" }
    Write-Host "`n=======================================================" -ForegroundColor Cyan
    Write-Host " AUTOMOTORS GARAGE -- INICIO COMPLETO ($modeLabel)" -ForegroundColor Cyan
    Write-Host "=======================================================`n" -ForegroundColor Cyan

    # 0. Salvaguarda de producción
    if ($env:NODE_ENV -eq "production") {
        Write-Host "  [SEGURIDAD] NODE_ENV esta configurado como 'production'." -ForegroundColor Red
        Write-Host "              Los scripts locales estan disenados exclusivamente para desarrollo y pruebas." -ForegroundColor Red
        exit 1
    }

    # 1. Asegurar configuración de entorno (.env)
    $envPath = Join-Path $repoRoot ".env"
    $envExamplePath = Join-Path $repoRoot ".env.example"
    if (-not (Test-Path $envPath)) {
        if (Test-Path $envExamplePath) {
            Copy-Item -Path $envExamplePath -Destination $envPath
            Write-Host "  [CONFIG] Creado archivo .env con valores seguros por defecto (PGlite WASM)." -ForegroundColor Green
        }
    }

    # 2. Detección de red e IP
    $hostAddress = "127.0.0.1"
    $detectedLanIp = $null
    if ($isLanMode) {
        $hostAddress = "0.0.0.0"
        $lanInfo = Get-LanIPv4Address
        if ($lanInfo) {
            $detectedLanIp = $lanInfo.IP
            Write-Host "  [LAN] Interfaz física privada detectada: $detectedLanIp ($($lanInfo.AdapterName))" -ForegroundColor Green
        } else {
            Write-Host "  [LAN] No se detectó IP privada activa; usando 0.0.0.0 con fallback local." -ForegroundColor Yellow
            $detectedLanIp = "127.0.0.1"
        }
    }

    # 3. Comprobar instancias preexistentes
    $backendWasRunning = $false
    $frontendWasRunning = $false

    if (Test-Path $backendPidFile) {
        $storedPid = Get-Content $backendPidFile -ErrorAction SilentlyContinue
        if ($storedPid -and (Get-Process -Id ([int]$storedPid) -ErrorAction SilentlyContinue)) {
            $backendWasRunning = $true
        }
    }
    $bConn = Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue
    if ($bConn) { $backendWasRunning = $true }

    if (Test-Path $frontendPidFile) {
        $storedPid = Get-Content $frontendPidFile -ErrorAction SilentlyContinue
        if ($storedPid -and (Get-Process -Id ([int]$storedPid) -ErrorAction SilentlyContinue)) {
            $frontendWasRunning = $true
        }
    }
    $fConn = Get-NetTCPConnection -LocalPort $FrontendPort -State Listen -ErrorAction SilentlyContinue
    if ($fConn) { $frontendWasRunning = $true }

    # 4. Validar requisitos del entorno
    Write-Host "[1/4] Verificando requisitos de ejecución..." -ForegroundColor Yellow
    $checkEnvScript = Join-Path $scriptDir "utilities/check-env.ps1"
    if (Test-Path $checkEnvScript) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $checkEnvScript -Port $BackendPort
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [FAIL] La comprobación de entorno detectó errores críticos." -ForegroundColor Red
            exit 1
        }
    }

    # 5. Iniciar Backend (puerto 4000)
    Write-Host "`n[2/4] Preparando servidor Backend API (puerto: $BackendPort)..." -ForegroundColor Yellow
    if ($backendWasRunning) {
        Write-Host "  [INFO] El Backend ya se encuentra activo en el puerto $BackendPort." -ForegroundColor Green
    } else {
        $env:NODE_ENV = "development"
        $env:PORT = "$BackendPort"
        $env:HOST = $hostAddress
        $env:PG_DATA_DIR = "./.data/postgres_dev"
        $env:PID_FILE = $backendPidFile

        $backendArgs = @(
            "--experimental-strip-types",
            "apps/backend/src/main.ts"
        )

        $backendProcess = Start-Process -FilePath "node" `
            -ArgumentList $backendArgs `
            -WorkingDirectory $repoRoot `
            -RedirectStandardOutput $backendLogFile `
            -RedirectStandardError $backendErrLogFile `
            -WindowStyle Hidden `
            -PassThru

        Set-Content -Path $backendPidFile -Value $backendProcess.Id -Encoding UTF8
        Write-Host "  Proceso Backend iniciado con PID: $($backendProcess.Id)" -ForegroundColor Green
    }

    # 6. Esperar confirmación de salud del Backend (/health/ready)
    Write-Host "`n[3/4] Verificando salud y persistencia del Backend (/health/ready)..." -ForegroundColor Yellow
    $deadline = (Get-Date).AddSeconds(15)
    $backendReady = $false
    $checkHealthScript = Join-Path $scriptDir "utilities/check-health.ps1"

    while ((Get-Date) -lt $deadline) {
        if (Test-Path $checkHealthScript) {
            & powershell -NoProfile -ExecutionPolicy Bypass -File $checkHealthScript -Port $BackendPort -Silent
            if ($LASTEXITCODE -eq 0) {
                $backendReady = $true
                break
            }
        }
        Start-Sleep -Milliseconds 600
    }

    if (-not $backendReady) {
        Write-Host "  [FAIL] El backend no confirmó readiness (motor PGlite no respondió en tiempo)." -ForegroundColor Red
        if (-not $backendWasRunning) {
            Write-Host "  [ROLLBACK] Limpiando backend recién iniciado..." -ForegroundColor Yellow
            Invoke-AutomotorsStop
        }
        exit 1
    }
    Write-Host "  [OK] Backend y motor PGlite listos para operar." -ForegroundColor Green

    # 7. Iniciar Frontend Next.js (puerto 3000)
    Write-Host "`n[4/4] Preparando Frontend Next.js 15 (puerto: $FrontendPort)..." -ForegroundColor Yellow
    if ($frontendWasRunning) {
        Write-Host "  [INFO] El Frontend ya se encuentra activo en el puerto $FrontendPort." -ForegroundColor Green
    } else {
        if (-not (Test-Path (Join-Path $frontendDir "node_modules")) -or -not (Test-Path $nextBin)) {
            Write-Host "  [INFO] Dependencias de frontend faltantes. Instalando..." -ForegroundColor Yellow
            npm --prefix $frontendDir ci
            if ($LASTEXITCODE -ne 0) {
                npm --prefix $frontendDir install
            }
        }

        $frontendArgs = @(
            $nextBin,
            "dev",
            ".",
            "-p",
            "$FrontendPort",
            "-H",
            "$hostAddress"
        )

        $frontendReady = $false
        $attempts = 0
        $maxAttempts = 2

        while ($attempts -lt $maxAttempts -and -not $frontendReady) {
            $attempts++
            $frontendProcess = Start-Process -FilePath "node" `
                -ArgumentList $frontendArgs `
                -WorkingDirectory $frontendDir `
                -RedirectStandardOutput $frontendLogFile `
                -RedirectStandardError $frontendErrLogFile `
                -WindowStyle Hidden `
                -PassThru

            Set-Content -Path $frontendPidFile -Value $frontendProcess.Id -Encoding UTF8
            Write-Host "  Proceso Frontend iniciado con PID: $($frontendProcess.Id)" -ForegroundColor Green
            Write-Host "  Aguardando disponibilidad de Next.js (http://127.0.0.1:$FrontendPort/)..." -ForegroundColor Yellow

            $deadline = (Get-Date).AddSeconds($TimeoutSec)
            $processExitedAbruptly = $false

            while ((Get-Date) -lt $deadline) {
                Start-Sleep -Milliseconds 800
                $checkProc = Get-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
                if (-not $checkProc) {
                    $processExitedAbruptly = $true
                    break
                }

                try {
                    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$FrontendPort/" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
                    if ($resp.StatusCode -eq 200) {
                        $frontendReady = $true
                        break
                    }
                } catch {}
            }

            if ($frontendReady) {
                break
            }

            if ($processExitedAbruptly -and $attempts -lt $maxAttempts) {
                Write-Host "  [AUTO-REPAIR] Next.js reportó bloqueo de caché transitoria (OneDrive/.next-dev). Purgando caché y reintentando..." -ForegroundColor Yellow
                $devCache = Join-Path $frontendDir ".next-dev"
                if (Test-Path $devCache) {
                    Remove-Item -Recurse -Force $devCache -ErrorAction SilentlyContinue
                }
                Start-Sleep -Milliseconds 600
                continue
            }

            if (-not $frontendReady) {
                Write-Host "  [FAIL] El proceso Next.js no respondió dentro del tiempo límite o finalizó abruptamente. Revise $frontendLogFile." -ForegroundColor Red
                if (Test-Path $frontendLogFile) {
                    Get-Content $frontendLogFile -Tail 15 | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkRed }
                }
                Invoke-AutomotorsStop
                exit 1
            }
        }
    }

    # 8. Consolidar estado final
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

    if ($isLanMode -and $detectedLanIp) {
        Write-Host "`n  ACCESO DESDE DISPOSITIVOS EN RED LOCAL (MISMA RED WI-FI):" -ForegroundColor Magenta
        Write-Host "  Landing Móvil/LAN : http://${detectedLanIp}:${FrontendPort}/" -ForegroundColor Yellow
        Write-Host "  Demo Propietario  : http://${detectedLanIp}:${FrontendPort}/demo/propietario" -ForegroundColor Yellow
        Write-Host "  Demo Taller       : http://${detectedLanIp}:${FrontendPort}/demo/taller" -ForegroundColor Yellow
        Write-Host "  API Backend       : http://${detectedLanIp}:${BackendPort}/api/v1" -ForegroundColor DarkGray
        Write-Host "`n  [AVISO FIREWALL WINDOWS]" -ForegroundColor DarkCyan
        Write-Host "  Si otro dispositivo no logra cargar la pagina, verifique que la red este" -ForegroundColor DarkGray
        Write-Host "  configurada como 'Red Privada' en Windows y que el firewall permita Node.js." -ForegroundColor DarkGray
        Write-Host "  Comando seguro (PowerShell admin en red privada):" -ForegroundColor DarkGray
        Write-Host "  New-NetFirewallRule -DisplayName 'Automotors Dev LAN' -Direction Inbound -LocalPort $FrontendPort,$BackendPort -Protocol TCP -Profile Private -Action Allow" -ForegroundColor DarkGray
    }

    Write-Host "`n-------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  Para detener el sistema:" -ForegroundColor Yellow
    Write-Host "  Ejecute DETENER_AUTOMOTORS.bat dentro de 'Scripts de ejecucion automatica'" -ForegroundColor Yellow
    Write-Host "  O use: npm run dev:stop" -ForegroundColor Yellow
    Write-Host "=======================================================`n" -ForegroundColor Green

    if (-not $NoBrowser) {
        Start-Process "http://localhost:$FrontendPort/"
    }
}

# ==============================================================================
# ENRUTADOR PRINCIPAL
# ==============================================================================
switch ($Action) {
    "START"     { Invoke-AutomotorsStart -isLanMode $false }
    "START-LAN" { Invoke-AutomotorsStart -isLanMode $true }
    "STOP"      { Invoke-AutomotorsStop }
}
