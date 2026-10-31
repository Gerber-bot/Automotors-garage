<#
.SYNOPSIS
    Automotors Garage - Shared Process, Network & Health Utility Functions.
.DESCRIPTION
    Provides reusable, safe process management, PID tracking, LAN IP detection,
    and healthcheck helpers across all PowerShell automation scripts.
#>

function Get-RepoRoot {
    param([string]$StartDir)
    if (-not $StartDir) {
        $StartDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
    }
    try {
        $current = (Resolve-Path $StartDir).Path
        while ($current -and -not (Test-Path (Join-Path $current "package.json"))) {
            $parent = Split-Path -Parent $current
            if ($parent -eq $current -or -not $parent) { break }
            $current = $parent
        }
        if (Test-Path (Join-Path $current "package.json")) {
            return $current
        }
    } catch {}
    return (Get-Location).Path
}

function Ensure-RuntimeDirectories {
    param([string]$Root)
    $folders = @(".run", ".logs", ".data")
    foreach ($f in $folders) {
        $path = Join-Path $Root $f
        if (-not (Test-Path $path)) {
            New-Item -ItemType Directory -Path $path -Force | Out-Null
        }
    }
}

function Test-IsAutomotorsProcess {
    param(
        [int]$ProcId,
        [string]$ProcessType = "any" # "backend", "frontend", or "any"
    )
    try {
        $cimProc = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcId" -ErrorAction SilentlyContinue
        if ($cimProc -and $cimProc.CommandLine) {
            $cmd = $cimProc.CommandLine
            $root = Get-RepoRoot
            $leaf = Split-Path -Leaf $root

            $isRepoMatch = ($cmd -like "*$root*" -or $cmd -like "*$leaf*" -or $cmd -like "*AutomotorsGarage*" -or $cmd -like "*Automotors-garage*")
            $isBackend = ($cmd -like "*apps/backend*" -or $cmd -like "*apps\backend*" -or $cmd -like "*main.ts*" -or $cmd -like "*seed-demo*")
            $isFrontend = ($cmd -like "*apps/frontend*" -or $cmd -like "*apps\frontend*" -or $cmd -like "*next*")

            switch ($ProcessType) {
                "backend"  { return ($isRepoMatch -or $isBackend) }
                "frontend" { return ($isRepoMatch -or $isFrontend) }
                default    { return ($isRepoMatch -or $isBackend -or $isFrontend) }
            }
        }
    } catch {}
    return $false
}

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
            ($_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or ($_.IPAddress -like "172.*" -and [int]($_.IPAddress.Split('.')[1]) -ge 16 -and [int]($_.IPAddress.Split('.')[1]) -le 31))
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

function Get-ActiveStoredPid {
    param(
        [string]$PidFilePath,
        [string]$ProcessType = "any"
    )
    if (Test-Path $PidFilePath) {
        $rawPid = Get-Content $PidFilePath -ErrorAction SilentlyContinue
        if ($rawPid -match '^\d+$') {
            $pId = [int]$rawPid
            $proc = Get-Process -Id $pId -ErrorAction SilentlyContinue
            if ($proc -and ($proc.ProcessName -like "*node*")) {
                if (Test-IsAutomotorsProcess -ProcId $pId -ProcessType $ProcessType) {
                    return $pId
                }
            }
            # Orphan or non-project PID: remove stale file
            Remove-Item $PidFilePath -Force -ErrorAction SilentlyContinue
        }
    }
    return $null
}

function Stop-AutomotorsProcessClean {
    param(
        [int]$ProcId,
        [string]$ServiceName = "Servicio",
        [string]$PidFilePath,
        [switch]$Force
    )
    $proc = Get-Process -Id $ProcId -ErrorAction SilentlyContinue
    if (-not $proc) {
        if ($PidFilePath -and (Test-Path $PidFilePath)) {
            Remove-Item $PidFilePath -Force -ErrorAction SilentlyContinue
        }
        return $true
    }

    Write-Host "  Enviando señal de detención a $ServiceName (PID: $ProcId)..." -ForegroundColor Yellow

    try {
        if ($Force) {
            Stop-Process -Id $ProcId -Force -ErrorAction Stop
        } else {
            $proc.CloseMainWindow() | Out-Null
            Start-Sleep -Milliseconds 800

            $stillAlive = Get-Process -Id $ProcId -ErrorAction SilentlyContinue
            if ($stillAlive) {
                Write-Host "  Proceso aún activo; forzando cierre seguro..." -ForegroundColor DarkGray
                Stop-Process -Id $ProcId -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        Write-Host "  [WARN] Falló el cierre regular; ejecutando detención forzada..." -ForegroundColor Yellow
        Stop-Process -Id $ProcId -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Milliseconds 500
    $verify = Get-Process -Id $ProcId -ErrorAction SilentlyContinue
    if ($verify) {
        Write-Host "  [FAIL] No fue posible detener $ServiceName (PID: $ProcId)." -ForegroundColor Red
        return $false
    } else {
        Write-Host "  [OK] $ServiceName (PID: $ProcId) detenido correctamente." -ForegroundColor Green
        if ($PidFilePath -and (Test-Path $PidFilePath)) {
            Remove-Item $PidFilePath -Force -ErrorAction SilentlyContinue
        }
        return $true
    }
}
