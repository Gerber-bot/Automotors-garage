<#
.SYNOPSIS
    Inicia Automotors Garage en modo LAN para pruebas en dispositivos moviles.
.DESCRIPTION
    Detecta automaticamente la direccion IPv4 de la interfaz privada activa, inicia el
    servidor escuchando en todas las interfaces (HOST=0.0.0.0), verifica disponibilidad
    y presenta las URLs de conexion para la PC y para celulares en la misma red Wi-Fi.
.PARAMETER Port
    Puerto TCP a utilizar (por defecto: 4000).
.PARAMETER Environment
    Entorno a ejecutar: 'demo' (por defecto) o 'development'.
.PARAMETER NoBrowser
    Si se especifica, no abre el navegador en la PC automaticamente.
#>
[CmdletBinding()]
param(
    [int]$Port = 4000,
    [ValidateSet("demo", "development")]
    [string]$Environment = "demo",
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
Set-Location $repoRoot

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- MODO LAN & PRUEBAS MOVILES" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

# 0. Salvaguarda de produccion
if ($env:NODE_ENV -eq "production") {
    Write-Host "  [SEGURIDAD] NODE_ENV esta configurado como 'production'." -ForegroundColor Red
    Write-Host "              El modo LAN es exclusivo para desarrollo y pruebas locales." -ForegroundColor Red
    exit 1
}

# 1. Verificacion de entorno previo
Write-Host "PASO 1/4: Verificando requisitos de ejecucion..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "check-env.ps1") -Port $Port
if ($LASTEXITCODE -ne 0) {
    Write-Error "El chequeo de entorno fallo. Corrija los errores antes de continuar."
    exit 1
}

# 2. Deteccion de direccion IPv4 en red privada (filtrando VPNs y virtuales)
Write-Host "`nPASO 2/4: Detectando interfaz de red local activa..." -ForegroundColor Yellow

function Get-LanIPv4Address {
    $virtualPatterns = @(
        "*vEthernet*", "*WSL*", "*Hyper-V*", "*VirtualBox*",
        "*VMware*", "*Loopback*", "*Teredo*", "*Tailscale*",
        "*ZeroTier*", "*WireGuard*", "*TAP*", "*VPN*"
    )

    # Prioridad A: Adaptador con ruta por defecto (gateway a internet/LAN)
    $activeRoute = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
        Sort-Object -Property RouteMetric |
        Select-Object -First 1

    if ($activeRoute) {
        $adapter = Get-NetAdapter -InterfaceIndex $activeRoute.InterfaceIndex -ErrorAction SilentlyContinue
        if ($adapter -and $adapter.Status -eq "Up") {
            $isVirtual = $false
            foreach ($pat in $virtualPatterns) {
                if ($adapter.Name -like $pat -or $adapter.InterfaceDescription -like $pat) {
                    $isVirtual = $true
                    break
                }
            }
            if (-not $isVirtual) {
                $ipCandidate = (Get-NetIPAddress -InterfaceIndex $activeRoute.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }).IPAddress
                if ($ipCandidate) {
                    return @{
                        IP = $ipCandidate
                        AdapterName = $adapter.Name
                        Description = $adapter.InterfaceDescription
                    }
                }
            }
        }
    }

    # Prioridad B: Cualquier direccion privada RFC 1918 activa
    $privateIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            ($_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.1[6-9].*" -or $_.IPAddress -like "172.2[0-9].*" -or $_.IPAddress -like "172.3[0-1].*")
        }

    foreach ($entry in $privateIps) {
        $adapter = Get-NetAdapter -InterfaceIndex $entry.InterfaceIndex -ErrorAction SilentlyContinue
        if ($adapter -and $adapter.Status -eq "Up") {
            $isVirtual = $false
            foreach ($pat in $virtualPatterns) {
                if ($adapter.Name -like $pat -or $adapter.InterfaceDescription -like $pat) {
                    $isVirtual = $true
                    break
                }
            }
            if (-not $isVirtual) {
                return @{
                    IP = $entry.IPAddress
                    AdapterName = $adapter.Name
                    Description = $adapter.InterfaceDescription
                }
            }
        }
    }

    return $null
}

$lanInfo = Get-LanIPv4Address

if (-not $lanInfo) {
    Write-Host "  [WARN] No se detecto ninguna interfaz de red privada activa." -ForegroundColor Yellow
    Write-Host "         Se utilizara '127.0.0.1' como fallback local." -ForegroundColor DarkGray
    $lanIp = "127.0.0.1"
    $adapterName = "Loopback"
} else {
    $lanIp = $lanInfo.IP
    $adapterName = "$($lanInfo.AdapterName) ($($lanInfo.Description))"
    Write-Host "  Interfaz detectada : $adapterName" -ForegroundColor Green
    Write-Host "  Direccion IPv4 LAN : $lanIp" -ForegroundColor Green
}

# 3. Comprobar si ya existe un servidor activo
$pidFile = Join-Path $repoRoot ".run/server.pid"
if (Test-Path $pidFile) {
    $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($existingPid -match '^\d+$') {
        $proc = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
        if ($proc -and ($proc.ProcessName -like "*node*")) {
            Write-Host "  [INFO] Se detecto una instancia previa en ejecucion (PID: $existingPid)." -ForegroundColor Yellow
            Write-Host "         Reiniciando para garantizar escucha en todas las interfaces (0.0.0.0)..." -ForegroundColor DarkGray
            & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "stop-dev.ps1") -Port $Port
            Start-Sleep -Seconds 1
        }
    }
}

# 4. Iniciar servidor con HOST=0.0.0.0
Write-Host "`nPASO 3/4: Iniciando servidor en modo LAN (HOST=0.0.0.0)..." -ForegroundColor Yellow

$env:HOST = "0.0.0.0"
$env:ENABLE_LAN = "true"

if ($Environment -eq "demo") {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "start-demo.ps1") -Port $Port -HostAddress "0.0.0.0" -NoBrowser
} else {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "start-dev.ps1") -Port $Port -HostAddress "0.0.0.0"
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo el inicio del servidor en modo LAN."
    exit 1
}

# 5. Comprobar respuesta de salud en loopback y en IP LAN
Write-Host "`nPASO 4/4: Validando disponibilidad del servicio..." -ForegroundColor Yellow
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "check-health.ps1") -Port $Port -ServerHost "127.0.0.1" -Silent
$localHealth = ($LASTEXITCODE -eq 0)

$lanHealth = $false
if ($lanIp -ne "127.0.0.1") {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "check-health.ps1") -Port $Port -ServerHost $lanIp -Silent
    $lanHealth = ($LASTEXITCODE -eq 0)
} else {
    $lanHealth = $localHealth
}

# 6. Salida estructurada de URLs de acceso
$targetPath = if ($Environment -eq "demo") { "/demo" } else { "/" }
$pcUrl = "http://localhost:${Port}${targetPath}"
$mobileUrl = "http://${lanIp}:${Port}${targetPath}"

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " AUTOMOTORS GARAGE -- MOBILE DEVELOPMENT" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Servidor: ONLINE" -ForegroundColor Green
Write-Host "  Puerto  : $Port" -ForegroundColor Green
Write-Host "  Modo    : LAN (0.0.0.0)`n" -ForegroundColor Green
Write-Host "  PC:" -ForegroundColor Cyan
Write-Host "  $pcUrl`n" -ForegroundColor White
Write-Host "  CELULAR:" -ForegroundColor Yellow
Write-Host "  $mobileUrl" -ForegroundColor White
Write-Host "=======================================================`n" -ForegroundColor Green

Write-Host "INSTRUCCIONES PARA CONECTAR EL CELULAR O TABLET:" -ForegroundColor Cyan
Write-Host "  1. Asegurese de que el celular este conectado a la misma red Wi-Fi." -ForegroundColor White
Write-Host "  2. Abra el navegador web en el celular (Chrome, Safari, Firefox)." -ForegroundColor White
Write-Host "  3. Ingrese la URL indicada arriba: $mobileUrl`n" -ForegroundColor White

# 7. Diagnostico informativo de Windows Firewall
$firewallRule = Get-NetFirewallPortFilter -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -eq "$Port" -or $_.LocalPort -contains "$Port" }

if (-not $firewallRule) {
    Write-Host "-------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "INFORMACION DE RED (WINDOWS FIREWALL):" -ForegroundColor DarkGray
    Write-Host "  Si el celular no logra conectar, es posible que Windows Defender" -ForegroundColor DarkGray
    Write-Host "  Firewall este bloqueando el puerto entrante $Port en el perfil actual." -ForegroundColor DarkGray
    Write-Host "  Comando recomendado para autorizar en perfil Privado (como Administrador):" -ForegroundColor DarkGray
    Write-Host "  New-NetFirewallRule -DisplayName 'Automotors Garage LAN Dev' -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -Profile Private -RemoteAddress LocalSubnet`n" -ForegroundColor DarkGray
}

# 8. Abrir navegador en la PC
if (-not $NoBrowser) {
    try {
        Start-Process $pcUrl
        Write-Host "  [INFO] Navegador local abierto en $pcUrl" -ForegroundColor Green
    } catch {
        # no fatal
    }
}

Write-Host "Para detener el servidor ejecute: powershell -File scripts/stop-dev.ps1 -Port $Port`n" -ForegroundColor DarkGray
exit 0
