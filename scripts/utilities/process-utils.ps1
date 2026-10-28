<#
.SYNOPSIS
    Automotors Garage - Shared Process & Health Utility Functions.
.DESCRIPTION
    Provides reusable, safe process management, PID tracking, and healthcheck
    helpers across all PowerShell automation scripts.
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
            $isGeneral = ($cmd -like "*AutomotorsGarage*")
            $isBackend = ($cmd -like "*apps/backend*" -or $cmd -like "*main.ts*" -or $cmd -like "*seed-demo*")
            $isFrontend = ($cmd -like "*apps/frontend*" -or $cmd -like "*next*")

            switch ($ProcessType) {
                "backend"  { return ($isGeneral -or $isBackend) }
                "frontend" { return ($isGeneral -or $isFrontend) }
                default    { return ($isGeneral -or $isBackend -or $isFrontend) }
            }
        }
    } catch {}
    return $false
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

    Write-Host "  Enviando senal de detencion a $ServiceName (PID: $ProcId)..." -ForegroundColor Yellow

    try {
        if ($Force) {
            Stop-Process -Id $ProcId -Force -ErrorAction Stop
        } else {
            $proc.CloseMainWindow() | Out-Null
            Start-Sleep -Milliseconds 800

            $stillAlive = Get-Process -Id $ProcId -ErrorAction SilentlyContinue
            if ($stillAlive) {
                Write-Host "  Proceso aun activo; forzando cierre seguro..." -ForegroundColor DarkGray
                Stop-Process -Id $ProcId -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        Write-Host "  [WARN] Fallo el cierre regular; ejecutando detencion forzada..." -ForegroundColor Yellow
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
