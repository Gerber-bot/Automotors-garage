$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../../Scripts de ejecucion automatica/utilities/process-utils.ps1')

# Deterministic Windows listener-reporting failure; no real process is started.
$script:identity = [pscustomobject]@{ pid = 12345; root = 'verified-by-Get-OwnedProcess' }
$script:listeners = @()
function Get-OwnedProcess { param($ManifestPath, $Root, $Role) return $script:identity }
function Get-NetTCPConnection { param($LocalPort, $State, $ErrorAction) return $script:listeners }

$recognized = $false
try { Assert-AvailableOwnedPort -Port 3000 -ManifestPath unused -Root unused -Role frontend | Out-Null }
catch { $recognized = $_.Exception.Data['OwnedProcessActive'] -eq $true -and $_.Exception.Message -match 'already running' }
if (-not $recognized) { throw 'Verified active process was not recognized without claiming port ownership' }
$script:listeners = @([pscustomobject]@{ OwningProcess = 0 })
$recognized = $false
try { Assert-AvailableOwnedPort -Port 3000 -ManifestPath unused -Root unused -Role frontend | Out-Null }
catch { $recognized = $_.Exception.Data['OwnedProcessActive'] -eq $true }
if (-not $recognized) { throw 'PID zero was mistaken for an attributable foreign process' }
$script:listeners = @([pscustomobject]@{ OwningProcess = 0 }, [pscustomobject]@{ OwningProcess = 99999 })
$rejected = $false
try { Assert-AvailableOwnedPort -Port 3000 -ManifestPath unused -Root unused -Role frontend | Out-Null }
catch { $rejected = $_.Exception.Message -match 'unowned process' }
if (-not $rejected) { throw 'Unverifiable listener hid a positive foreign owner' }
$script:listeners = @([pscustomobject]@{ OwningProcess = 99999 })
$rejected = $false
try { Assert-AvailableOwnedPort -Port 3000 -ManifestPath unused -Root unused -Role frontend | Out-Null }
catch { $rejected = $_.Exception.Message -match 'unowned process' }
if (-not $rejected) { throw 'Foreign listener was accepted despite a verified manifest' }
$script:identity = $null
$rejected = $false
try { Assert-AvailableOwnedPort -Port 3000 -ManifestPath unused -Root unused -Role frontend | Out-Null }
catch { $rejected = $_.Exception.Message -match 'unowned process' }
if (-not $rejected) { throw 'Missing identity granted ownership' }
$script:listeners = @([pscustomobject]@{ OwningProcess = 0 })
$rejected = $false
try { Assert-AvailableOwnedPort -Port 3000 -ManifestPath unused -Root unused -Role frontend | Out-Null }
catch { $rejected = $_.Exception.Message -match 'unverifiable listener' }
if (-not $rejected) { throw 'PID zero without a verified identity was accepted' }

$controller = Get-Content (Join-Path $PSScriptRoot '../../Scripts de ejecucion automatica/powershell/automotors.ps1') -Raw
$guard = $controller.IndexOf('if ($backendWasRunning -or $frontendWasRunning)')
$preflight = $controller.IndexOf('$migrationStatus = cmd')
if ($guard -lt 0 -or $guard -gt $preflight -or $controller.Substring($guard, $preflight - $guard) -notmatch '\breturn\b') {
    throw 'Already-active guard must exit before migration preflight and spawning'
}
Write-Host 'PASS: mocked missing listener, foreign listener, missing identity, and controller early return'
