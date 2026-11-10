<#
.SYNOPSIS
    Automotors Garage -- Controlador Unificado de Ejecución Automática.
.DESCRIPTION
    Consolida las operaciones de inicio completo local (START), modo red local / celular (START-LAN)
    y detención segura de servicios (STOP). Maneja dependencias, diagnósticos de salud,
    concurrencia de procesos y persistencia PGlite.
.PARAMETER Action
    Operación a ejecutar: 'START', 'START-LAN', 'STOP' o 'CHECK'.
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
    [ValidateSet("START", "START-LAN", "STOP", "CHECK")]
    [string]$Action = "START",
    [int]$BackendPort = 4000,
    [int]$FrontendPort = 3000,
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
$backendManifest = Join-Path $repoRoot '.run/backend.process.json'
$frontendManifest = Join-Path $repoRoot '.run/frontend.process.json'
$backendControl = Join-Path $repoRoot '.run/backend.control.json'
$frontendControl = Join-Path $repoRoot '.run/frontend.control.json'
$backendLogFile = Join-Path $repoRoot ".logs/server_dev.log"
$backendErrLogFile = Join-Path $repoRoot ".logs/server_dev.err.log"
$frontendLogFile = Join-Path $repoRoot ".logs/frontend_dev.log"
$frontendErrLogFile = Join-Path $repoRoot ".logs/frontend_dev.err.log"
$frontendDir = Join-Path $repoRoot "apps/frontend"
$nextBin = Join-Path $frontendDir "node_modules/next/dist/bin/next"
$frontendEntry = Join-Path $frontendDir 'dev-server.mjs'

# ==============================================================================
# SUBRUTINA: DETENER SERVICIOS (STOP)
# ==============================================================================
function Invoke-AutomotorsStop {
    Write-Host "`n=======================================================" -ForegroundColor Cyan
    Write-Host " AUTOMOTORS GARAGE -- DETENCION DE SERVICIOS" -ForegroundColor Cyan
    Write-Host "=======================================================`n" -ForegroundColor Cyan

    $frontendStopped = Stop-OwnedProcessGracefully -ManifestPath $frontendManifest -ControlPath $frontendControl -Root $repoRoot -Role frontend
    $backendStopped = Stop-OwnedProcessGracefully -ManifestPath $backendManifest -ControlPath $backendControl -Root $repoRoot -Role backend
    if (-not ($frontendStopped -and $backendStopped)) { throw 'One or more services could not be stopped gracefully.' }

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
    Remove-Item Env:AUTOMOTORS_MANAGED_START -ErrorAction SilentlyContinue
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

    # Optional .env is read by the backend and migration command; never create it implicitly.

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

    # An occupied port is never evidence of ownership. Clear only records whose
    # recorded process is definitively gone; anything ambiguous fails closed.
    foreach ($spec in @(
        @{ Manifest = $backendManifest; Control = $backendControl; Role = 'backend' },
        @{ Manifest = $frontendManifest; Control = $frontendControl; Role = 'frontend' }
    )) {
        if ((Test-Path $spec.Manifest) -and -not (Get-OwnedProcess -ManifestPath $spec.Manifest -Root $repoRoot -Role $spec.Role)) {
            if (-not (Clear-StaleOwnedRecord -ManifestPath $spec.Manifest -ControlPath $spec.Control -Root $repoRoot -Role $spec.Role)) {
                throw "Unverified $($spec.Role) process manifest at $($spec.Manifest). Resolve it manually before starting."
            }
            Write-Host "  [INFO] Registro de proceso $($spec.Role) inactivo descartado." -ForegroundColor DarkGray
        }
    }
    try {
        $backendOwned = Assert-AvailableOwnedPort -Port $BackendPort -ManifestPath $backendManifest -Root $repoRoot -Role backend
        $frontendOwned = Assert-AvailableOwnedPort -Port $FrontendPort -ManifestPath $frontendManifest -Root $repoRoot -Role frontend
    } catch {
        if ($_.Exception.Data['OwnedProcessActive']) {
            Write-Host $_.Exception.Message -ForegroundColor Yellow
            return
        }
        throw
    }
    $backendWasRunning = [bool]$backendOwned
    $frontendWasRunning = [bool]$frontendOwned
    if ($BackendPort -eq $FrontendPort) { throw 'Backend and frontend ports must differ.' }

    if ($backendWasRunning -or $frontendWasRunning) {
        Write-Host 'Automotors is already running (or partially running) in this installation.' -ForegroundColor Yellow
        Write-Host 'No processes were started or stopped. Use DETENER_AUTOMOTORS.bat before restarting.' -ForegroundColor Yellow
        # Never open PGlite from a second migration-status process while it is in use.
        return
    }

    # 4. Validar requisitos del entorno
    Write-Host "[1/4] Verificando requisitos de ejecución..." -ForegroundColor Yellow
    $checkEnvScript = Join-Path $scriptDir "../utilities/check-env.ps1"
    if (Test-Path $checkEnvScript) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $checkEnvScript -Port $BackendPort -FrontendPort $FrontendPort -Silent
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [FAIL] La comprobación de entorno detectó errores críticos." -ForegroundColor Red
            Write-Host "         Ejecute COMPROBAR_ENTORNO.bat para ver el diagnóstico detallado y soluciones." -ForegroundColor Yellow
            exit 1
        }
    }

    # Migration agent owns this read-only preflight. Never start backend with pending,
    # modified, or unmanaged migrations. STOP and CHECK intentionally skip it.
    # Run through cmd so Node's ".env not found" note on stderr cannot abort the launcher.
    $migrationStatus = cmd /c "npm run db:status 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host $migrationStatus -ForegroundColor Red
        throw 'Migration status preflight failed; run db:status and explicitly apply/adopt as appropriate.'
    }

    # 5. Iniciar Backend (puerto 4000)
    Write-Host "`n[2/4] Preparando servidor Backend API (puerto: $BackendPort)..." -ForegroundColor Yellow
    if ($backendWasRunning) {
        Write-Host "  [INFO] El Backend ya se encuentra activo en el puerto $BackendPort." -ForegroundColor Green
    } else {
        $env:NODE_ENV = "development"
        $env:PORT = "$BackendPort"
        $env:HOST = $hostAddress
        $env:PID_FILE = $backendPidFile

        $backendEntry = Join-Path $repoRoot 'apps/backend/src/main.ts'
        $backendArgs = @(
            "--env-file-if-exists=.env",
            "--experimental-strip-types",
            "`"$backendEntry`""
        )

        try {
            $env:AUTOMOTORS_MANAGED_START = 'true'
            $backendProcess = Start-Process -FilePath "node" `
                -ArgumentList $backendArgs `
                -WorkingDirectory $repoRoot `
                -RedirectStandardOutput $backendLogFile `
                -RedirectStandardError $backendErrLogFile `
                -WindowStyle Hidden `
                -PassThru
        } finally {
            Remove-Item Env:AUTOMOTORS_MANAGED_START -ErrorAction SilentlyContinue
        }

        Save-OwnedProcess -Process $backendProcess -ManifestPath $backendManifest -Root $repoRoot -Role backend -Marker $backendEntry
        Write-Host "  Proceso Backend iniciado con PID: $($backendProcess.Id)" -ForegroundColor Green
    }

    # 6. Esperar confirmación de salud del Backend (/health/ready)
    Write-Host "`n[3/4] Verificando salud y persistencia del Backend (/health/ready)..." -ForegroundColor Yellow
    $deadline = (Get-Date).AddSeconds(25)
    $backendReady = $false
    $checkHealthScript = Join-Path $scriptDir "../utilities/check-health.ps1"

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
            $rollback = Stop-OwnedProcessGracefully -ManifestPath $backendManifest -ControlPath $backendControl -Root $repoRoot -Role backend
            if (-not $rollback) { Write-Warning 'Backend rollback requires manual intervention; no force termination attempted.' }
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

        $env:FRONTEND_PORT = "$FrontendPort"
        $env:HOST = $hostAddress
        try {
            $env:AUTOMOTORS_MANAGED_START = 'true'
            $frontendProcess = Start-Process -FilePath "node" `
                -ArgumentList @('--experimental-strip-types', "`"$frontendEntry`"") `
                -WorkingDirectory $frontendDir `
                -RedirectStandardOutput $frontendLogFile `
                -RedirectStandardError $frontendErrLogFile `
                -WindowStyle Hidden `
                -PassThru
        } finally {
            Remove-Item Env:AUTOMOTORS_MANAGED_START -ErrorAction SilentlyContinue
        }

        Save-OwnedProcess -Process $frontendProcess -ManifestPath $frontendManifest -Root $repoRoot -Role frontend -Marker $frontendEntry
        Write-Host "  Proceso Frontend iniciado con PID: $($frontendProcess.Id)" -ForegroundColor Green
        Write-Host "  Aguardando disponibilidad de Next.js (http://127.0.0.1:$FrontendPort/)..." -ForegroundColor Yellow

        $frontendReady = $false
        $deadline = (Get-Date).AddSeconds($TimeoutSec)

        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 800
            $checkProc = Get-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
            if (-not $checkProc) { break }

            try {
                $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$FrontendPort/" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($resp.StatusCode -eq 200 -and (Test-Path $frontendControl)) {
                    $frontendReady = $true
                    break
                }
            } catch {}
        }

        if (-not $frontendReady) {
            Write-Host "  [FAIL] El proceso Next.js no respondió dentro del tiempo límite o finalizó abruptamente. Revise $frontendLogFile." -ForegroundColor Red
            if (Test-Path $frontendLogFile) {
                Get-Content $frontendLogFile -Tail 15 | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkRed }
            }
            $frontendRollback = Stop-OwnedProcessGracefully -ManifestPath $frontendManifest -ControlPath $frontendControl -Root $repoRoot -Role frontend
            if (-not $frontendRollback) { Write-Warning 'Frontend rollback requires manual intervention; no force termination attempted.' }
            $rollback = Stop-OwnedProcessGracefully -ManifestPath $backendManifest -ControlPath $backendControl -Root $repoRoot -Role backend
            exit 1
        }
    }

    # 8. Consolidar estado final
    $finalBackendPid = if ($backendOwned) { $backendOwned.pid } else { $backendProcess.Id }
    $finalFrontendPid = if ($frontendOwned) { $frontendOwned.pid } else { $frontendProcess.Id }

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
# SUBRUTINA: COMPROBAR ENTORNO (CHECK)
# ==============================================================================
function Invoke-AutomotorsCheck {
    $checkEnvScript = Join-Path $scriptDir "../utilities/check-env.ps1"
    if (Test-Path $checkEnvScript) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $checkEnvScript -Port $BackendPort -FrontendPort $FrontendPort
        exit $LASTEXITCODE
    } else {
        Write-Host "  [ERROR] No se encontró el verificador en: $checkEnvScript" -ForegroundColor Red
        exit 1
    }
}

# ==============================================================================
# ENRUTADOR PRINCIPAL
# ==============================================================================
switch ($Action) {
    "START"     { Invoke-AutomotorsStart -isLanMode $false }
    "START-LAN" { Invoke-AutomotorsStart -isLanMode $true }
    "STOP"      { Invoke-AutomotorsStop }
    "CHECK"     { Invoke-AutomotorsCheck }
}
