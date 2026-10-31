# Automotors Garage

> Plataforma SaaS de ingeniería automotriz para gestión de talleres mecánicos (**Automotors Pro**) y pasaporte digital verificable para propietarios de vehículos (**Mi Automotors**).

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

## 2. Tecnologías

- **Entorno de Ejecución**: Node.js 20+ / Node.js 24 (validado en CI).
- **Lenguaje**: TypeScript 5.7+ con verificación estricta de tipos.
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide React icons.
- **Backend**: NestJS / Node HTTP modular monolith con Clean Architecture.
- **Motor de Base de Datos**:
  - **PGlite (WASM embebido)**: Motor predeterminado de desarrollo local con almacenamiento en disco bajo `.data/`. Cero dependencias externas.
  - **PostgreSQL 16 (Nativo)**: Arquitectura dual lista en código (mediante `DB_PROVIDER=postgres`), pendiente de validación física sobre servidor PostgreSQL real.

---

## 3. Requisitos del Sistema

Antes de comenzar, verifique que su computadora cuente con:

- **Sistema Operativo**: Windows 10 o Windows 11 (64-bit).
- **PowerShell**: PowerShell 5.1 o PowerShell 7+ (incluido en Windows).
- **Node.js**: Versión 20.x o superior (Node.js 24 recomendado). Descargar desde [nodejs.org](https://nodejs.org/).
- **npm**: Versión 10.x o superior (se instala automáticamente con Node.js).
- **Git**: Para clonar el repositorio y sincronizar cambios. Descargar desde [git-scm.com](https://git-scm.com/).
- **Espacio en disco**: Mínimo 1.5 GB disponibles para dependencias y cachés de compilación.
- **Puertos de red libres**:
  - `3000`: Interfaz web Next.js (Dashboard y Demos).
  - `4000`: API REST y servicios backend.

---

## 4. Descargar el Proyecto

### Opción A — Clonar mediante Git (Recomendado)
Abra PowerShell o la terminal de Windows y ejecute:

```bash
git clone https://github.com/Gerber-bot/Automotors-garage.git
cd Automotors-garage
```

### Opción B — Descarga en archivo ZIP
1. Ingrese a `https://github.com/Gerber-bot/Automotors-garage`.
2. Haga clic en el botón verde **Code** y seleccione **Download ZIP**.
3. Descomprima el archivo en una carpeta de su disco local (ejemplo: `C:\Proyectos\Automotors-garage`).
4. *Nota*: Si utiliza la descarga ZIP, los comandos de `git` no estarán disponibles a menos que inicialice un repositorio local con `git init`.

---

## 5. Primera Instalación

Desde la raíz del proyecto en su terminal:

```bash
# Instalar dependencias exactas y reproducibles
npm ci
```

### Configuración del Entorno (`.env`)
El proyecto incluye un archivo de plantilla `.env.example`. Los iniciadores automatizados (`.bat`) crean una copia `.env` automáticamente si no existe.

Si prefiere configurarlo manualmente:
```bash
copy .env.example .env
```
*Aviso de seguridad*: El archivo `.env.example` contiene únicamente valores de plantilla locales y seguros. Nunca guarde secretos productivos ni contraseñas reales en este archivo.

---

## 6. Iniciar la Aplicación en Windows

Automotors Garage cuenta con dos lanzadores principales de un solo clic ubicados en la raíz del repositorio:

### 1. `INICIAR_COMPLETO.bat` (Modo Local Estándar)
Haga doble clic sobre **`INICIAR_COMPLETO.bat`** en el Explorador de Windows o ejecútelo desde la terminal:

```cmd
INICIAR_COMPLETO.bat
```

**Qué hace automáticamente**:
1. Detecta la raíz real del repositorio sin importar la unidad o ruta con espacios.
2. Comprueba que Node.js y npm estén instalados.
3. Instala dependencias con `npm ci` si la carpeta `node_modules` no existe.
4. Prepara el entorno `.env` y las carpetas locales (`.data/`, `.run/`, `.logs/`).
5. Inicia el Backend en `http://localhost:4000` con persistencia PGlite.
6. Espera la confirmación de salud (`/health/ready`).
7. Inicia el Frontend Next.js en `http://localhost:3000`.
8. Comprueba la disponibilidad HTTP y abre su navegador automáticamente en `http://localhost:3000`.

### 2. `INICIAR_COMPLETO_MODO_LAN.bat` (Modo Red Local / Celulares)
Haga doble clic sobre **`INICIAR_COMPLETO_MODO_LAN.bat`** para habilitar el acceso desde teléfonos móviles, tablets u otras computadoras en la misma red Wi-Fi:

```cmd
INICIAR_COMPLETO_MODO_LAN.bat
```

**Qué hace automáticamente**:
1. Ejecuta todas las validaciones del inicio completo.
2. Detecta su dirección IP privada real (ejemplo: `192.168.1.50`), descartando adaptadores virtuales (WSL, Hyper-V, VPNs).
3. Configura Next.js y el backend para escuchar en `0.0.0.0` (todas las interfaces de red).
4. Muestra en pantalla las direcciones exactas para abrir en su celular o tablet.

### Detener la Aplicación
Para finalizar todos los procesos de forma limpia y liberar los puertos:
Haga doble clic en **`DETENER_AUTOMOTORS.bat`**.

---

## 7. Direcciones de Acceso

Una vez iniciado el sistema:

| Destino | Dirección Local (PC) | Descripción |
| :--- | :--- | :--- |
| **Landing Pública** | [http://localhost:3000](http://localhost:3000) | Página principal con presentación de ambas soluciones. |
| **Demo Propietario** | [http://localhost:3000/demo/propietario](http://localhost:3000/demo/propietario) | Experiencia Mi Automotors con vehículos de prueba y registro local. |
| **Demo Taller** | [http://localhost:3000/demo/taller](http://localhost:3000/demo/taller) | Experiencia Automotors Pro con órdenes, Quick Service y OBD-II. |
| **API Backend v1** | [http://localhost:4000/api/v1](http://localhost:4000/api/v1) | Endpoints REST del backend. |
| **Healthcheck** | [http://localhost:4000/health/ready](http://localhost:4000/health/ready) | Diagnóstico en vivo de la base de datos y servicios. |

---

## 8. Guía del Modo LAN (Celulares y Red Local)

Para probar la interfaz responsive desde un teléfono móvil o tableta:

1. Conecte su teléfono móvil a la **misma red Wi-Fi** donde está conectada su computadora.
2. Inicie la aplicación con **`INICIAR_COMPLETO_MODO_LAN.bat`**.
3. La consola mostrará su dirección IP detectada. Por ejemplo:
   - `Landing: http://192.168.1.100:3000/`
   - `Demo Propietario: http://192.168.1.100:3000/demo/propietario`
   - `Demo Taller: http://192.168.1.100:3000/demo/taller`
4. Abra el navegador de su teléfono (Chrome, Safari, Firefox) e ingrese la dirección indicada.

### Solución de Problemas con el Firewall de Windows
Si la página no carga en el celular:
- Asegúrese de que en Windows la red Wi-Fi esté configurada como **Red Privada** (no Pública).
- Si Windows Firewall solicita permiso al arrancar Node.js, presione **Permitir acceso** en Redes Privadas.
- *(Opcional / Solo administradores en red confiable)*: Puede autorizar los puertos con este comando en PowerShell:
  ```powershell
  New-NetFirewallRule -DisplayName "Automotors Dev LAN" -Direction Inbound -LocalPort 3000,4000 -Protocol TCP -Profile Private -Action Allow
  ```
- **Aviso de seguridad**: El modo LAN es exclusivo para desarrollo y pruebas en redes privadas seguras. Nunca abra puertos hacia internet en su router ni desactive el firewall de Windows.

---

## 9. Base de Datos y Persistencia

- **Motor Predeterminado**: PGlite (PostgreSQL compilado a WebAssembly).
- **Ubicación de Datos**: `.data/postgres_dev/`.
- **Persistencia**: Los datos registrados en desarrollo se guardan en su disco duro local y sobreviven a los reinicios.
- **Semilla de Demostración**: Si desea inicializar datos de prueba en la base de datos del backend:
  ```bash
  npm run seed:demo
  ```
- **PostgreSQL Nativo**: Preparado en código para conectarse mediante `DB_PROVIDER=postgres` y `DATABASE_URL` (consulte `docs/development/postgresql-local-setup.md`).

---

## 10. Comandos de Verificación y Calidad

Para ejecutar las comprobaciones de calidad del software:

```bash
# 1. Verificación estricta de tipos TypeScript (0 errores)
npm run typecheck

# 2. Análisis estático de código con ESLint
npm run lint

# 3. Suite completa de 156 pruebas automatizadas (19 suites)
npm test

# 4. Compilación estática de producción de Next.js
npm run build
```

---

## 11. Solución de Problemas Frecuentes

1. **`node` o `npm` no se reconoce como un comando**:
   - Node.js no está instalado o no se agregó al PATH del sistema. Reinicie la terminal tras instalar Node.js.
2. **Puerto 3000 o 4000 ocupado**:
   - Ejecute `DETENER_AUTOMOTORS.bat` para liberar instancias previas.
   - Si otro programa ajeno está usando el puerto, cierre dicho programa o configure un puerto alternativo.
3. **El Frontend no responde o queda en blanco**:
   - Verifique los registros en `.logs/frontend_dev.err.log`.
   - Limpie la caché transitoria de desarrollo eliminando la carpeta `apps/frontend/.next-dev`.
4. **Error de bloqueo de base de datos (`postmaster.pid`)**:
   - Sucede tras un cierre forzado del sistema. El backend detecta y remueve automáticamente los bloqueos huérfanos al volver a iniciar.
5. **Problemas con carpetas sincronizadas en OneDrive**:
   - Si el proyecto está dentro de OneDrive, la sincronización de archivos puede generar bloqueos transitorios en carpetas de caché (`.next`, `.data`). Se recomienda pausar la sincronización de OneDrive durante sesiones de desarrollo intensivo.

---

## 12. Estado Real del Proyecto

- **Landing y Demos Públicas**: 100% implementadas y verificadas visualmente. Operan de forma aislada en el cliente con datos sintéticos seguros.
- **Backend Modular**: Funcional con motor PGlite y validado por 156 pruebas unitarias y de integración.
- **PostgreSQL 16 Físico**: Preparado en arquitectura dual pero **no validado en producción real** en este entorno.
- **Estado de Release**: Versión de desarrollo y demostración técnica. No apto para despliegue productivo comercial sin antes completar la auditoría de infraestructura y base de datos nativa.
