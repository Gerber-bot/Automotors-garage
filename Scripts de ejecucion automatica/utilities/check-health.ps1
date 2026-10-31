<#
.SYNOPSIS
    Comprueba el estado de salud de la API HTTP de Automotors Garage.
.DESCRIPTION
    Realiza peticiones a /health/live y /health/ready, verifica la respuesta de la
    base de datos y valida que el servidor este respondiendo correctamente.
.PARAMETER Port
    Puerto del servidor a sondear (por defecto: 4000).
.PARAMETER ServerHost
    Host o IP del servidor (por defecto: 127.0.0.1).
.PARAMETER TimeoutSec
    Tiempo limite en segundos por peticion (por defecto: 5).
.PARAMETER Silent
    Si se especifica, no emite texto y solo retorna exit code 0 (saludable) o 1 (fallido).
#>
[CmdletBinding()]
param(
    [int]$Port = 4000,
    [string]$ServerHost = "127.0.0.1",
    [int]$TimeoutSec = 5,
    [switch]$Silent
)

$ErrorActionPreference = "Continue"

$baseUrl = "http://${ServerHost}:${Port}"
$liveUrl = "${baseUrl}/health/live"
$readyUrl = "${baseUrl}/health/ready"

function Format-Result([string]$tag, [string]$status, [string]$details, [ConsoleColor]$color) {
    if (-not $Silent) {
        Write-Host "  [$tag] $status - $details" -ForegroundColor $color
    }
}

if (-not $Silent) {
    Write-Host "`n=======================================================" -ForegroundColor Cyan
    Write-Host " AUTOMOTORS GARAGE -- HEALTH CHECK ($baseUrl)" -ForegroundColor Cyan
    Write-Host "=======================================================`n" -ForegroundColor Cyan
}

$isHealthy = $true

# 1. Chequeo de Liveness (/health/live)
try {
    $req = [System.Net.HttpWebRequest]::Create($liveUrl)
    $req.Timeout = $TimeoutSec * 1000
    $req.Method = "GET"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $res = $req.GetResponse()
    $sw.Stop()
    $stream = $res.GetResponseStream()
    $streamReader = [System.IO.StreamReader]::new($stream)
    $liveBody = $streamReader.ReadToEnd()
    $streamReader.Close()
    $res.Close()

    $reqId = $res.Headers["x-request-id"]
    Format-Result "LIVENESS " "OK" "Status: 200 ($($sw.ElapsedMilliseconds) ms) [x-request-id: $reqId]" Green
} catch {
    $isHealthy = $false
    Format-Result "LIVENESS " "FAIL" "No se pudo conectar a $liveUrl ($($_.Exception.Message))" Red
}

# 2. Chequeo de Readiness (/health/ready)
try {
    $reqReady = [System.Net.HttpWebRequest]::Create($readyUrl)
    $reqReady.Timeout = $TimeoutSec * 1000
    $reqReady.Method = "GET"
    $swReady = [System.Diagnostics.Stopwatch]::StartNew()
    $resReady = $reqReady.GetResponse()
    $swReady.Stop()
    $streamReady = [System.IO.StreamReader]::new($resReady.GetResponseStream()).ReadToEnd()
    $resReady.Close()

    $readyJson = $streamReady | ConvertFrom-Json -ErrorAction SilentlyContinue
    $dbState = if ($readyJson -and $readyJson.database) { $readyJson.database } else { "UNKNOWN" }
    $reqIdReady = $resReady.Headers["x-request-id"]

    if ($dbState -eq "UP" -or $dbState -eq "HEALTHY") {
        Format-Result "READINESS" "OK" "DB: $dbState ($($swReady.ElapsedMilliseconds) ms) [x-request-id: $reqIdReady]" Green
    } else {
        $isHealthy = $false
        Format-Result "READINESS" "WARN" "DB reporta estado no optimo: $dbState" Yellow
    }
} catch {
    $isHealthy = $false
    Format-Result "READINESS" "FAIL" "Fallo en chequeo de base de datos ($($_.Exception.Message))" Red
}

if (-not $Silent) {
    Write-Host "`n-------------------------------------------------------" -ForegroundColor Cyan
    if ($isHealthy) {
        Write-Host "  [OK] Servidor activo, saludable y listo para recibir trafico." -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] El servidor no responde o no se encuentra completamente listo." -ForegroundColor Red
    }
}

if ($isHealthy) {
    exit 0
} else {
    exit 1
}
