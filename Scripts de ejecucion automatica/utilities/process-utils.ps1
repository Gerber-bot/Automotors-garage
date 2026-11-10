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

function Get-CanonicalInstallRoot {
    param([string]$Root)
    return [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Root -ErrorAction Stop).ProviderPath).TrimEnd('\')
}

function Save-OwnedProcess {
    param([System.Diagnostics.Process]$Process, [string]$ManifestPath, [string]$Root, [string]$Role, [string]$Marker)
    $info = Get-CimInstance Win32_Process -Filter "ProcessId = $($Process.Id)" -ErrorAction Stop
    $record = [ordered]@{
        pid = $Process.Id
        createdUtcTicks = [string]$Process.StartTime.ToUniversalTime().Ticks
        root = Get-CanonicalInstallRoot $Root
        role = $Role
        marker = [System.IO.Path]::GetFullPath($Marker)
        executable = $info.ExecutablePath
    }
    $temp = "$ManifestPath.$($Process.Id).tmp"
    [System.IO.File]::WriteAllText($temp, ($record | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $temp -Destination $ManifestPath -Force
}

function Get-OwnedProcess {
    param([string]$ManifestPath, [string]$Root, [ValidateSet('backend','frontend')][string]$Role)
    if (-not (Test-Path -LiteralPath $ManifestPath)) { return $null }
    try {
        $record = Get-Content -LiteralPath $ManifestPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
        if ($record.role -cne $Role -or $record.root -ine (Get-CanonicalInstallRoot $Root) -or
            $record.pid -notmatch '^[1-9]\d*$' -or -not $record.createdUtcTicks -or
            -not $record.marker -or -not $record.executable) { return $null }
        $process = Get-Process -Id ([int]$record.pid) -ErrorAction SilentlyContinue
        if (-not $process) { return $null }
        if ($process.StartTime.ToUniversalTime().Ticks -ne [long]$record.createdUtcTicks) { return $null }
        $info = Get-CimInstance Win32_Process -Filter "ProcessId = $($record.pid)" -ErrorAction Stop
        if ($info.ExecutablePath -ine $record.executable) { return $null }
        # The full absolute entrypoint, delimited as one argument, identifies this installation.
        $escaped = [regex]::Escape($record.marker)
        if ($info.CommandLine -notmatch "(?:^|\s)[`"']?$escaped[`"']?(?:\s|$)") { return $null }
        $expected = if ($Role -eq 'backend') { Join-Path $Root 'apps/backend/src/main.ts' } else { Join-Path $Root 'apps/frontend/dev-server.mjs' }
        if ($record.marker -ine [System.IO.Path]::GetFullPath($expected)) { return $null }
        return $record
    } catch { return $null }
}

function Clear-StaleOwnedRecord {
    param([string]$ManifestPath, [string]$ControlPath, [string]$Root, [string]$Role)
    if (-not (Test-Path -LiteralPath $ManifestPath)) { return $true }
    try {
        $record = Get-Content -LiteralPath $ManifestPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
        if ($record.role -cne $Role -or $record.root -ine (Get-CanonicalInstallRoot $Root) -or
            $record.pid -notmatch '^[1-9]\d*$' -or $record.createdUtcTicks -notmatch '^\d{10,20}$' -or
            -not $record.marker -or -not $record.executable) { return $false }
        $expected = if ($Role -eq 'backend') { Join-Path $Root 'apps/backend/src/main.ts' } else { Join-Path $Root 'apps/frontend/dev-server.mjs' }
        if ($record.marker -ine [System.IO.Path]::GetFullPath($expected)) { return $false }
        $process = Get-Process -Id ([int]$record.pid) -ErrorAction SilentlyContinue
        if ($process) {
            try { $ticks = $process.StartTime.ToUniversalTime().Ticks } catch { return $false }
            # Same PID and same creation time is the recorded live process: never clear it.
            if ($ticks -eq [long]$record.createdUtcTicks) { return $false }
            # The PID now belongs to a different process; the recorded process is gone.
        }
        Remove-Item -LiteralPath $ManifestPath -Force
        if ($ControlPath -and (Test-Path -LiteralPath $ControlPath)) {
            Remove-Item -LiteralPath $ControlPath -Force
        }
        return $true
    } catch { return $false }
}

function Assert-AvailableOwnedPort {
    param([int]$Port, [string]$ManifestPath, [string]$Root, [string]$Role)
    $owned = Get-OwnedProcess -ManifestPath $ManifestPath -Root $Root -Role $Role
    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    $active = [InvalidOperationException]::new('Automotors is already running in this installation; listener ownership cannot be verified. No processes will be started or stopped. Use DETENER_AUTOMOTORS.bat before restarting.')
    $active.Data['OwnedProcessActive'] = $true
    if ($listeners.Count -eq 0) {
        # A verified live process prevents another launch even if Windows cannot
        # attribute its listener. This does NOT establish ownership of the port.
        # The controller must return before migration preflight or spawning anything.
        if ($owned) {
            throw $active
        }
        # Some Windows hosts do not report a just-opened listener via Get-NetTCPConnection.
        # A failed exclusive bind is still a conflict; never classify it as available.
        $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $probe.Server.ExclusiveAddressUse = $true
        try { $probe.Start() } catch { throw "Port $Port is occupied or cannot be inspected; refusing to continue." }
        finally { $probe.Stop() }
    }
    # PID 0 is not an attributable listener. Check all positive foreign PIDs first.
    foreach ($listener in @($listeners | Where-Object { $_.OwningProcess -gt 0 })) {
        if (-not $owned -or $listener.OwningProcess -ne $owned.pid) {
            throw "Port $Port is occupied by an unowned process (PID $($listener.OwningProcess)); refusing to continue."
        }
    }
    if (@($listeners | Where-Object { $_.OwningProcess -le 0 }).Count) {
        if ($owned) { throw $active }
        throw "Port $Port has an unverifiable listener; refusing to continue."
    }
    return $owned
}

function Stop-OwnedProcessGracefully {
    param([string]$ManifestPath, [string]$ControlPath, [string]$Root, [string]$Role, [int]$TimeoutSec = 12)
    $owned = Get-OwnedProcess -ManifestPath $ManifestPath -Root $Root -Role $Role
    if (-not $owned) {
        if (Test-Path -LiteralPath $ManifestPath) {
            if (Clear-StaleOwnedRecord -ManifestPath $ManifestPath -ControlPath $ControlPath -Root $Root -Role $Role) {
                Write-Host "  [INFO] Se descarto un registro de proceso inactivo de $Role." -ForegroundColor DarkGray
                return $true
            }
            Write-Warning "$Role identity mismatch; refusing to stop any process."
            return $false
        }
        return $true
    }
    if (-not (Test-Path -LiteralPath $ControlPath)) {
        Write-Warning "$Role has no shutdown IPC; process left running (no force termination)."
        return $false
    }
    try {
        $control = Get-Content -LiteralPath $ControlPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
        if ($control.pid -ne $owned.pid -or [long]$control.createdUtcTicks -ne [long]$owned.createdUtcTicks -or
            $control.root -ine $owned.root -or $control.role -cne $owned.role -or
            $control.port -lt 1 -or $control.port -gt 65535 -or
            $control.token -notmatch '^[0-9a-f]{64}$') { throw 'Invalid shutdown control identity' }
        Invoke-WebRequest -Uri "http://127.0.0.1:$($control.port)/shutdown" -Method Post `
            -Headers @{ Authorization = "Bearer $($control.token)" } -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop | Out-Null
        $deadline = (Get-Date).AddSeconds($TimeoutSec)
        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 200
            $running = Get-Process -Id ([int]$owned.pid) -ErrorAction SilentlyContinue
            if (-not $running -or $running.StartTime.ToUniversalTime().Ticks -ne [long]$owned.createdUtcTicks) {
                Remove-Item -LiteralPath $ManifestPath -Force
                Remove-Item -LiteralPath $ControlPath -Force -ErrorAction SilentlyContinue
                return $true
            }
        }
    } catch { Write-Warning "$Role graceful stop failed: $_" }
    Write-Warning "$Role remains running; no forced termination attempted."
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
