<#
.SYNOPSIS
    Ejecutor secuencial de suites de pruebas para Automotors Garage.
.DESCRIPTION
    Ejecuta las pruebas unitarias, de integracion y E2E de forma aislada y secuencial,
    previniendo bloqueos por concurrencia y emitiendo un reporte estructurado.
.PARAMETER Suite
    Filtro de suite: all (default), unit, integration, e2e, security, history, intelligence, frontend, database, persistence.
#>
[CmdletBinding()]
param(
    [ValidateSet("all", "unit", "integration", "e2e", "security", "history", "intelligence", "frontend", "database", "persistence")]
    [string]$Suite = "all"
)

$ErrorActionPreference = "Continue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
Set-Location $repoRoot

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE -- EJECUTOR DE PRUEBAS ($Suite)" -ForegroundColor Cyan
Write-Host "=======================================================`n" -ForegroundColor Cyan

$allSuites = @(
    @{
        Name = "Security Foundation"
        Category = "unit"
        Path = "packages/security-foundation/src/tests/security-foundation.spec.ts"
    },
    @{
        Name = "Vehicle History Engine"
        Category = "unit"
        Path = "apps/backend/test/vehicle-history-engine.spec.ts"
    },
    @{
        Name = "Maintenance Intelligence"
        Category = "unit"
        Path = "apps/backend/test/maintenance-intelligence.spec.ts"
    },
    @{
        Name = "Frontend Architecture & Components"
        Category = "unit"
        Path = "apps/frontend/test/frontend-components.spec.ts"
    },
    @{
        Name = "Database Relational Schema"
        Category = "integration"
        Path = "packages/database/test/database.spec.ts"
    },
    @{
        Name = "Milestone 07 Persistence Foundation"
        Category = "integration"
        Path = "tests/integration/persistence-foundation.spec.ts"
    },
    @{
        Name = "Milestone 08 Full Stack E2E"
        Category = "e2e"
        Path = "tests/integration/milestone-08-e2e.spec.ts"
    }
)

# Filtrar segun parametro
$selectedSuites = switch ($Suite) {
    "all" { $allSuites }
    "unit" { $allSuites | Where-Object { $_.Category -eq "unit" } }
    "integration" { $allSuites | Where-Object { $_.Category -eq "integration" } }
    "e2e" { $allSuites | Where-Object { $_.Category -eq "e2e" } }
    "security" { $allSuites | Where-Object { $_.Name -like "*Security*" } }
    "history" { $allSuites | Where-Object { $_.Name -like "*History*" } }
    "intelligence" { $allSuites | Where-Object { $_.Name -like "*Intelligence*" } }
    "frontend" { $allSuites | Where-Object { $_.Name -like "*Frontend*" } }
    "database" { $allSuites | Where-Object { $_.Name -like "*Database*" } }
    "persistence" { $allSuites | Where-Object { $_.Name -like "*Persistence*" } }
}

$results = @()
$totalPassed = 0
$totalFailed = 0

foreach ($s in $selectedSuites) {
    Write-Host "-> Ejecutando: $($s.Name)..." -ForegroundColor Yellow
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    
    $output = & node --experimental-strip-types --test $s.Path 2>&1
    $exitCode = $LASTEXITCODE
    $sw.Stop()

    $passed = ($exitCode -eq 0)
    if ($passed) {
        $totalPassed++
        Write-Host "   [PASS] $($s.Name) ($($sw.ElapsedMilliseconds) ms)" -ForegroundColor Green
    } else {
        $totalFailed++
        Write-Host "   [FAIL] $($s.Name) ($($sw.ElapsedMilliseconds) ms)" -ForegroundColor Red
        $output | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkRed }
    }

    $results += [PSCustomObject]@{
        Suite = $s.Name
        Estado = if ($passed) { "PASS" } else { "FAIL" }
        TiempoMs = $sw.ElapsedMilliseconds
    }
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " RESUMEN DE EJECUCION DE PRUEBAS" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
$results | Format-Table -AutoSize

if ($totalFailed -eq 0) {
    Write-Host "  [OK] Todas las suites seleccionadas fueron aprobadas con exito ($totalPassed/$($selectedSuites.Count)).`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "  [FAIL] Se detectaron fallas en $totalFailed suite(s).`n" -ForegroundColor Red
    exit 1
}
