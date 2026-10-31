# Windows One-Click Launchers (`.bat`)

Automotors Garage provides a collection of seven Windows Batch (`.bat`) convenience launchers located at the root of the repository. These launchers enable developers, testers, and stakeholders to manage, run, diagnose, and demonstrate the application with a simple double-click from Windows Explorer, without requiring terminal interaction or administrative privileges.

---

## 1. Architectural Design & Safety Guarantees

All batch launchers adhere to strict engineering and security principles:

1. **Automatic Path Resolution (`%~dp0`)**: Every script detects the root path dynamically using `%~dp0` and switches directory using `cd /d "%~dp0"`. They operate correctly regardless of the caller directory or if paths contain spaces.
2. **Standard Non-Privileged Execution**: No administrator privileges are required or requested (`runas` is never invoked).
3. **Restricted PowerShell Invocation**: Commands invoke `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ...` strictly on local, verified repository scripts. They never modify system-wide or user-wide PowerShell execution policies.
4. **Window Persistence on Completion/Error**: Launchers pause before exiting (`pause >nul`), ensuring console output, diagnostic details, and error messages remain visible after double-clicking.
5. **Data Protection Invariant**: None of the launchers perform destructive actions, wipe data directories, or reset databases silently.
6. **Isolated Process Targeting**: Process termination is strictly bounded to Automotors Garage backend instances, protecting all other Node.js or system processes running on the machine.

---

## 2. Launchers Catalog

| Launcher | Core Action | PowerShell Target | Typical Use Case |
| :--- | :--- | :--- | :--- |
| **`INICIAR_AUTOMOTORS.bat`** | Verifies environment, launches development backend, confirms readiness, and opens browser to `http://localhost:4000/`. | `check-env.ps1`, `start-dev.ps1`, `check-health.ps1` | Daily feature development. |
| **`INICIAR_DEMO.bat`** | Prepares isolated demo database, seeds sample data idempotently, boots demo server, and opens demo portal (`/demo`). | `start-demo.ps1` | Product demonstrations, stakeholder reviews, and offline audits. |
| **`DETENER_AUTOMOTORS.bat`** | Targets and stops only active Automotors Garage backend processes and cleanly releases port 4000. | `stop-dev.ps1` | Safely ending work sessions. |
| **`REINICIAR_AUTOMOTORS.bat`** | Performs an atomic stop-and-restart cycle, confirms server health, and opens the application in the browser. | `restart-dev.ps1`, `check-health.ps1` | Reloading after major environment changes. |
| **`EJECUTAR_TESTS.bat`** | Executes all 7 project test suites sequentially, displays an execution summary, and preserves the exit code. | `run-tests.ps1` | Pre-commit validation and continuous integration sanity checks. |
| **`DIAGNOSTICAR.bat`** | Checks Node/npm/PowerShell versions, monorepo structure, and reports whether the HTTP server is currently online. | `check-env.ps1`, `check-health.ps1` | Troubleshooting environment or connectivity issues. |
| **`CONFIGURAR_ENTORNO.bat`** | Initializes local runtime folders (`.data/`, `.run/`, `.logs/`) and creates `.env` without overwriting existing files. | `setup-dev.ps1` | First-time project onboarding. |

---

## 3. Double-Click Usage Guide

### First-Time Onboarding
1. Open Windows Explorer and navigate to the project root folder:
   `C:\path\to\AutomotorsGarage`
2. Double-click **`CONFIGURAR_ENTORNO.bat`**. This creates `.data/`, `.run/`, `.logs/`, and copies `.env.example` to `.env` if not already present.
3. Double-click **`DIAGNOSTICAR.bat`** to confirm your system meets all prerequisites.

### Starting Development
- Double-click **`INICIAR_AUTOMOTORS.bat`**.
- The console will display startup progress:
  - `[1/3] Verificando entorno de ejecucion...`
  - `[2/3] Iniciando servidor backend de desarrollo...`
  - `[3/3] Confirmando disponibilidad del servicio...`
- Once healthy, your default browser opens automatically to [http://localhost:4000/](http://localhost:4000/).
- To stop the server at any time, double-click **`DETENER_AUTOMOTORS.bat`**.

### Running Commercial Demonstration
- Double-click **`INICIAR_DEMO.bat`**.
- Automatically seeds multi-tenant data into `./.data/postgres_demo` (VW Golf VII, Alpha Motors, Beta Service, customers, and work orders).
- Starts server in `demo` mode and opens [http://localhost:4000/demo](http://localhost:4000/demo).
- Development database (`./.data/postgres_dev`) remains completely untouched.

---

## 4. Troubleshooting Common Issues

### Issue 1: "Windows protected your PC" (SmartScreen)
- **Cause**: Windows Defender SmartScreen may display a warning for newly created `.bat` files downloaded or created outside standard installers.
- **Resolution**: Click **"More info"** ("Más información") followed by **"Run anyway"** ("Ejecutar de todas formas").

### Issue 2: Console Closes Immediately
- **Cause**: If an unknown system error occurs before PowerShell initializes.
- **Resolution**: Right-click the `.bat` file, select **"Edit"** or run it from a PowerShell or CMD terminal to inspect the immediate error output. All scripts are configured with `pause >nul` at both normal and error termination paths.

### Issue 3: Port 4000 Already Occupied
- **Symptom**: `[FAIL] El puerto 4000 ya esta ocupado por otro proceso.`
- **Resolution**: Double-click **`DETENER_AUTOMOTORS.bat`**. If another non-project application is listening on 4000, specify an alternative port in your `.env` file (`PORT=4001`).

### Issue 4: Server Reported as "DETENIDO" in `DIAGNOSTICAR.bat`
- **Symptom**: `[INFO] Servidor HTTP: El servidor esta actualmente DETENIDO.`
- **Explanation**: This is expected when the backend has not yet been started. It does not indicate an environment error. Run **`INICIAR_AUTOMOTORS.bat`** or **`INICIAR_DEMO.bat`** to start the service.
