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
- **PowerShell**: Windows PowerShell 5.1 (incluido por defecto en Windows) o PowerShell 7+.
- **Node.js**: Versión 20.x o superior (Node.js 24 recomendado). Descargar desde [nodejs.org](https://nodejs.org/).
- **npm**: Versión 10.x o superior (se instala automáticamente con Node.js).
- **Git**: Para clonar el repositorio y sincronizar cambios. Descargar desde [git-scm.com](https://git-scm.com/).
- **Espacio en disco**: Mínimo 1.5 GB disponibles para dependencias y cachés de compilación.
- **Puertos de red libres**:
  - `3000`: Interfaz web Next.js (Dashboard y Demos).
  - `4000`: API REST y servicios backend.

*Nota de arquitectura*: No se requiere instalar Docker ni un servidor PostgreSQL externo para el desarrollo y prueba local predeterminado.

---

## 4. Estructura del Repositorio

El proyecto organiza sus herramientas de automatización y ejecución en un directorio centralizado:

```text
AutomotorsGarage/
├── Scripts de ejecucion automatica/
│   ├── INICIAR_COMPLETO.bat           <-- Lanzador desarrollo local estándar
│   ├── INICIAR_COMPLETO_MODO_LAN.bat  <-- Lanzador modo red local (móviles/tablets)
│   ├── DETENER_AUTOMOTORS.bat         <-- Detención ordenada de servicios
│   ├── automotors.ps1                 <-- Controlador PowerShell unificado (START, START-LAN, STOP)
│   ├── database/                      <-- Sembrado demo y scripts de BD
│   └── utilities/                     <-- Utilidades de proceso, red y diagnóstico
├── apps/
│   ├── backend/                       <-- Servidor API REST y lógica de dominio
│   └── frontend/                      <-- Aplicación web Next.js 15
├── packages/
│   ├── database/                      <-- Cliente dual Drizzle/PGlite y migraciones
│   ├── obd-core/                      <-- Biblioteca técnica OBD-II (SAE J2012)
│   └── security-foundation/           <-- Argon2id, JWT y RBAC
├── docs/                              <-- Documentación arquitectónica y de producto
├── tests/                             <-- Suites de integración E2E
├── README.md                          <-- Esta guía
└── package.json                       <-- Configuración raíz del monorepo
```

---

## 5. Descargar e Instalar

### Paso 1: Clonar el Repositorio
Abra PowerShell o la terminal de Windows:

```bash
git clone https://github.com/Gerber-bot/Automotors-garage.git
cd Automotors-garage
```
*(Si utiliza descarga ZIP, descomprima el contenido en una carpeta local).*

### Paso 2: Instalar Dependencias
Desde la raíz del proyecto:

```bash
npm ci
```
*El comando `npm ci` instala las dependencias de raíz y, mediante un gancho `postinstall`, aprovisiona automáticamente las librerías de `apps/frontend`.*

### Paso 3: Configurar Variables de Entorno
Copie la plantilla `.env.example` a `.env`:

```bash
copy .env.example .env
```
*(Los lanzadores automáticos crean `.env` a partir de `.env.example` de forma transparente si no existe).*

---

## 6. Iniciar la Aplicación en Windows

Automotors Garage se inicia **siempre completo** (Backend + Frontend + Base de Datos). 

Abra la carpeta **`Scripts de ejecucion automatica`** en el Explorador de Windows:

### Opción A — Modo Local Estándar (`INICIAR_COMPLETO.bat`)
Haga doble clic en **`INICIAR_COMPLETO.bat`** (o ejecute `npm run dev` desde la raíz).

**Comportamiento**:
1. Verifica automáticamente Node.js y npm.
2. Inicia el Backend en `http://localhost:4000` con almacenamiento PGlite persistente en `.data/postgres_dev/`.
3. Valida la disponibilidad de la base de datos a través del healthcheck `/health/ready`.
4. Inicia el Frontend Next.js en `http://localhost:3000`.
5. Confirma disponibilidad HTTP y abre su navegador en `http://localhost:3000`.

### Opción B — Modo Red Local / LAN (`INICIAR_COMPLETO_MODO_LAN.bat`)
Haga doble clic en **`INICIAR_COMPLETO_MODO_LAN.bat`** (o ejecute `npm run dev:lan` desde la raíz).

**Comportamiento**:
1. Ejecuta todas las validaciones del inicio completo.
2. Detecta automáticamente la dirección IP privada real de su placa física Wi-Fi o Ethernet (ejemplo: `192.168.1.15`), descartando interfaces virtuales de WSL o VPNs.
3. Inicia Next.js y el Backend escuchando en todas las interfaces de red (`0.0.0.0`).
4. Configura la comunicación transparente entre el celular y la API a través del proxy BFF de Next.js.
5. Muestra en pantalla las direcciones exactas para ingresar desde su teléfono móvil o tableta.

### Detener los Servicios (`DETENER_AUTOMOTORS.bat`)
Haga doble clic en **`DETENER_AUTOMOTORS.bat`** (o ejecute `npm run dev:stop` desde la raíz).
- Detiene los procesos Node pertenecientes a Automotors Garage.
- Libera limpiamente los puertos 3000 y 4000.
- Preserva intactos los datos registrados en `.data/` y los logs en `.logs/`.

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

## 8. Guía del Modo LAN (Celulares y Tablets)

Para probar la experiencia móvil en un dispositivo físico:

1. Conecte su teléfono a la **misma red Wi-Fi** donde está conectada su computadora.
2. Inicie la aplicación con **`INICIAR_COMPLETO_MODO_LAN.bat`** (o `npm run dev:lan`).
3. La consola mostrará su IP detectada. Por ejemplo:
   - `Landing: http://192.168.1.100:3000/`
   - `Demo Propietario: http://192.168.1.100:3000/demo/propietario`
   - `Demo Taller: http://192.168.1.100:3000/demo/taller`
4. Ingrese la dirección en el navegador de su teléfono (Chrome, Safari, Firefox).

### Configuración del Firewall de Windows
- Asegúrese de que en Windows la red Wi-Fi esté establecida como **Red Privada** (no Pública).
- Si Windows Firewall consulta permisos al iniciar Node.js, acepte el acceso en Redes Privadas.
- *(Opcional / Solo administradores en red privada de confianza)*:
  ```powershell
  New-NetFirewallRule -DisplayName "Automotors Dev LAN" -Direction Inbound -LocalPort 3000,4000 -Protocol TCP -Profile Private -Action Allow
  ```
- **Seguridad**: El modo LAN no abre puertos en su router ni expone el sistema a internet. Es exclusivamente para pruebas en su red local confiable.

---

## 9. Comandos de Terminal (`npm`)

Desde la raíz del repositorio puede utilizar los siguientes comandos directos:

```bash
# Iniciar stack completo (localhost)
npm run dev

# Iniciar stack completo en modo red local / celular
npm run dev:lan

# Detener los servicios en ejecución
npm run dev:stop

# Sembrado de datos demo en la base de datos
npm run seed:demo

# Verificación de requisitos del entorno
npm run dev:check

# Verificación de salud del backend
npm run dev:health
```

---

## 10. Pruebas y Control de Calidad

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
   - Instale Node.js 20+ y asegúrese de marcar la opción "Add to PATH" durante la instalación. Reinicie su terminal tras instalar.
2. **Puerto 3000 o 4000 ocupado**:
   - Ejecute `DETENER_AUTOMOTORS.bat` o `npm run dev:stop`.
   - Si el puerto fue tomado por otra aplicación, cierre ese programa o modifique el puerto en las variables de entorno.
3. **El Frontend no responde o queda en blanco**:
   - Revise los logs en `.logs/frontend_dev.err.log`.
   - Elimine la carpeta transitoria de desarrollo `apps/frontend/.next-dev` para regenerar la caché.
4. **Error de bloqueo `postmaster.pid` en la base de datos**:
   - Ocurre tras un corte de energía o cierre abrupto de la máquina. El backend comprueba si el proceso anterior sigue vivo y retira automáticamente el bloqueo huérfano.
5. **Problemas con carpetas en OneDrive**:
   - Si aloja el repositorio dentro de una carpeta sincronizada por OneDrive, pause la sincronización temporalmente para evitar retardos en archivos de caché.

---

## 12. Estado Real del Software

- **Landing y Demos Públicas**: 100% funcionales en cliente con datos sintéticos aislados.
- **Backend Modular**: En funcionamiento con motor PGlite WASM, validado con 156 tests unitarios y de integración.
- **PostgreSQL 16 Nativo**: Arquitectura dual lista en código; pendiente de validación física sobre servidor físico PostgreSQL de producción.
- **Estado de Versión**: Versión de desarrollo, validación y demostración técnica.
