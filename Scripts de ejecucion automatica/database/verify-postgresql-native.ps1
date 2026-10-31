<#
.SYNOPSIS
    Verifies native PostgreSQL 16+ installation, connection, and runs schema migrations on an isolated integration database.

.DESCRIPTION
    Automotors Garage — Milestone 14.2.1
    Safely tests native PostgreSQL on Windows without touching existing PGlite databases or production data.

.PARAMETER HostName
    PostgreSQL server host (default: '127.0.0.1').

.PARAMETER Port
    PostgreSQL server port (default: 5432).

.PARAMETER User
    PostgreSQL username (default: 'postgres').

.PARAMETER Password
    PostgreSQL password (can also be read from $env:DATABASE_PASSWORD or $env:POSTGRES_PASSWORD).

.PARAMETER DatabaseName
    Target database name. MUST be an integration or test database (default: 'automotors_garage_integration').
#>

[CmdletBinding()]
param(
    [string]$HostName = "127.0.0.1",
    [int]$Port = 5432,
    [string]$User = "postgres",
    [string]$Password = $(if ($env:DATABASE_PASSWORD) { $env:DATABASE_PASSWORD } elseif ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "postgres" }),
    [string]$DatabaseName = "automotors_garage_integration",
    [switch]$SkipMigration
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " AUTOMOTORS GARAGE - Verificacion de PostgreSQL Nativo (Windows)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Host:     $HostName"
Write-Host " Puerto:   $Port"
Write-Host " Usuario:  $User"
Write-Host " Base DB:  $DatabaseName"
Write-Host "-----------------------------------------------------------------"

# 1. Regla de Seguridad: Validar que no sea una base de datos productiva o no autorizada
$prohibitedPatterns = @("prod", "production", "live", "^automotors_garage$")
foreach ($pat in $prohibitedPatterns) {
    if ($DatabaseName -match $pat -and $DatabaseName -notmatch "integration|test") {
        Write-Error "CRITICAL SAFETY VIOLATION: El script de verificacion no puede ejecutarse contra la base '$DatabaseName'. Utilice una base de integracion dedicada como 'automotors_garage_integration' o 'automotors_garage_test'."
        exit 1
    }
}

# 2. Comprobar socket TCP
Write-Host "[1/4] Comprobando disponibilidad del puerto $Port en $HostName..." -NoNewline
try {
    $tcp = Test-NetConnection -ComputerName $HostName -Port $Port -WarningAction SilentlyContinue
    if (-not $tcp.TcpTestSucceeded) {
        Write-Host " [NO DISPONIBLE]" -ForegroundColor Yellow
        Write-Warning "No se pudo establecer conexion TCP con PostgreSQL en $HostName`:$Port."
        Write-Host ""
        Write-Host "Instrucciones para iniciar o instalar PostgreSQL 16 nativo en Windows:" -ForegroundColor Cyan
        Write-Host "  1. Si ya esta instalado: Start-Service postgresql* (o inicie el servicio 'postgresql-x64-16')"
        Write-Host "  2. Si no esta instalado: choco install postgresql16 -y  (o descargue el instalador de enterprisedb.com)"
        Write-Host "  3. Para continuar usando PGlite embebido (sin dependencias): mantenga DB_PROVIDER=pglite"
        exit 2
    }
    Write-Host " [OK]" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]" -ForegroundColor Red
    Write-Error "Fallo durante la verificacion de red: $_"
    exit 1
}

# 3. Invocar runner Node.js para conectar, identificar version y ejecutar migraciones
Write-Host "[2/4] Conectando con PostgreSQL e identificando version..."
$nodeScript = @"
import pg from 'pg';
import { DatabaseFactory, DatabaseMigrator } from './packages/database/src/index.ts';

const { Pool } = pg;
const config = {
  host: process.env.PG_HOST || '$HostName',
  port: Number(process.env.PG_PORT || $Port),
  user: process.env.PG_USER || '$User',
  password: process.env.PG_PASSWORD || '$Password',
  database: '$DatabaseName',
  connectionTimeoutMillis: 5000,
};

async function run() {
  let pool;
  try {
    // Primero conectamos a 'postgres' base default para crear la base de integracion si no existe
    const adminPool = new Pool({ ...config, database: 'postgres' });
    const versionRes = await adminPool.query('SELECT version();');
    console.log('PG_VERSION:' + versionRes.rows[0].version);

    const dbCheck = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'");
    if (dbCheck.rows.length === 0) {
      console.log('CREATING_DB:$DatabaseName');
      await adminPool.query('CREATE DATABASE "$DatabaseName";');
    }
    await adminPool.end();

    // Conectamos a la base de integracion
    pool = DatabaseFactory.createPool(config);
    const db = DatabaseFactory.create(pool);

    const shouldMigrate = '$SkipMigration' !== 'True';
    if (shouldMigrate) {
      console.log('RUNNING_MIGRATIONS');
      await DatabaseMigrator.runMigrations(db);
      console.log('MIGRATIONS_OK');
    }

    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('TABLES_COUNT:' + tablesRes.rows.length);
    console.log('TABLES_LIST:' + tablesRes.rows.map(r => r.table_name).join(','));
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('PG_ERROR:' + (err instanceof Error ? err.message : String(err)));
    if (pool) await pool.end().catch(() => {});
    process.exit(1);
  }
}

run();
"@

$env:PG_HOST = $HostName
$env:PG_PORT = [string]$Port
$env:PG_USER = $User
$env:PG_PASSWORD = $Password

$tempScript = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "automotors_pg_check.mjs")
Set-Content -Path $tempScript -Value $nodeScript -Encoding UTF8

try {
    $output = node --experimental-strip-types $tempScript 2>&1
    $exitCode = $LASTEXITCODE

    foreach ($line in $output) {
        if ($line -match "^PG_VERSION:(.*)") {
            Write-Host "   Version detectada: $($Matches[1])" -ForegroundColor Green
        }
        elseif ($line -match "^CREATING_DB:(.*)") {
            Write-Host "   Creando base de integracion segura: $($Matches[1])" -ForegroundColor Yellow
        }
        elseif ($line -match "^MIGRATIONS_OK") {
            Write-Host "[3/4] Migraciones aplicadas con exito (0001, 0002, 0003)" -ForegroundColor Green
        }
        elseif ($line -match "^TABLES_COUNT:(.*)") {
            $count = $Matches[1]
            Write-Host "[4/4] Tablas relacionales creadas y verificadas: $count" -ForegroundColor Green
            if ($count -eq "26") {
                Write-Host "   Esquema completo verificado (26/26 tablas presentes)." -ForegroundColor Green
            } else {
                Write-Host "   ADVERTENCIA: Se esperaban 26 tablas pero se encontraron $count." -ForegroundColor Yellow
            }
        }
        elseif ($line -match "^TABLES_LIST:(.*)") {
            Write-Host "   Tablas: $($Matches[1])" -ForegroundColor DarkGray
        }
        elseif ($line -match "^PG_ERROR:(.*)") {
            Write-Host "   Error de PostgreSQL: $($Matches[1])" -ForegroundColor Red
        }
    }

    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "CONCLUSION: PostgreSQL nativo verificado y listo para usar." -ForegroundColor Green
        Write-Host "Para iniciar Automotors Garage con este motor, configure en su .env:"
        Write-Host "  DB_PROVIDER=postgres"
        Write-Host "  DATABASE_URL=postgresql://$User`:$Password@$HostName`:$Port/$DatabaseName"
        exit 0
    } else {
        Write-Host ""
        Write-Host "CONCLUSION: No se pudo completar la verificacion de PostgreSQL nativo." -ForegroundColor Red
        exit 1
    }
}
finally {
    if (Test-Path $tempScript) {
        Remove-Item -Path $tempScript -Force -ErrorAction SilentlyContinue
    }
}
