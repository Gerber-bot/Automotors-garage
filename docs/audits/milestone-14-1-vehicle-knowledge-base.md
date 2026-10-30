# Auditoría Técnica Final: Milestone 14.1 — Vehicle Knowledge Base
**Fecha de Auditoría**: 30 de Octubre de 2026  
**Ámbito**: Vehicle Knowledge Base, Integración Automotors Pro & Mi Automotors, Seguridad Multi-Tenant, Migraciones y Determinismo Matemático.

---

## 1. Problemas Críticos Detectados Durante la Auditoría

1. **Vulnerabilidad de Autorización en el Catálogo Compartido**:
   - *Hallazgo*: Los endpoints `POST /api/v1/kb/rules/:id/verify` y `POST /api/v1/kb/rules/:id/revision` únicamente requerían autenticación genérica (`reqContext.principal`), permitiendo que cualquier taller o propietario alterase las especificaciones técnicas globales de la plataforma.
   - *Riesgo*: Contaminación del catálogo compartido por parte de talleres individuales o usuarios maliciosos.
   - *Corrección*: Se restringió el acceso estrictamente a administradores globales de plataforma (`SUPER_ADMIN`). Cualquier intento de modificación por parte de un usuario de taller (`WORKSHOP_OWNER`, `WORKSHOP_MANAGER`, `MECHANIC`) o particular (`VEHICLE_OWNER`) es rechazado de inmediato con `403 Forbidden`.

2. **Etiquetado Engañoso de Homologación en Interfaz de Usuario**:
   - *Hallazgo*: En `MiAutomotorsView.tsx`, cuando un propietario seleccionaba un motor candidato en caso de ambigüedad, la interfaz mostraba la insignia `Homologación Verificada`.
   - *Riesgo*: Falsa equivalencia entre la declaración no peritada de un usuario y la certificación oficial de fábrica o inspección presencial de taller.
   - *Corrección*: Se diferenciaron con precisión los 4 estados canónicos requeridos:
     - **Selección Realizada por el Propietario** (Insignia `info` en el rodado del usuario).
     - **Identificación Respaldada por Evidencia** (Insignia `success` para vehículos corroborados por taller mediante inspección o documentación).
     - **Especificación Técnica Verificada** (Insignia que califica únicamente al catálogo OEM verificado).
     - **Configuración Pendiente — Variantes Detectadas** (Insignia de advertencia cuando coexisten variantes sin resolver).
     - Se actualizó el botón de acción a *"Seleccionar esta Motorización (Mi Unidad)"* con microcopy explicativo: *"Selección declarada por titular • Aplica pautas OEM verificadas"*.

3. **Ausencia de Script y Procedimiento de Reversibilidad en Migración 0003**:
   - *Hallazgo*: La migración `0003_vehicle_knowledge_base.sql` carecía de su correspondiente script de rollback (`.down.sql`) y de pruebas de reversión en bases de datos relacionales.
   - *Corrección*: Se implementó `packages/database/src/migrations/0003_vehicle_knowledge_base.down.sql`, eliminando la columna `vehicles.configuration_id` y las 8 tablas en orden inverso de dependencia relacional (`CASCADE`). Se agregó una prueba automatizada en `milestone-14-vehicle-knowledge-base.spec.ts` (Test 16) que aplica 0001-0003, ejecuta el rollback completo, verifica la inexistencia de tablas residuales y vuelve a aplicar las migraciones limpiamente.

4. **Desconexión de la Suite M14 del Runner General `npm test`**:
   - *Hallazgo*: `npm test` reportaba 134 pruebas porque `package.json` no incluía la nueva suite en su comando de ejecución.
   - *Corrección*: Se incorporó `tests/integration/milestone-14-vehicle-knowledge-base.spec.ts` al script `"test"`, totalizando 150 pruebas en 19 suites con 100% de éxito.

---

## 2. Auditoría de Fuentes Técnicas (Renault Logan 1.6 2020)

Se auditó minuciosamente la parametrización de la unidad de referencia:
- **Estado Documental**: La referencia preliminar `REF-REN-MAN-2020-L52` fue auditada y descartada por falta de respaldo documental primario oficial verificado.
- **Tratamiento Riguroso de Reglas**: Todas las reglas de mantenimiento y especificaciones del Renault Logan 2020 (aceite, filtros, frenos, bujías, refrigerante, inspección) se establecieron en estado `PENDING_VERIFICATION` con origen `GENERIC_INDUSTRY`.
- **Exclusión de Cálculos Deterministas**: Las reglas en revisión quedan excluidas de las recomendaciones automáticas de mantenimiento preventivo, devolviendo de manera transparente `INSUFFICIENT_DATA` para evitar falsas certezas técnicas.
- **Document Sources**: En `kb_document_sources`, el registro del manual Renault Argentina se mantiene con `review_status = 'PENDING_VERIFICATION'` y `document_reference = NULL`.
- **Ambigüedad Mecánica Registrada**:
  - Variante SCe 1.6 16v (H4M - 115 CV): Distribución por `CADENA` metálica bañada en aceite.
  - Variante Hi-Torque 1.6 8v (K7M - 85 CV): Distribución por `CORREA` dentada.
  - Ambas variantes coexisten como candidatas exigiendo confirmación del titular o peritaje de taller.

---

## 3. Matriz de Resultados de Verificación y Compilación

| Verificación | Herramienta | Resultado | Detalle |
| :--- | :--- | :---: | :--- |
| **Typecheck** | TypeScript 5.7.3 (`tsc --noEmit`) | **0 errores** | 5 proyectos del monorepo verificados |
| **Linter** | ESLint 8.57.1 | **0 errores** | 0 warnings críticos |
| **Pruebas M14.1** | Node Test Runner | **16/16 passed** | Cobertura integral funcional y de seguridad |
| **Pruebas Monorepo** | Node Test Runner | **150/150 passed** | 19 suites completas sin regresiones |
| **Compilación Frontend** | Next.js 15.5.28 (`next build`) | **Código 0** | Build de producción optimizado (9 páginas estáticas) |

---

## 4. Riesgos y Validaciones Pendientes

1. **Validación E2E Visual**: Pendiente de ejecución en navegador real mediante suite E2E (Playwright) para verificar interactividad responsive, navegación y renderizado de badges de homologación en dispositivos móviles y de escritorio.
2. **Validación con PostgreSQL Real**: Las suites automatizadas se ejecutan actualmente sobre motor PostgreSQL embebido (PGlite). Queda pendiente la comprobación sobre instancia externa de PostgreSQL en contenedor Docker.
3. **Incorporación de Documentación Primaria OEM**: Pendiente de obtención y archivo de los manuales de taller oficiales para promover las reglas de `PENDING_VERIFICATION` a `VERIFIED`.
