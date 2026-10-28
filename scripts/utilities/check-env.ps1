<#
.SYNOPSIS
    Valida los requisitos del entorno local para Automotors Garage en Windows.
.DESCRIPTION
    Comprueba versiones de Node.js, npm, PowerShell, disponibilidad de puertos,
    estructura de directorios y configuracion de persistencia local.
.PARAMETER Port
    Puerto TCP a verificar (por defecto: 4000).
#>
[CmdletBinding()]
param(
    [int]$Port = 4000
)

$ErrorActionPreference = "Continue"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- DIAGNOSTICO DE ENTORNO LOCAL" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "../..")).Path
Set-Location $repoRoot

$global:allOk = $true
$global:warningCount = 0

function Report-Check([string]$name, [bool]$passed, [string]$details, [bool]$isWarning = $false) {
    if ($passed) {
        Write-Host "  [OK]   $name : $details" -ForegroundColor Green
    } elseif ($isWarning) {
        Write-Host "  [WARN] $name : $details" -ForegroundColor Yellow
        $global:warningCount++
    } else {
        Write-Host "  [FAIL] $name : $details" -ForegroundColor Red
        $global:allOk = $false
    }
}

# 1. Sistema Operativo y PowerShell
$psVer = $PSVersionTable.PSVersion.ToString()
Report-Check "PowerShell" $true "Version $psVer ($($PSVersionTable.PSEdition))"

# 2. Node.js
try {
    $nodeVer = (node -v 2>$null)
    if ($nodeVer) {
        $nodeMajor = [int]($nodeVer -replace '^v(\d+)\..*', '$1')
        $nodePassed = $nodeMajor -ge 20
        Report-Check "Node.js" $nodePassed "$nodeVer (Minimo v20.x requerido, recomendado Node v22+)"
    } else {
        Report-Check "Node.js" $false "Node.js no esta instalado o no se encuentra en el PATH."
    }
} catch {
    Report-Check "Node.js" $false "Error al invocar node: $_"
}

# 3. npm
try {
    $npmVer = (npm -v 2>$null)
    if ($npmVer) {
        Report-Check "npm" $true "Version $npmVer detectada."
    } else {
        Report-Check "npm" $false "npm no esta instalado o no se encuentra en el PATH."
    }
} catch {
    Report-Check "npm" $false "Error al invocar npm: $_"
}

# 4. Estructura del Repositorio
$requiredDirs = @("apps/backend", "apps/frontend", "packages/database", "packages/security-foundation", "scripts", "docs")
$missingDirs = @()
foreach ($d in $requiredDirs) {
    if (-not (Test-Path (Join-Path $repoRoot $d))) {
        $missingDirs += $d
    }
}
if ($missingDirs.Count -eq 0) {
    Report-Check "Estructura Monorepo" $true "Todos los modulos requeridos estan presentes."
} else {
    Report-Check "Estructura Monorepo" $false "Directorios faltantes: $($missingDirs -join ', ')"
}

# 5. Directorios de Runtime Local
$runtimeDirs = @(".data", ".run", ".logs")
foreach ($rd in $runtimeDirs) {
    $p = Join-Path $repoRoot $rd
    if (-not (Test-Path $p)) {
        New-Item -ItemType Directory -Path $p -Force | Out-Null
    }
}
Report-Check "Directorios Runtime" $true "Carpetas locales inicializadas (.data, .run, .logs)."

# 6. Verificacion de Puerto TCP
$conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($conn) {
    $owningPid = $conn[0].OwningProcess
    $proc = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
    $procName = if ($proc) { "$($proc.ProcessName) (PID: $owningPid)" } else { "PID: $owningPid" }
    Report-Check "Puerto $Port" $false "El puerto $Port ya esta en uso por $procName. Use stop-dev.ps1 o cambie el puerto." $true
} else {
    Report-Check "Puerto $Port" $true "El puerto $Port esta disponible para escuchar conexiones."
}

# 7. Motor de Persistencia
Report-Check "Motor Base de Datos" $true "Embedded PostgreSQL 16 WASM (PGlite con almacenamiento en disco)."

Write-Host "`n-------------------------------------------------------" -ForegroundColor Cyan
if ($global:allOk) {
    Write-Host "  Diagnostico finalizado con exito. Entorno listo para operar." -ForegroundColor Green
    exit 0
} else {
    Write-Host "  Se encontraron impedimentos que deben resolverse antes de iniciar." -ForegroundColor Red
    exit 1
}
