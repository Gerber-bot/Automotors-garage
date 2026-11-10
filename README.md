# Automotors Garage

> Plataforma SaaS de ingeniería automotriz para gestión integral de talleres mecánicos (**Automotors Pro**) y pasaporte digital verificable para propietarios de vehículos (**Mi Automotors**).

---

## 1. Presentación del Proyecto

**Automotors Garage** centraliza la trazabilidad técnica vehicular y la administración operativa de talleres en una única plataforma unificada.

El sistema resuelve dos necesidades fundamentales a través de dos experiencias integradas:

1. **Automotors Pro (Talleres y Operación)**:
   - Panel de control operativo y monitoreo de bahías de trabajo.
   - Máquina de estados finita para órdenes de reparación: `PENDING_DIAGNOSIS` -> `DIAGNOSED` -> `APPROVED` -> `IN_PROGRESS` -> `QUALITY_CHECK` -> `READY_FOR_PICKUP` -> `DELIVERED`.
   - Registro ágil de servicios menores (**Quick Service**) con confirmación humana técnica obligatoria.
   - Asistente de diagnóstico OBD-II estandarizado bajo norma SAE J2012 con pasos de verificación guiada.
   - Seguridad multi-inquilino (*multi-tenant*) con aislamiento estricto por taller y permisos basados en roles (RBAC).

2. **Mi Automotors (Propietarios y Flotas)**:
   - Pasaporte digital de mantenimiento y registro de kilometraje auditable.
   - Trazabilidad de intervenciones con diferenciación de procedencia:
     - **CERTIFICADO POR TALLER**: Servicios documentados y sellados por un taller profesional registrado.
     - **DECLARADO POR PROPIETARIO**: Registros preventivos asentados de manera directa por el dueño del vehículo.
   - Demos interactivas públicas en `/demo/propietario` y `/demo/taller` sin requerir registro ni backend activo.

### Funcionalidades Verificadas en Código
- Aislamiento multi-inquilino probado mediante pruebas automatizadas.
- Contratos de datos validados estrictamente con Zod.
- Cifrado de contraseñas con Argon2id y sesiones con JWT de vida corta.
- Demos interactivas aisladas en el frontend que no tocan datos persistentes ni elevan privilegios.

---

## 2. Requisitos Previos del Sistema

Antes de comenzar, verifique que su computadora cuente con:

- **Sistema Operativo**: Windows 10 o Windows 11 (64-bit).
- **PowerShell**: Windows PowerShell 5.1 (incluido por defecto en Windows) o PowerShell 7+.
- **Node.js**: Versión 24.x para los comandos actuales con `--experimental-strip-types` y carga opcional de `.env`. Descargar desde [nodejs.org](https://nodejs.org/).
- **npm**: Versión 10.x o superior (se instala automáticamente con Node.js).
- **Git**: Opcional si se descarga como archivo ZIP, recomendado para clonar y sincronizar. Descargar desde [git-scm.com](https://git-scm.com/).
- **Espacio en disco**: Mínimo 1.5 GB disponibles para dependencias y cachés de compilación.
- **Puertos de red libres**:
  - `3000`: Interfaz web Next.js (Dashboard y Demos).
  - `4000`: API REST y servicios backend.

> **Importante sobre Persistencia**:  
> **NO se requiere instalar Docker ni un servidor PostgreSQL externo** para el desarrollo local. Automotors Garage incluye un motor WebAssembly embebido (**PGlite**) basado en PostgreSQL 16 que guarda los datos directamente en la carpeta local `.data/`.

---

## 3. Estructura del Repositorio y Scripts de Ejecución

Todos los archivos de automatización residen en una única carpeta dedicada:

```text
AutomotorsGarage/
│
├── Scripts de ejecucion automatica/
│   │
│   ├── COMPROBAR_ENTORNO.bat          <-- [1] Comprobador automático no destructivo
│   ├── INICIAR_COMPLETO.bat           <-- [2] Inicio completo local estándar (127.0.0.1)
│   ├── INICIAR_COMPLETO_MODO_LAN.bat  <-- [3] Inicio modo red local / celular (Wi-Fi)
│   ├── DETENER_AUTOMOTORS.bat         <-- [4] Detención segura de procesos y liberación de puertos
│   │
│   ├── powershell/
│   │   └── automotors.ps1             <-- Controlador central unificado (START, START-LAN, STOP, CHECK)
│   │
│   ├── utilities/
│   │   ├── check-env.ps1              <-- Diagnóstico exhaustivo del sistema y dependencias
│   │   ├── check-health.ps1           <-- Sondeo de salud y latencia (/health/ready)
│   │   ├── process-utils.ps1          <-- Manejo seguro de PIDs y detección de IP LAN
│   │   ├── run-tests.ps1              <-- Ejecutor de pruebas con aislamiento
│   │   └── setup-dev.ps1              <-- Inicialización de carpetas de runtime
│   │
│   └── database/
│       ├── seed-demo.ts               <-- Sembrador determinista de datos de prueba
│       ├── seed-demo.ps1              <-- Wrapper PowerShell para sembrado
│       └── verify-postgresql-native.ps1 <-- Script con efectos sobre la base; no usar para diagnóstico
│
├── apps/
│   ├── backend/                       <-- Servidor API REST y lógica de dominio
│   └── frontend/                      <-- Aplicación web Next.js 15
├── packages/
│   ├── database/                      <-- Cliente dual Drizzle/PGlite y migraciones
│   ├── obd-core/                      <-- Biblioteca técnica OBD-II (SAE J2012)
│   └── security-foundation/           <-- Argon2id, JWT y RBAC
├── docs/                              <-- Documentación arquitectónica y guías
├── tests/                             <-- Suites de integración E2E
├── package.json                       <-- Comandos y dependencias del monorepo
└── README.md                          <-- Esta guía
```

---

## 4. Guía de Instalación Inicial (Paso a Paso)

Para PostgreSQL nativo y las precauciones de migración, consulte [Desarrollo en Windows sin contenedores](docs/development/environment-setup.md). La preparación del esquema es una operación independiente: el inicio habitual solo debe verificar su estado. Confirme siempre la base de datos antes de preparar una instalación.

Si es la primera vez que descarga o clona Automotors Garage, siga este procedimiento paso a paso:

### Paso 1: Instalar Node.js
Descargue e instale **Node.js 24 LTS** desde [https://nodejs.org/](https://nodejs.org/). Durante la instalación, asegúrese de marcar la opción para agregar Node.js y npm al `PATH`.

### Paso 2: Descargar el Proyecto
- **Opción con Git (Recomendada)**:
  ```bash
  git clone https://github.com/Gerber-bot/Automotors-garage.git
  cd Automotors-garage
  ```
- **Opción sin Git**:
  Descargue el archivo ZIP desde GitHub y extráigalo en su computadora (por ejemplo, en `C:\Proyectos\AutomotorsGarage`).

### Paso 3: Comprobar el Entorno Inicial
Abra la carpeta `Scripts de ejecucion automatica` en el Explorador de Windows y haga doble clic en:

👉 **`COMPROBAR_ENTORNO.bat`**

Este script verifica herramientas y rutas sin iniciar servicios ni migrar bases de datos.

### Paso 4: Instalar Dependencias del Monorepo
Abra una terminal (PowerShell o CMD) en la raíz del proyecto y ejecute:

```bash
npm ci
```
*Este comando instala las bibliotecas requeridas en la raíz y en el frontend mediante el gancho `postinstall`.*

### Paso 5: Volver a Comprobar el Entorno
Vuelva a ejecutar:

👉 **`COMPROBAR_ENTORNO.bat`**

Verificará que todas las dependencias y enlaces internos del monorepo estén correctamente listos (`[EQUIPO PREPARADO]`).

### Paso 6: Preparar la base de datos una sola vez

Antes del primer inicio, compruebe el destino configurado y prepare **solo una base local nueva y aislada**:

```powershell
npm run db:status
npm run db:apply
npm run db:status
```

Si la base ya contiene información y no tiene historial de migraciones, no ejecute `db:apply` para adivinar su estado. **`db:adopt` está temporalmente deshabilitado**: preserve la base y solicite revisión manual. Consulte [la guía de preparación](docs/development/environment-setup.md). El inicio diario no aplica ni adopta migraciones.

### Paso 7: Iniciar Automotors Garage
Haga doble clic en:

👉 **`INICIAR_COMPLETO.bat`**

Después de la preparación inicial del esquema, el sistema abrirá PGlite en el directorio de datos de esta instalación, iniciará el backend API en el puerto 4000 y el frontend Next.js en el puerto 3000, y abrirá `http://localhost:3000`. Si faltan migraciones, el inicio se detiene sin aplicarlas.

---

## 5. Ejecución Habitual y Operación Diaria

Una vez instalado el software, para trabajar diariamente solo necesita utilizar los botones situados en **`Scripts de ejecucion automatica`**:

### Botón 1: Iniciar Completo (`INICIAR_COMPLETO.bat`)
Inicia el sistema completo para desarrollo local:
- **Landing y SaaS**: [http://localhost:3000/](http://localhost:3000/)
- **Demo Propietario (Mi Automotors)**: [http://localhost:3000/demo/propietario](http://localhost:3000/demo/propietario)
- **Demo Taller (Automotors Pro)**: [http://localhost:3000/demo/taller](http://localhost:3000/demo/taller)
- **Backend API REST**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **Health Readiness**: [http://localhost:4000/health/ready](http://localhost:4000/health/ready)

El inicio comprueba el estado de las migraciones y de los puertos. Si faltan migraciones o un puerto pertenece a otra aplicación, se detiene y muestra el motivo; **no aplica migraciones ni cierra procesos ajenos**.

*Equivalente por consola:* `npm run dev`

### Botón 2: Iniciar en Modo Red Local / Celular (`INICIAR_COMPLETO_MODO_LAN.bat`)
Permite probar la aplicación desde su teléfono celular o tablet conectado a la misma red Wi-Fi:
- Detecta automáticamente la dirección IP privada de su computadora (ej. `192.168.0.14`).
- Configura el frontend y el backend para escuchar en `0.0.0.0`.
- Muestra en consola la URL exacta para ingresar desde su teléfono:
  `http://<IP_PRIVADA>:3000/demo/propietario`
  `http://<IP_PRIVADA>:3000/demo/taller`
- Las peticiones a la API se canalizan a través del proxy BFF de Next.js de forma transparente.

*Equivalente por consola:* `npm run dev:lan`

### Botón 3: Detener Servicios (`DETENER_AUTOMOTORS.bat`)
Solicita el apagado de los procesos de frontend y backend **solo después de verificar que pertenecen a esta instalación**. Conserva los datos y registros; si la identidad no coincide, no termina procesos ajenos.

*Equivalente por consola:* `npm run dev:stop`

### Botón 4: Comprobar Entorno (`COMPROBAR_ENTORNO.bat`)
Realiza una auditoría visual no destructiva de su sistema en cualquier momento para verificar que las herramientas, dependencias y puertos sigan en perfecto estado.

*Equivalente por consola:* `npm run dev:check`

---

## 6. Persistencia de Datos y PostgreSQL

### PGlite (Predeterminado)
- Automotors Garage utiliza **PGlite**, un motor PostgreSQL compilado a WebAssembly que corre en proceso y almacena sus tablas físicamente en `.data/postgres_dev`.
- **Nunca elimine la carpeta `.data`**: allí reside la información de vehículos, órdenes de trabajo y clientes creados durante el uso local.

### PostgreSQL Nativo (Opcional)
- El software está preparado para conectarse a un servidor PostgreSQL nativo en Windows configurando en `.env`:
  ```ini
  DB_PROVIDER=postgres
  DATABASE_URL=postgresql://usuario:password@127.0.0.1:5432/automotors_garage
  ```
- Esta opción es puramente opcional y no se requiere para evaluar el producto.

---

## 7. Solución de Problemas Frecuentes

| Problema | Causa Probable | Solución Recomendada |
| :--- | :--- | :--- |
| **Node.js no está instalado** | Node.js no se instaló o no se agregó al PATH. | Descargue e instale Node.js 24 LTS desde [nodejs.org](https://nodejs.org/) y reinicie la terminal. |
| **npm no se reconoce como comando** | Instalación incompleta de Node.js. | Reinstale Node.js verificando que la opción "npm package manager" esté habilitada. |
| **Dependencias faltantes (`node_modules`)** | No se ejecutó la instalación inicial. | Ejecute `npm ci` desde la raíz del repositorio. |
| **Puerto 4000 o 3000 ocupado (`EADDRINUSE`)** | Otra instancia u otra aplicación usa el puerto. | Compruebe quién lo ocupa antes de actuar. El lanzador de esta copia no debe cerrar procesos ajenos. |
| **Backend no responde (`/health/ready`)** | Un cierre abrupto anterior pudo dejar un registro de proceso inactivo o una base sin preparar. | Ejecute `DETENER_AUTOMOTORS.bat`: descarta solo registros cuyo proceso ya no existe y no fuerza procesos ajenos. Luego revise `npm run db:status` antes de reiniciar. |
| **Frontend no compila o error de `readlink` / `ENOENT`** | El proyecto está dentro de OneDrive y compite por bloqueos de archivos. | Pause la sincronización de OneDrive temporalmente o mueva el proyecto a una ruta no sincronizada (ej. `C:\Proyectos\AutomotorsGarage`). |
| **No se puede acceder desde el celular en modo LAN** | El firewall de Windows bloquea conexiones entrantes en el perfil 'Público'. | Asegúrese de que su red Wi-Fi esté configurada como **"Red Privada"** en Windows. En PowerShell como administrador puede habilitar el puerto: `New-NetFirewallRule -DisplayName 'Automotors Dev LAN' -Direction Inbound -LocalPort 3000,4000 -Protocol TCP -Profile Private -Action Allow`. |
| **Error de script deshabilitado en PowerShell** | La política de ejecución de Windows restringe scripts `.ps1`. | Los archivos `.bat` ya ejecutan PowerShell con `-ExecutionPolicy Bypass`. Para ejecutar scripts manualmente, configure: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`. |

---

## 8. Comandos de Verificación y Calidad

Para desarrolladores que contribuyen al código base:

```bash
# Diagnóstico de entorno local
npm run dev:check

# Verificación estricta de tipos TypeScript (0 errores tolerados)
npm run typecheck

# Verificación de calidad de código con ESLint
npm run lint

# Batería completa de pruebas automatizadas (incluye seguridad y migraciones)
npm test

# Compilación productiva de Next.js
npm run build

# Sembrado: requiere destino PGlite desechable preparado y confirmación explícita
npm run seed:demo
```

El sembrado es una operación separada: solo acepta PGlite local, `PG_DATA_DIR` explícito y `DEMO_SEED_ACK=I_CONFIRM_DISPOSABLE_LOCAL_DATA`. Las conexiones externas están deshabilitadas. Consulte la [preparación de datos demo](docs/development/environment-setup.md); no lo utilice como inicio habitual ni para recuperar datos.
