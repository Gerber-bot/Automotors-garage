# PostgreSQL 16 Nativo en Windows — Guía de Configuración Local (Milestone 14.2.1)

## 1. Decisión de Arquitectura y Persistencia Dual

Automotors Garage adopta una persistencia dual desacoplada sin dependencias de Docker ni máquinas virtuales (WSL):

| Modo | Motor | Configuración | Propósito |
| :--- | :--- | :--- | :--- |
| **Embebido (Default)** | PGlite (WASM Postgres 16.4) | `DB_PROVIDER=pglite` | Desarrollo local ágil, cero dependencias de servicios externos, suite de pruebas determinista. Almacenado en `.data/postgres_dev`. |
| **Nativo (Windows)** | PostgreSQL 16+ Servicio Windows | `DB_PROVIDER=postgres` | Integración con motor PostgreSQL real, multi-sesión externa y producción. Conexión gestionada vía `pg.Pool` y Drizzle ORM. |

---

## 2. Instalación de PostgreSQL 16 Nativo en Windows

> [!NOTE]
> **No se requiere Docker ni WSL**. PostgreSQL corre como un servicio estándar de Windows en el puerto local `5432`.

### Opción A — Gestor de paquetes `winget` (Recomendado)
Abrir PowerShell como Administrador y ejecutar:
```powershell
winget install PostgreSQL.PostgreSQL.16 --accept-source-agreements --accept-package-agreements
```

### Opción B — Gestor de paquetes `Chocolatey`
```powershell
choco install postgresql16 -y
```

### Opción C — Instalador Oficial Gráfico
1. Descargar el instalador de PostgreSQL 16 para Windows x86-64 desde [EnterpriseDB Official](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
2. Durante el asistente de instalación:
   - Mantener el puerto por defecto: `5432`.
   - Asignar una contraseña para el superusuario `postgres` (ej. `postgres_secure_password`).
   - Configuración regional (*Locale*): `Spanish, Argentina` o `C.UTF-8`.
3. El instalador registrará e iniciará el servicio de Windows `postgresql-x64-16`.

---

## 3. Comandos de Control del Servicio en Windows

Desde PowerShell (con permisos de Administrador):

```powershell
# Comprobar estado del servicio
Get-Service postgresql*

# Iniciar el servicio PostgreSQL
Start-Service postgresql-x64-16

# Detener el servicio PostgreSQL
Stop-Service postgresql-x64-16

# Reiniciar el servicio
Restart-Service postgresql-x64-16
```

---

## 4. Configuración de Variables de Entorno (`.env`)

Para activar el modo PostgreSQL nativo en Automotors Garage, edite o cree su archivo `.env` local:

```ini
# ------------------------------------------------------------------------------
# Estrategia de Persistencia
# ------------------------------------------------------------------------------
# Opciones: 'pglite' (embebido WASM) o 'postgres' (PostgreSQL nativo)
DB_PROVIDER=postgres

# Conexión completa por URL:
DATABASE_URL=postgresql://postgres:postgres_secure_password@127.0.0.1:5432/automotors_garage?schema=public

# O parámetros individuales equivalentes:
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres_secure_password
DATABASE_NAME=automotors_garage
DATABASE_SSL=false
```

> [!IMPORTANT]
> **Seguridad de Conexión y Fail-Fast**:
> - Si `DB_PROVIDER=postgres` (o en `NODE_ENV=production`) y la base de datos no está disponible o las credenciales son incorrectas, **el sistema aborta inmediatamente (`process.exit(1)`)**.
> - **No existe fallback silencioso a PGlite** cuando se solicita explícitamente PostgreSQL o en producción, evitando escrituras accidentales fuera del motor real.
> - Si desea trabajar sin levantar PostgreSQL, configure simplemente `DB_PROVIDER=pglite`.

---

## 5. Script de Verificación y Base de Integración Aislada

Se provee un script PowerShell seguro que valida el entorno sin afectar los datos existentes de desarrollo:

```powershell
# Ejecutar verificación segura en base de integración
powershell -File "Scripts de ejecucion automatica/database/verify-postgresql-native.ps1" -DatabaseName "automotors_garage_integration"
```

### Funcionalidades de Seguridad del Script:
1. **Comprobación de Socket TCP**: Verifica si el puerto `5432` está respondiendo en `127.0.0.1`.
2. **Rechazo de Bases Prohibidas**: Bloquea de forma estricta la ejecución contra bases que contengan `prod`, `production` o la base principal `automotors_garage` para prevenir sobrescrituras accidentales.
3. **Creación Automática de Base Aislada**: Si `automotors_garage_integration` no existe, la crea sin tocar ninguna otra base.
4. **Ejecución Transaccional de Migraciones**: Aplica secuencialmente `0001`, `0002` y `0003` mediante `DatabaseMigrator`.
5. **Comprobación de Esquema**: Confirma la presencia exacta de las **26 tablas relacionales** en `information_schema.tables`.

---

## 6. Pruebas que Requieren PostgreSQL Real (Hacia Milestone 14.2.2)

Aunque PGlite ejecuta el dialecto PostgreSQL 16 con fidelidad en memoria, las siguientes pruebas requerirán la instancia nativa activa:
1. **Concurrencia Multi-Cliente y Connection Pooling**: Saturación de conexiones simultáneas mediante `pg.Pool` con múltiples workers de Node.
2. **Backups y Dumps Físicos**: Pruebas de exportación/restauración con utilitarios nativos `pg_dump` y `pg_restore`.
3. **Comportamiento ante Caídas de Red y Reintentos**: Pruebas de desconexión abrupta del servicio Windows durante transacciones activas.
4. **Migración de Datos desde PGlite**: Transferencia de los registros acumulados en `.data/postgres_dev` hacia la base nativa `automotors_garage`.
