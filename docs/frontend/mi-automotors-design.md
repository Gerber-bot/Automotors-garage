# Diseño UX/UI de Mi Automotors — Experiencia Mobile-First para Propietarios (Milestone 12)

## 1. Filosofía de Producto y Separación de Experiencias

**Automotors Garage** ofrece dos experiencias claramente diferenciadas sobre la misma plataforma:

1. **Automotors Pro (Experiencia Taller)**:
   - Orientada a jefes de taller, mecánicos y operadores multi-sucursal.
   - Incluye órdenes de trabajo, clientes, inventario de flota, Quick Service y telemetría OBD-II.
2. **Mi Automotors (Experiencia Propietario)**:
   - Orientada a conductores y titulares particulares (`VEHICLE_OWNER`).
   - Más simple, clara, transparente y 100% **mobile-first** (`390x844`, `430x932`, `768x1024` y `1366x768`).
   - Sin jerga administrativa interna de talleres ni exposición de costos confidenciales de terceros.

---

## 2. Arquitectura de Navegación

La interfaz de `MiAutomotorsView.tsx` organiza toda la experiencia en **4 secciones principales** accesibles desde una barra inferior fija en dispositivos móviles (`md:hidden`) y desde píldoras superiores en escritorio:

1. **Mi Garaje (`garage`)**:
   - Selector rápido de vehículos propios y botón **"Agregar Vehículo"**.
   - Tarjeta principal del vehículo con patente, año, motorización, transmisión, tipo de distribución (`Por Cadena Metálica` / `Por Correa Dentada`), VIN opcional y lectura de odómetro con actualización rápida validada contra retrocesos.
   - Tarjeta de **Base de Conocimiento Técnico & Especificaciones OEM** que informa el estado de completitud del perfil técnico (ej. en el **Renault Logan 1.6 2020**, indica distribución por cadena metálica y código de motor `H4M / HR16` pendiente de confirmación documental).
2. **Historial (`history`)**:
   - Resumen superior con contadores de **Total Eventos**, **Certificados por Taller** y **Declarados por Propietario**.
   - Cronología vertical inmutable con insignias semánticas diferenciadas:
     - `Certificado por Taller Red Automotors` (verde esmeralda con escudo de verificación).
     - `Declarado por Propietario (No Certificado)` (azul cielo con ícono de usuario).
   - Modal **"Registrar Mantenimiento Realizado"** con fecha por defecto en el día actual (editable para cargar mantenimientos históricos), categoría, kilometraje, descripción, lugar opcional, costo opcional y observaciones.
   - Modal **"Registrar Corrección Auditada"** que exige motivo de corrección y muestra en la tarjeta la trazabilidad completa (`valor original conservado` → `valor corregido`, autor y fecha).
3. **Mantenimientos (`predictions`)**:
   - Panel de estimaciones preventivas calculadas determinísticamente según el odómetro actual, el historial del vehículo y los intervalos OEM documentados.
   - Tarjetas por categoría (`Aceite y Filtro de Motor`, `Filtros de Aire y Habitáculo`, `Sistema de Frenos`, `Bujías de Encendido`, `Líquido Refrigerante`, `Sistema de Distribución`, `Inspección Multipunto`).
   - Indicadores de estado (`OK / AL DÍA`, `PRÓXIMO`, `VENCIDO`, `DATOS INSUFICIENTES`), próximo kilometraje, distancia restante, fecha estimada y días restantes.
   - Cuando no existen reglas o datos suficientes (como en `Sistema de Distribución` para el Renault Logan 1.6 2020 con cadena metálica y código de motor por confirmar), muestra explícitamente:
     > `"Necesitamos más información para estimar este mantenimiento"`
4. **Mi Perfil (`profile`)**:
   - Edición de nombre completo y teléfono de contacto del titular (`PUT /api/v1/owner/profile`).
   - Resumen de garantías de privacidad y seguridad por recurso.
   - Acceso rápido para alternar a **Automotors Pro** si la cuenta también posee membresía en un taller.

---

## 3. Flujo de Autenticación y Registro

- En `LoginView.tsx`, el usuario dispone de un selector superior entre:
  - **Iniciar Sesión**: detecta automáticamente si la cuenta pertenece a un propietario (`Mi Automotors`) o a un operador de taller (`Automotors Pro`).
  - **Crear Cuenta Propietario**: formulario directo para registrarse en `Mi Automotors` (`POST /api/auth/register` → BFF cookie `HttpOnly`, `SameSite=Lax` + protección CSRF).
