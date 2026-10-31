# Next.js Runtime Stability & Concurrency Isolation

## 1. Causa Raíz Identificada

El error `ENOENT: no such file or directory, open '.../apps/frontend/.next/server/vendor-chunks/lucide-react.js'` se debió a una colisión de ciclo de vida entre procesos concurrentes y su interacción con el sistema de archivos sincronizado por OneDrive:

1. **Colisión de Directorio de Salida (`distDir`)**:
   - Por defecto, Next.js compila tanto en desarrollo (`next dev`) como en producción (`next build`) en la misma carpeta `.next`.
   - En desarrollo, Webpack genera paquetes de módulos externos bajo demanda en `.next/server/vendor-chunks/<paquete>.js` (incluyendo `lucide-react.js`).
   - Al ejecutarse un build de producción (`npm run build` o `next build .`) para verificación o pruebas, Next.js purga completamente el directorio `.next` y reestructura los artefactos en hashes productivos (ej. `chunks/<hash>.js`), eliminando la estructura de `vendor-chunks`.
   - Como consecuencia, el servidor de desarrollo en memoria retuvo referencias a los chunks de desarrollo eliminados, provocando el fallo `ENOENT` en las siguientes peticiones HTTP.

2. **Interferencia de OneDrive**:
   - El repositorio se encuentra alojado en un entorno de desarrollo sincronizado por OneDrive.
   - La sincronización en tiempo real de OneDrive compite por los bloqueos de archivos (*file handles*) de las carpetas de caché transitorias (`.next`), generando retardos de I/O y race conditions cuando miles de archivos se crean o purgan concurrentemente.

3. **Borrado Destructivo en Scripts de Arranque**:
   - `scripts/powershell/start-frontend.ps1` ejecutaba un borrado incondicional `Remove-Item -Recurse -Force $nextCacheDir` al iniciar, destruyendo cualquier compilación previa y compitiendo con el proceso de sincronización.

---

## 2. Solución Aplicada

1. **Aislamiento de Artefactos mediante `distDir` Dinámico**:
   - Se configuró `apps/frontend/next.config.mjs` para separar de forma determinista los directorios de salida según el entorno:
     - **Desarrollo (`next dev`)**: `apps/frontend/.next-dev`
     - **Producción (`next build` / `next start`)**: `apps/frontend/.next`
     - **Sobrescritura por variable de entorno**: `NEXT_DIST_DIR`
   - Ambas ejecuciones operan ahora en espacios de nombres totalmente aislados. Un `next build` nunca purga ni interfiere con los `vendor-chunks` del servidor de desarrollo activo.

2. **Aislamiento en Control de Versiones (`.gitignore`)**:
   - Se añadieron reglas explícitas para `.next-dev/` y `.next-*/`, evitando la sincronización o commit accidental de artefactos de desarrollo.

3. **Eliminación de Limpiezas Destructivas en PowerShell**:
   - En `start-frontend.ps1`, se eliminó el borrado incondicional de caché al inicio.
   - Se incorporó el flag opcional `[switch]$Clean` para limpiezas explícitas cuando el operador lo requiera.
   - Se restringió la validación de sockets TCP a `-State Listen` para evitar falsos positivos con conexiones en `TIME_WAIT`.

---

## 3. Archivos Modificados

- [`apps/frontend/next.config.mjs`](../../apps/frontend/next.config.mjs): Configuración de `distDir` adaptativo (`.next-dev` vs `.next`).
- [`apps/frontend/tsconfig.json`](../../apps/frontend/tsconfig.json): Inclusión de tipos de desarrollo (`.next-dev/types/**/*.ts`).
- [`.gitignore`](../../.gitignore): Ignorado de `.next-dev/` y variantes `.next-*/`.
- [`scripts/powershell/start-frontend.ps1`](../../scripts/powershell/start-frontend.ps1): Parámetro `-Clean` opcional y comprobación de puerto en estado `Listen`.
- [`scripts/powershell/start-dev.ps1`](../../scripts/powershell/start-dev.ps1): Comprobación de puerto en estado `Listen`.
- [`apps/frontend/src/components/domain/VehiclesView.tsx`](../../apps/frontend/src/components/domain/VehiclesView.tsx): Memoización de `handleOpenDetail` con `useCallback` y limpieza de dependencias.

---

## 4. Resultados de Verificación

- **ESLint (`npm run lint`)**: 0 errores, 73 warnings históricos permitidos.
- **TypeScript (`npm run typecheck`)**: 0 errores en todos los subproyectos del monorepo.
- **Suite Automatizada (`npm test`)**: 115 pruebas superadas (16 suites, 0 fallos).
- **Compilación de Producción (`npm run build`)**: Generación estática exitosa (8/8 páginas) en concurrencia con el servidor de desarrollo activo.
- **Validación Visual y Navegación**: Capturas completas en 5 viewports bajo Chrome real autenticado sin ningún error `ENOENT`.
