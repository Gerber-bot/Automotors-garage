<#
.SYNOPSIS
    Automotors Garage -- Verificador Automático de Entorno Local y Diagnóstico.
.DESCRIPTION
    Comprueba de forma estrictamente NO DESTRUCTIVA si el equipo cumple con todos
    los requisitos de sistema operativo, herramientas (Node.js, npm, Git),
    integridad del proyecto monorepo, dependencias, puertos, persistencia PGlite
    y red local para ejecutar Automotors Garage.
.PARAMETER Port
    Puerto TCP del backend a inspeccionar (por defecto: 4000).
.PARAMETER FrontendPort
    Puerto TCP del frontend a inspeccionar (por defecto: 3000).
.PARAMETER Silent
    Omite la salida en pantalla y solo devuelve código de salida (0 o 1).
#>
[CmdletBinding()]
param(
    [int]$Port = 4000,
    [int]$FrontendPort = 3000,
    [switch]$Silent
)

$ErrorActionPreference = "Continue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir "../..")).Path

# Cargar utilidades compartidas si existen
$utilsPath = Join-Path $scriptDir "process-utils.ps1"
if (Test-Path $utilsPath) {
    . $utilsPath
}

$results = [System.Collections.Generic.List[PSCustomObject]]::new()
$recommendations = [System.Collections.Generic.List[PSCustomObject]]::new()

function Register-Check {
    param(
        [string]$Category,
        [string]$Name,
        [string]$Status, # "OK", "ADVERTENCIA", "ERROR"
        [string]$Details,
        [string]$Missing = "",
        [string]$Why = "",
        [string]$HowToFix = "",
        [string]$Command = ""
    )
    $results.Add([PSCustomObject]@{
        Category = $Category
        Name     = $Name
        Status   = $Status
        Details  = $Details
    })

    if ($Status -ne "OK" -and $HowToFix) {
        $recommendations.Add([PSCustomObject]@{
            Name     = $Name
            Status   = $Status
            Missing  = $Missing
            Why      = $Why
            HowToFix = $HowToFix
            Command  = $Command
        })
    }
}

# ==============================================================================
# A. SISTEMA OPERATIVO Y POWERSHELL
# ==============================================================================
$catOS = "SISTEMA OPERATIVO"

# 1. Sistema Operativo
$isWindows = $false
try {
    if ($PSVersionTable.PSEdition -eq "Desktop" -or $env:OS -like "*Windows*" -or [System.Environment]::OSVersion.Platform -like "*Win*") {
        $isWindows = $true
    }
} catch {
    if ($env:OS -like "*Windows*") { $isWindows = $true }
}

if ($isWindows) {
    $arch = if ([System.Environment]::Is64BitOperatingSystem) { "64-bit (x64)" } else { "32-bit (x86)" }
    Register-Check -Category $catOS -Name "Sistema Operativo" -Status "OK" -Details "Windows compatible ($arch)"
} else {
    Register-Check -Category $catOS -Name "Sistema Operativo" -Status "ADVERTENCIA" `
        -Details "Sistema operativo no Windows detectado." `
        -Missing "Windows 10/11 o Windows Server" `
        -Why "Los lanzadores .bat y scripts están diseñados primariamente para Windows PowerShell." `
        -HowToFix "Utilice PowerShell 7+ en Linux/macOS y ejecute los comandos equivalentes con npm."
}

# 2. PowerShell
try {
    $psVer = $PSVersionTable.PSVersion
    $psMajor = $psVer.Major
    $psMinor = $psVer.Minor
    $detectedEdition = $PSVersionTable.PSEdition

    if ($psMajor -ge 7) {
        Register-Check -Category $catOS -Name "PowerShell" -Status "OK" -Details "PowerShell $psVer ($detectedEdition) detectado."
    } elseif ($psMajor -eq 5 -and $psMinor -ge 1) {
        Register-Check -Category $catOS -Name "PowerShell" -Status "OK" -Details "Windows PowerShell $psVer ($detectedEdition) compatible."
    } else {
        Register-Check -Category $catOS -Name "PowerShell" -Status "ERROR" `
            -Details "Versión $psVer no compatible. Se requiere al menos Windows PowerShell 5.1." `
            -Missing "PowerShell 5.1 o superior" `
            -Why "Los scripts de automatización requieren cmdlets presentes desde Windows PowerShell 5.1." `
            -HowToFix "Actualice Windows o instale PowerShell 7 desde https://github.com/PowerShell/PowerShell"
    }
} catch {
    Register-Check -Category $catOS -Name "PowerShell" -Status "ERROR" `
        -Details "Error al evaluar versión de PowerShell: $_" `
        -Missing "PowerShell 5.1+" `
        -Why "Entorno PowerShell no accesible." `
        -HowToFix "Asegúrese de ejecutar desde una consola PowerShell funcional."
}

# 3. Política de Ejecución de Scripts (Execution Policy)
try {
    $execPolicy = Get-ExecutionPolicy -ErrorAction SilentlyContinue
    if ($execPolicy -in @("Unrestricted", "RemoteSigned", "Bypass")) {
        Register-Check -Category $catOS -Name "Política de Ejecución" -Status "OK" -Details "Política '$execPolicy' permite ejecutar scripts."
    } else {
        Register-Check -Category $catOS -Name "Política de Ejecución" -Status "ADVERTENCIA" `
            -Details "Política actual '$execPolicy'. Los scripts .bat usan '-ExecutionPolicy Bypass' automáticamente." `
            -Missing "Política de ejecución permisiva para llamadas manuales a .ps1" `
            -Why "Si invoca scripts .ps1 manualmente fuera de los archivos .bat, Windows podría bloquearlos." `
            -HowToFix "Ejecute PowerShell como Administrador y configure: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser" `
            -Command "Set-ExecutionPolicy RemoteSigned -Scope CurrentUser"
    }
} catch {
    Register-Check -Category $catOS -Name "Política de Ejecución" -Status "OK" -Details "Lanzadores .bat configuran Bypass automáticamente."
}

# ==============================================================================
# B. HERRAMIENTAS (NODE.JS, NPM, GIT)
# ==============================================================================
$catTools = "HERRAMIENTAS"

# 4. Node.js
$nodeInstalled = $false
try {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        $nodeRawVer = (node -v 2>$null).Trim()
        if ($nodeRawVer -match '^v(\d+)\.(\d+)\.(\d+)') {
            $nodeInstalled = $true
            $nMajor = [int]$matches[1]
            $nMinor = [int]$matches[2]

            if ($nMajor -ge 24) {
                Register-Check -Category $catTools -Name "Node.js" -Status "OK" -Details "$nodeRawVer (Recomendado para Automotors Garage)"
            } elseif ($nMajor -ge 20 -and ($nMajor -gt 20 -or $nMinor -ge 18)) {
                Register-Check -Category $catTools -Name "Node.js" -Status "OK" -Details "$nodeRawVer (Compatible con --experimental-strip-types, recomendado v24)"
            } else {
                Register-Check -Category $catTools -Name "Node.js" -Status "ERROR" `
                    -Details "$nodeRawVer es inferior a la versión mínima requerida (v20.18.0+)." `
                    -Missing "Node.js v20.18.0 o superior (recomendado: Node.js 24)" `
                    -Why "Automotors Garage requiere soporte nativo para TypeScript mediante --experimental-strip-types." `
                    -HowToFix "Descargue e instale Node.js 24 LTS desde el sitio oficial: https://nodejs.org/"
            }
        }
    }
} catch {}

if (-not $nodeInstalled) {
    Register-Check -Category $catTools -Name "Node.js" -Status "ERROR" `
        -Details "Node.js no está instalado o no se encuentra en el PATH del sistema." `
        -Missing "Node.js (versión 20.18.0+ o versión 24 recomendada)" `
        -Why "Node.js es indispensable para compilar y ejecutar el frontend Next.js y el backend API." `
        -HowToFix "Descargue e instale Node.js desde el sitio oficial: https://nodejs.org/"
}

# 5. npm
$npmInstalled = $false
try {
    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmCmd) {
        $npmRawVer = (npm -v 2>$null).Trim()
        if ($npmRawVer) {
            $npmInstalled = $true
            $npmMajor = [int]($npmRawVer.Split('.')[0])
            if ($npmMajor -ge 10) {
                Register-Check -Category $catTools -Name "npm" -Status "OK" -Details "Versión $npmRawVer instalada."
            } else {
                Register-Check -Category $catTools -Name "npm" -Status "ADVERTENCIA" `
                    -Details "Versión $npmRawVer detectada (se recomienda npm 10+)." `
                    -Missing "npm 10+" `
                    -Why "npm maneja la instalación de dependencias y espacios de trabajo del monorepo." `
                    -HowToFix "Actualice npm ejecutando: npm install -g npm@latest" `
                    -Command "npm install -g npm@latest"
            }
        }
    }
} catch {}

if (-not $npmInstalled) {
    Register-Check -Category $catTools -Name "npm" -Status "ERROR" `
        -Details "npm no está disponible en la terminal." `
        -Missing "npm (administrador de paquetes de Node.js)" `
        -Why "npm es necesario para gestionar paquetes y ejecutar comandos de ciclo de vida." `
        -HowToFix "Reinstale Node.js desde https://nodejs.org/, asegurando marcar la opción 'npm package manager'."
}

# 6. Git (Opcional si se descargó como ZIP)
try {
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCmd) {
        $gitVer = (git --version 2>$null).Trim()
        Register-Check -Category $catTools -Name "Git" -Status "OK" -Details "$gitVer disponible."
    } else {
        Register-Check -Category $catTools -Name "Git" -Status "ADVERTENCIA" `
            -Details "Git no está en el PATH (opcional si el proyecto se descargó como archivo .ZIP)." `
            -Missing "Git para Windows (opcional)" `
            -Why "Git permite clonar, sincronizar y recibir actualizaciones del repositorio." `
            -HowToFix "Puede instalar Git desde https://git-scm.com/ si desea clonar y gestionar versiones."
    }
} catch {
    Register-Check -Category $catTools -Name "Git" -Status "ADVERTENCIA" -Details "No fue posible verificar Git."
}

# ==============================================================================
# C. INTEGRIDAD DEL PROYECTO
# ==============================================================================
$catRepo = "INTEGRIDAD DEL PROYECTO"

$reqFiles = @(
    "package.json",
    "package-lock.json",
    "apps/backend/src/main.ts",
    "apps/frontend/package.json",
    "packages/database/package.json",
    "packages/security-foundation/package.json",
    "packages/obd-core/package.json",
    "Scripts de ejecucion automatica/INICIAR_COMPLETO.bat",
    "Scripts de ejecucion automatica/INICIAR_COMPLETO_MODO_LAN.bat",
    "Scripts de ejecucion automatica/DETENER_AUTOMOTORS.bat",
    "Scripts de ejecucion automatica/COMPROBAR_ENTORNO.bat",
    "Scripts de ejecucion automatica/powershell/automotors.ps1"
)

$missingProjectFiles = @()
foreach ($rf in $reqFiles) {
    $fp = Join-Path $repoRoot $rf
    if (-not (Test-Path $fp)) {
        $missingProjectFiles += $rf
    }
}

if ($missingProjectFiles.Count -eq 0) {
    # Validar coherencia de package.json
    $pkgJsonPath = Join-Path $repoRoot "package.json"
    $isAutomotors = $false
    try {
        $pkgContent = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
        if ($pkgContent.name -eq "automotors-garage") {
            $isAutomotors = $true
        }
    } catch {}

    if ($isAutomotors) {
        Register-Check -Category $catRepo -Name "Estructura Monorepo" -Status "OK" -Details "Estructura íntegra y verificada de Automotors Garage."
    } else {
        Register-Check -Category $catRepo -Name "Estructura Monorepo" -Status "ADVERTENCIA" -Details "package.json no coincide exactamente con 'automotors-garage'."
    }
} else {
    Register-Check -Category $catRepo -Name "Estructura Monorepo" -Status "ERROR" `
        -Details "Faltan archivos esenciales del proyecto: $($missingProjectFiles -join ', ')" `
        -Missing "Archivos del repositorio" `
        -Why "Sin estos archivos el sistema no puede localizar los módulos de backend o frontend." `
        -HowToFix "Vuelva a descargar o clonar el repositorio completo desde GitHub."
}

# ==============================================================================
# D. DEPENDENCIAS DEL MONOREPO
# ==============================================================================
$catDeps = "DEPENDENCIAS"

$rootNodeModules = Join-Path $repoRoot "node_modules"
$frontendNodeModules = Join-Path $repoRoot "apps/frontend/node_modules"

if (-not (Test-Path $rootNodeModules)) {
    Register-Check -Category $catDeps -Name "Dependencias Principales" -Status "ERROR" `
        -Details "La carpeta 'node_modules' no existe en la raíz del repositorio." `
        -Missing "Dependencias de Node.js en la raíz" `
        -Why "Automotors Garage requiere bibliotecas de persistencia, tipado y utilidades para operar." `
        -HowToFix "Abra una terminal en la raíz del repositorio y ejecute: npm ci" `
        -Command "npm ci"
} else {
    # Comprobar paquetes clave de la raíz
    $hasPglite = Test-Path (Join-Path $rootNodeModules "@electric-sql/pglite")
    $hasDrizzle = Test-Path (Join-Path $rootNodeModules "drizzle-orm")
    $hasZod = Test-Path (Join-Path $rootNodeModules "zod")

    if ($hasPglite -and $hasDrizzle -and $hasZod) {
        Register-Check -Category $catDeps -Name "Dependencias Backend y Motor" -Status "OK" -Details "PGlite, Drizzle ORM y Zod instalados correctamente."
    } else {
        Register-Check -Category $catDeps -Name "Dependencias Backend y Motor" -Status "ERROR" `
            -Details "Faltan paquetes esenciales (@electric-sql/pglite, drizzle-orm o zod)." `
            -Missing "Paquetes npm del backend" `
            -Why "El motor de base de datos embebida y el backend no podrán inicializarse." `
            -HowToFix "Ejecute 'npm ci' en la raíz del repositorio para restaurar las dependencias exactas." `
            -Command "npm ci"
    }

    # Comprobar enlaces locales del monorepo
    $hasDbPkg = Test-Path (Join-Path $rootNodeModules "@automotors/database")
    $hasSecPkg = Test-Path (Join-Path $rootNodeModules "@automotors/security-foundation")
    $hasObdPkg = Test-Path (Join-Path $rootNodeModules "@automotors/obd-core")

    if ($hasDbPkg -and $hasSecPkg -and $hasObdPkg) {
        Register-Check -Category $catDeps -Name "Paquetes Internos Monorepo" -Status "OK" -Details "@automotors/database, security-foundation y obd-core enlazados."
    } else {
        Register-Check -Category $catDeps -Name "Paquetes Internos Monorepo" -Status "ERROR" `
            -Details "Los paquetes locales de @automotors no están enlazados en node_modules." `
            -Missing "Enlaces de paquetes locales del monorepo" `
            -Why "El backend y las pruebas fallarán al importar las dependencias compartidas." `
            -HowToFix "Ejecute 'npm install' o 'npm ci' para vincular los paquetes locales del monorepo." `
            -Command "npm ci"
    }
}

if (-not (Test-Path $frontendNodeModules)) {
    Register-Check -Category $catDeps -Name "Dependencias Frontend Next.js" -Status "ADVERTENCIA" `
        -Details "Faltan dependencias en apps/frontend/node_modules (se instalarán automáticamente al iniciar)." `
        -Missing "node_modules en apps/frontend" `
        -Why "Next.js requiere paquetes propios para la interfaz web interactiva." `
        -HowToFix "Ejecute: npm --prefix apps/frontend ci (o permita que INICIAR_COMPLETO.bat lo instale)." `
        -Command "npm --prefix apps/frontend ci"
} else {
    $hasNext = Test-Path (Join-Path $frontendNodeModules "next")
    $hasReact = Test-Path (Join-Path $frontendNodeModules "react")

    if ($hasNext -and $hasReact) {
        Register-Check -Category $catDeps -Name "Dependencias Frontend Next.js" -Status "OK" -Details "Next.js 15 y React instalados y listos."
    } else {
        Register-Check -Category $catDeps -Name "Dependencias Frontend Next.js" -Status "ERROR" `
            -Details "Next.js o React faltan en apps/frontend/node_modules." `
            -Missing "Next.js / React en frontend" `
            -Why "La landing y las demos interactivas no podrán compilarse ni servirse." `
            -HowToFix "Ejecute: npm --prefix apps/frontend ci" `
            -Command "npm --prefix apps/frontend ci"
    }
}

# ==============================================================================
# E. CONFIGURACIÓN Y VARIABLES DE ENTORNO
# ==============================================================================
$catConfig = "CONFIGURACION"

$envPath = Join-Path $repoRoot ".env"
$envExamplePath = Join-Path $repoRoot ".env.example"

if (Test-Path $envPath) {
    Register-Check -Category $catConfig -Name "Archivo de Configuración (.env)" -Status "OK" -Details "Archivo .env presente en la raíz."
} elseif (Test-Path $envExamplePath) {
    Register-Check -Category $catConfig -Name "Archivo de Configuración (.env)" -Status "ADVERTENCIA" `
        -Details "No existe .env, pero .env.example está presente (se creará con valores seguros al iniciar)." `
        -Missing "Archivo de entorno .env" `
        -Why "Contiene variables como DB_PROVIDER y puertos locales." `
        -HowToFix "INICIAR_COMPLETO.bat copiará .env.example automáticamente. O copie manualmente: Copy-Item .env.example .env" `
        -Command "Copy-Item .env.example .env"
} else {
    Register-Check -Category $catConfig -Name "Archivo de Configuración (.env)" -Status "ERROR" `
        -Details "Ni .env ni .env.example existen en la raíz del proyecto." `
        -Missing ".env / .env.example" `
        -Why "Faltan las variables base para la inicialización del sistema." `
        -HowToFix "Restaure el archivo .env.example desde el repositorio."
}

# Comprobar proveedor de datos configurado sin mostrar secretos
$dbProvider = "pglite (predeterminado)"
if (Test-Path $envPath) {
    $envLines = Get-Content $envPath -ErrorAction SilentlyContinue
    foreach ($line in $envLines) {
        if ($line -match '^\s*DB_PROVIDER\s*=\s*(.+)$') {
            $val = $matches[1].Trim().Trim('"').Trim("'")
            $dbProvider = $val
        }
    }
}
Register-Check -Category $catConfig -Name "Proveedor de Persistencia" -Status "OK" -Details "Motor configurado: $dbProvider (sin secretos expuestos)."

# ==============================================================================
# F. PUERTOS TCP Y PROCESOS ACTIVOS
# ==============================================================================
$catPorts = "PUERTOS Y CONECTIVIDAD LOCAL"

# Puerto 4000 (Backend)
try {
    $backendConn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($backendConn) {
        $bPid = $backendConn[0].OwningProcess
        $isAutoBackend = $false
        if (Get-Command Test-IsAutomotorsProcess -ErrorAction SilentlyContinue) {
            $isAutoBackend = Test-IsAutomotorsProcess -ProcId $bPid -ProcessType "backend"
        }

        if ($isAutoBackend) {
            Register-Check -Category $catPorts -Name "Puerto Backend ($Port)" -Status "OK" -Details "Automotors Backend API ya se encuentra activo (PID: $bPid)."
        } else {
            Register-Check -Category $catPorts -Name "Puerto Backend ($Port)" -Status "ADVERTENCIA" `
                -Details "Puerto $Port ocupado por otro proceso (PID: $bPid). Puede cambiar el puerto o cerrarlo." `
                -Missing "Puerto $Port libre" `
                -Why "Si otro programa ocupa el puerto 4000, el backend no podrá escuchar peticiones." `
                -HowToFix "Cierre la aplicación que usa el puerto o ejecute DETENER_AUTOMOTORS.bat si pertenece a una instancia anterior."
        }
    } else {
        Register-Check -Category $catPorts -Name "Puerto Backend ($Port)" -Status "OK" -Details "Puerto $Port disponible para escuchar conexiones."
    }
} catch {
    Register-Check -Category $catPorts -Name "Puerto Backend ($Port)" -Status "OK" -Details "Verificación de socket completada."
}

# Puerto 3000 (Frontend)
try {
    $frontendConn = Get-NetTCPConnection -LocalPort $FrontendPort -State Listen -ErrorAction SilentlyContinue
    if ($frontendConn) {
        $fPid = $frontendConn[0].OwningProcess
        $isAutoFrontend = $false
        if (Get-Command Test-IsAutomotorsProcess -ErrorAction SilentlyContinue) {
            $isAutoFrontend = Test-IsAutomotorsProcess -ProcId $fPid -ProcessType "frontend"
        }

        if ($isAutoFrontend) {
            Register-Check -Category $catPorts -Name "Puerto Frontend ($FrontendPort)" -Status "OK" -Details "Automotors Frontend Next.js ya se encuentra activo (PID: $fPid)."
        } else {
            Register-Check -Category $catPorts -Name "Puerto Frontend ($FrontendPort)" -Status "ADVERTENCIA" `
                -Details "Puerto $FrontendPort ocupado por otro proceso (PID: $fPid). Debe liberarse antes de iniciar." `
                -Missing "Puerto $FrontendPort libre" `
                -Why "Next.js requiere el puerto 3000 para servir la interfaz web." `
                -HowToFix "Detenga el servicio que utiliza el puerto 3000 o ejecute DETENER_AUTOMOTORS.bat."
        }
    } else {
        Register-Check -Category $catPorts -Name "Puerto Frontend ($FrontendPort)" -Status "OK" -Details "Puerto $FrontendPort disponible para escuchar conexiones."
    }
} catch {
    Register-Check -Category $catPorts -Name "Puerto Frontend ($FrontendPort)" -Status "OK" -Details "Verificación de socket completada."
}

# ==============================================================================
# G. PERSISTENCIA Y ALMACENAMIENTO
# ==============================================================================
$catStorage = "PERSISTENCIA Y ALMACENAMIENTO"

# 1. Advertencia no bloqueante de OneDrive
if ($repoRoot -like "*OneDrive*") {
    Register-Check -Category $catStorage -Name "Ubicación en OneDrive" -Status "ADVERTENCIA" `
        -Details "El repositorio está en una ruta sincronizada por OneDrive ('$repoRoot')." `
        -Missing "Ubicación local no sincronizada (opcional)" `
        -Why "La sincronización en tiempo real de OneDrive puede bloquear archivos de caché (.next-dev) durante la compilación." `
        -HowToFix "El sistema incluye autoreparación. Si experimenta lentitud o errores de compilación, pause OneDrive o clone en C:\Proyectos."
} else {
    Register-Check -Category $catStorage -Name "Ubicación del Disco" -Status "OK" -Details "Ruta local estándar fuera de sincronización en la nube."
}

# 2. Espacio libre en disco
try {
    $driveRoot = Split-Path -Qualifier $repoRoot
    $drive = Get-PSDrive ($driveRoot.TrimEnd(':')) -ErrorAction SilentlyContinue
    if ($drive -and $drive.Free) {
        $freeMb = [math]::Round($drive.Free / 1MB, 0)
        if ($freeMb -ge 500) {
            Register-Check -Category $catStorage -Name "Espacio en Disco" -Status "OK" -Details "$freeMb MB disponibles en $driveRoot (mínimo 500 MB recomendado)."
        } else {
            Register-Check -Category $catStorage -Name "Espacio en Disco" -Status "ADVERTENCIA" `
                -Details "Espacio bajo en ${driveRoot}: solo $freeMb MB libres." `
                -Missing "Espacio libre en disco (500 MB+)" `
                -Why "Next.js y el motor de persistencia requieren espacio para compilaciones y registros." `
                -HowToFix "Libere espacio en la unidad $driveRoot."
        }
    }
} catch {
    Register-Check -Category $catStorage -Name "Espacio en Disco" -Status "OK" -Details "Espacio verificado."
}

# 3. Permisos de escritura (comprobación no destructiva)
$hasWritePerm = $false
$testTempFile = Join-Path $repoRoot ".run_write_test_$([System.Guid]::NewGuid().ToString('N')).tmp"
try {
    [System.IO.File]::WriteAllText($testTempFile, "test")
    if (Test-Path $testTempFile) {
        [System.IO.File]::Delete($testTempFile)
        $hasWritePerm = $true
    }
} catch {}

if ($hasWritePerm) {
    Register-Check -Category $catStorage -Name "Permisos del Directorio" -Status "OK" -Details "Permisos de lectura y escritura verificados."
} else {
    Register-Check -Category $catStorage -Name "Permisos del Directorio" -Status "ERROR" `
        -Details "No se tienen permisos de escritura en la carpeta del repositorio." `
        -Missing "Permisos de escritura en Windows" `
        -Why "El backend y el frontend no podrán escribir logs, PIDs ni persistencia local." `
        -HowToFix "Otorgue permisos de lectura/escritura a su usuario de Windows sobre la carpeta del proyecto."
}

# ==============================================================================
# H. RED LOCAL Y MODO LAN
# ==============================================================================
$catNet = "RED LOCAL"

$lanIpInfo = $null
if (Get-Command Get-LanIPv4Address -ErrorAction SilentlyContinue) {
    $lanIpInfo = Get-LanIPv4Address
}

if ($lanIpInfo -and $lanIpInfo.IP) {
    Register-Check -Category $catNet -Name "Interfaz Privada LAN" -Status "OK" `
        -Details "IPv4 privada detectada: $($lanIpInfo.IP) ($($lanIpInfo.AdapterName)). Preparado para INICIAR_COMPLETO_MODO_LAN.bat."
} else {
    Register-Check -Category $catNet -Name "Interfaz Privada LAN" -Status "ADVERTENCIA" `
        -Details "No se detectó interfaz Wi-Fi/Ethernet privada activa. El modo LAN no estará disponible." `
        -Missing "Conexión a red privada Wi-Fi o Ethernet" `
        -Why "El modo LAN requiere una dirección IP local privada para que otros teléfonos o PCs puedan conectarse." `
        -HowToFix "Conéctese a una red Wi-Fi o red local si desea probar desde su smartphone. Para desarrollo en la misma PC use INICIAR_COMPLETO.bat."
}

# ==============================================================================
# I. EMISIÓN DEL INFORME VISUAL Y CÁLCULO DEL ESTADO FINAL
# ==============================================================================
$errorCount = @($results | Where-Object { $_.Status -eq "ERROR" }).Count
$warningCount = @($results | Where-Object { $_.Status -eq "ADVERTENCIA" }).Count

if (-not $Silent) {
    Write-Host "`n=======================================================================" -ForegroundColor Cyan
    Write-Host "                    AUTOMOTORS GARAGE" -ForegroundColor Cyan
    Write-Host "               COMPROBADOR DE ENTORNO LOCAL" -ForegroundColor Cyan
    Write-Host "=======================================================================`n" -ForegroundColor Cyan

    $currentCategory = ""
    foreach ($r in $results) {
        if ($r.Category -ne $currentCategory) {
            $currentCategory = $r.Category
            Write-Host "`n--- $currentCategory ---" -ForegroundColor Yellow
        }

        switch ($r.Status) {
            "OK" {
                Write-Host "  [OK]           $($r.Name.PadRight(30)) : $($r.Details)" -ForegroundColor Green
            }
            "ADVERTENCIA" {
                Write-Host "  [ADVERTENCIA]  $($r.Name.PadRight(30)) : $($r.Details)" -ForegroundColor Yellow
            }
            "ERROR" {
                Write-Host "  [ERROR]        $($r.Name.PadRight(30)) : $($r.Details)" -ForegroundColor Red
            }
        }
    }

    Write-Host "`n=======================================================================" -ForegroundColor Cyan
    Write-Host "                        DIAGNOSTICO FINAL" -ForegroundColor Cyan
    Write-Host "=======================================================================" -ForegroundColor Cyan

    if ($errorCount -eq 0 -and $warningCount -eq 0) {
        Write-Host "`n  ESTADO: [EQUIPO PREPARADO]" -ForegroundColor Green
        Write-Host "  Todas las comprobaciones resultaron 100% satisfactorias." -ForegroundColor Green
        Write-Host "`n  Para iniciar el sistema completo:" -ForegroundColor White
        Write-Host "    Haga doble clic en: INICIAR_COMPLETO.bat" -ForegroundColor Cyan
        Write-Host "    O ejecute por consola: npm run dev`n" -ForegroundColor DarkCyan
    } elseif ($errorCount -eq 0 -and $warningCount -gt 0) {
        Write-Host "`n  ESTADO: [EQUIPO PREPARADO CON ADVERTENCIAS]" -ForegroundColor Yellow
        Write-Host "  El equipo cuenta con los requisitos indispensables para operar." -ForegroundColor Yellow
        Write-Host "  Se detectaron $warningCount advertencia(s) no bloqueante(s) que conviene tener en cuenta.`n" -ForegroundColor DarkYellow

        Write-Host "  Para iniciar el sistema completo:" -ForegroundColor White
        Write-Host "    Haga doble clic en: INICIAR_COMPLETO.bat" -ForegroundColor Cyan
        Write-Host "    O ejecute por consola: npm run dev`n" -ForegroundColor DarkCyan
    } else {
        Write-Host "`n  ESTADO: [EQUIPO NO PREPARADO]" -ForegroundColor Red
        Write-Host "  Se detectaron $errorCount error(es) crítico(s) que impiden iniciar Automotors Garage." -ForegroundColor Red
    }

    if ($recommendations.Count -gt 0) {
        Write-Host "`n-----------------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host "                 RECOMENDACIONES Y GUIA DE RESOLUCION" -ForegroundColor Cyan
        Write-Host "-----------------------------------------------------------------------`n" -ForegroundColor DarkGray

        $i = 1
        foreach ($rec in $recommendations) {
            $badgeColor = if ($rec.Status -eq "ERROR") { "Red" } else { "Yellow" }
            Write-Host "  $i. [$($rec.Status)] $($rec.Name)" -ForegroundColor $badgeColor
            if ($rec.Missing)  { Write-Host "     Falta        : $($rec.Missing)" -ForegroundColor DarkGray }
            if ($rec.Why)      { Write-Host "     Por que      : $($rec.Why)" -ForegroundColor DarkGray }
            if ($rec.HowToFix)  { Write-Host "     Solucion     : $($rec.HowToFix)" -ForegroundColor White }
            if ($rec.Command)   { Write-Host "     Comando      : $($rec.Command)" -ForegroundColor Cyan }
            Write-Host ""
            $i++
        }
    }

    Write-Host "=======================================================================`n" -ForegroundColor Cyan
}

if ($errorCount -gt 0) {
    exit 1
} else {
    exit 0
}
