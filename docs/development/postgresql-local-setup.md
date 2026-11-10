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
    - Asignar una contraseña privada para el superusuario `postgres`; utilizar un rol dedicado para la aplicación.
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

# Conexión completa por URL (configurar el valor real solo en el archivo local):
DATABASE_URL=postgresql://<usuario>:<clave>@127.0.0.1:5432/<base>

# O parámetros individuales equivalentes:
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=<clave_privada>
DATABASE_NAME=automotors_garage
DATABASE_SSL=false
```

> [!IMPORTANT]
> **Seguridad de Conexión y Fail-Fast**:
> - Con `DB_PROVIDER=postgres` (o `NODE_ENV=production` sin proveedor explícito), si la base no está disponible el proceso termina sin cambiar automáticamente a PGlite.
> - En producción el proveedor debe ser PostgreSQL nativo; una configuración incompatible debe detener el proceso. Verifique `DB_PROVIDER=postgres` en el despliegue.
> - Si desea trabajar sin levantar PostgreSQL, configure simplemente `DB_PROVIDER=pglite`.
> - Los comandos `npm run start:api` y `npm run dev` cargan `.env` si existe. No publique el archivo ni las credenciales.

---

## 5. Comprobación segura y migraciones

Para comprobar la instalación sin escribir en bases existentes, utilice `Get-Service postgresql*`, `pg_isready -h 127.0.0.1 -p 5432` y, si dispone de acceso, una consulta `SELECT version()` con `psql` sobre una base autorizada.

**No ejecute** el script `verify-postgresql-native.ps1` para comprobar disponibilidad: puede crear una base y aplicar migraciones. El backend consulta el historial al iniciar, sin aplicar cambios. Utilice `npm run db:status` y reserve `db:apply` para un destino autorizado. **`db:adopt` está deshabilitado**: una base anterior sin registro debe conservarse y revisarse manualmente, nunca marcarse automáticamente. La validación nativa de PostgreSQL sigue pendiente; PGlite no la sustituye.

Para probar la migración, aprovisione una instancia PostgreSQL nativa **aislada y desechable**, configure un rol y una base exclusivos para pruebas, y aplique el SQL bajo supervisión después de comprobar el destino. Nunca use bases con datos persistentes.

---

## 6. Pruebas que Requieren PostgreSQL Real (Hacia Milestone 14.2.2)

Aunque PGlite ejecuta el dialecto PostgreSQL 16 con fidelidad en memoria, las siguientes pruebas requerirán la instancia nativa activa:
1. **Concurrencia Multi-Cliente y Connection Pooling**: Saturación de conexiones simultáneas mediante `pg.Pool` con múltiples workers de Node.
2. **Backups y Dumps Físicos**: Pruebas de exportación/restauración con utilitarios nativos `pg_dump` y `pg_restore`.
3. **Comportamiento ante Caídas de Red y Reintentos**: Pruebas de desconexión abrupta del servicio Windows durante transacciones activas.
4. **Migración de Datos desde PGlite**: Transferencia de los registros acumulados en `.data/postgres_dev` hacia la base nativa `automotors_garage`.
