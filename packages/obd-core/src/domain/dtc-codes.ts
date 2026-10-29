import type { ObdDtcCode, DtcSystem } from './obd-types.ts';

export const DTC_DATABASE: Record<string, Omit<ObdDtcCode, 'isPending'>> = {
  P0300: {
    code: 'P0300',
    system: 'POWERTRAIN',
    description: 'Detección de fallo de encendido aleatorio o múltiple en cilindros',
    severity: 'HIGH',
    possibleCauses: [
      'Bujías desgastadas o con separación incorrecta',
      'Bobinas de encendido defectuosas o con fuga de chispa',
      'Inyectores de combustible sucios o con goteo',
      'Baja presión de combustible o filtro obstruido',
      'Entrada de aire no medida en múltiple de admisión',
    ],
    recommendedChecks: [
      'Inspección visual de bujías y color de electrodos',
      'Medición de resistencia y continuidad de bobinas individuales',
      'Prueba de balance de cilindros con osciloscopio',
      'Medición de presión de rampa de inyección (3.0 - 3.5 bar)',
      'Verificación de fugas con máquina de humo en admisión',
    ],
  },
  P0301: {
    code: 'P0301',
    system: 'POWERTRAIN',
    description: 'Fallo de encendido detectado en Cilindro 1',
    severity: 'HIGH',
    possibleCauses: [
      'Bujía de cilindro 1 defectuosa',
      'Bobina de encendido del cilindro 1 dañada',
      'Inyector 1 con falla eléctrica o tapado',
      'Baja compresión en cilindro 1',
    ],
    recommendedChecks: [
      'Intercambiar bobina 1 con cilindro 2 y verificar si la falla migra',
      'Revisión de bujía 1',
      'Prueba de compresión en seco y con aceite',
    ],
  },
  P0115: {
    code: 'P0115',
    system: 'POWERTRAIN',
    description: 'Fallo en circuito del sensor de temperatura del refrigerante (ECT)',
    severity: 'MEDIUM',
    possibleCauses: [
      'Sensor ECT averiado o descalibrado',
      'Conector sulfatado, roto o cables en cortocircuito',
      'Termostato trabado abierto',
      'Nivel de refrigerante insuficiente',
    ],
    recommendedChecks: [
      'Medición de resistencia NTC del sensor ECT según temperatura ambiente',
      'Comprobación de voltaje de referencia (5.0V) en conector desenchufado',
      'Inspección visual del cableado hacia la ECU',
    ],
  },
  P0105: {
    code: 'P0105',
    system: 'POWERTRAIN',
    description: 'Mal funcionamiento en el circuito del sensor MAP (Presión Absoluta)',
    severity: 'MEDIUM',
    possibleCauses: [
      'Sensor MAP averiado',
      'Toma de vacío agrietada u o-ring de admisión reseco',
      'Cableado de señal o masa defectuoso',
    ],
    recommendedChecks: [
      'Lectura de presión barométrica en contacto antes del arranque (~100 kPa a nivel del mar)',
      'Inspección de o-ring de sellado del sensor en el múltiple',
      'Monitoreo de voltaje de señal con bomba de vacío manual',
    ],
  },
  P0130: {
    code: 'P0130',
    system: 'POWERTRAIN',
    description: 'Fallo en circuito del sensor de oxígeno (Sonda Lambda Banco 1 Sensor 1)',
    severity: 'MEDIUM',
    possibleCauses: [
      'Sonda lambda envejecida o contaminada por carbón/aceite',
      'Calefactor de sonda abierto o sin masa',
      'Fuga en escape antes de la sonda',
    ],
    recommendedChecks: [
      'Verificar oscilación de señal de 0.1V a 0.9V en caliente y régimen sostenido',
      'Medición de resistencia del calefactor de sonda (9 a 15 ohms)',
      'Comprobación de estanqueidad de brida de escape',
    ],
  },
  P0420: {
    code: 'P0420',
    system: 'POWERTRAIN',
    description: 'Eficiencia del convertidor catalítico por debajo del umbral (Banco 1)',
    severity: 'MEDIUM',
    possibleCauses: [
      'Catalizador degradado o quebrado internamente',
      'Sensor de oxígeno secundario (Sensor 2 post-catalizador) defectuoso',
      'Fuga de gases en el tramo medio del escape',
      'Mezcla rica prolongada por inyector goteando',
    ],
    recommendedChecks: [
      'Comparar señal de sensor 1 (oscilante) vs sensor 2 (estable en ~0.6V)',
      'Medición de temperatura con pirómetro infrarrojo en entrada vs salida del catalizador',
      'Inspección visual del monolito cerámico',
    ],
  },
  P0500: {
    code: 'P0500',
    system: 'POWERTRAIN',
    description: 'Fallo en el circuito del sensor de velocidad del vehículo (VSS)',
    severity: 'MEDIUM',
    possibleCauses: [
      'Sensor de velocidad en caja defectuoso o suelto',
      'Cableado interrumpido entre VSS y cuadro de instrumentos/ECU',
      'Módulo ABS no emite señal de velocidad por red CAN',
    ],
    recommendedChecks: [
      'Comprobar si el velocímetro en el tablero funciona o está muerto',
      'Escanear módulo ABS en búsqueda de códigos de sensores de rueda',
      'Verificar alimentación de 12V/masa en conector de caja',
    ],
  },
  P0560: {
    code: 'P0560',
    system: 'POWERTRAIN',
    description: 'Tensión del sistema fuera de rango normal',
    severity: 'HIGH',
    possibleCauses: [
      'Alternador con regulador de voltaje defectuoso (sobrecarga o baja carga)',
      'Batería agotada, sulfatada o celda en corto',
      'Bornes flojos o masa de chasis/motor corroída',
    ],
    recommendedChecks: [
      'Medición con multímetro en bornes: 12.6V apagado, 13.8V a 14.4V en marcha',
      'Prueba de caída de tensión en cable positivo y negativo con consumo',
      'Verificación de ondulación AC de diodos del alternador',
    ],
  },
  U0100: {
    code: 'U0100',
    system: 'NETWORK',
    description: 'Pérdida de comunicación con la Unidad de Control del Motor (ECM/PCM)',
    severity: 'CRITICAL',
    possibleCauses: [
      'Caída de la red CAN Bus (líneas CAN-H o CAN-L en corto o circuito abierto)',
      'Falta de alimentación principal o relé de inyección fallando',
      'Fusible de protección quemado',
    ],
    recommendedChecks: [
      'Medición de resistencia de terminación de red CAN entre pines 6 y 14 (debe ser ~60 ohms con batería desconectada)',
      'Comprobar tensiones en reposo: CAN-H (~2.5V a 3.5V), CAN-L (~1.5V a 2.5V)',
      'Verificar relé principal y fusibles de vano motor',
    ],
  },
  C0035: {
    code: 'C0035',
    system: 'CHASSIS',
    description: 'Sensor de velocidad de rueda delantera izquierda (Circuito ABS)',
    severity: 'MEDIUM',
    possibleCauses: [
      'Sensor inductivo/Hall sucio con virutas o dañado',
      'Corona fónica o rodamiento con banda magnética golpeado',
      'Cable cortado en la zona de flexión de la muelle suspensión',
    ],
    recommendedChecks: [
      'Inspección del cableado en zona de giro de rueda',
      'Limpieza de masa del sensor y corona',
      'Lectura de velocidad de rueda en vivo girando en elevador',
    ],
  },
};

/**
 * Decodes 2 raw hex bytes into an alphanumeric DTC code according to SAE J2012.
 * Byte A bits 7-6:
 * 00 = P (Powertrain)
 * 01 = C (Chassis)
 * 10 = B (Body)
 * 11 = U (Network)
 *
 * Byte A bits 5-4:
 * 00 = 0 (SAE standard code)
 * 01 = 1 (Manufacturer specific code)
 * 10 = 2 (SAE standard code)
 * 11 = 3 (Reserved / Manufacturer)
 */
export function decodeRawDtcBytes(byteAHex: string, byteBHex: string): string | null {
  const byteA = parseInt(byteAHex, 16);
  const byteB = parseInt(byteBHex, 16);

  if (isNaN(byteA) || isNaN(byteB)) return null;

  // 00 00 indicates empty slot in ELM327 buffer
  if (byteA === 0 && byteB === 0) return null;

  const typeBits = (byteA >> 6) & 0x03;
  let letter = 'P';
  if (typeBits === 1) letter = 'C';
  else if (typeBits === 2) letter = 'B';
  else if (typeBits === 3) letter = 'U';

  const digit2 = (byteA >> 4) & 0x03;
  const digit3 = (byteA & 0x0f).toString(16).toUpperCase();
  const digit45 = byteB.toString(16).padStart(2, '0').toUpperCase();

  return `${letter}${digit2}${digit3}${digit45}`;
}

/**
 * Looks up DTC metadata or creates a standardized fallback record.
 */
export function lookupDtc(code: string, isPending = false): ObdDtcCode {
  const clean = code.toUpperCase().trim();
  const known = DTC_DATABASE[clean];

  if (known) {
    return { ...known, isPending };
  }

  // Derive system from first letter
  const prefix = clean.charAt(0);
  let system: DtcSystem = 'POWERTRAIN';
  if (prefix === 'C') system = 'CHASSIS';
  else if (prefix === 'B') system = 'BODY';
  else if (prefix === 'U') system = 'NETWORK';

  return {
    code: clean,
    system,
    description: `Código de anomalía OBD-II (${clean}) registrado por la unidad de control`,
    severity: clean.startsWith('P03') || clean.startsWith('U') ? 'HIGH' : 'MEDIUM',
    possibleCauses: [
      'Sensor o componente fuera de rango de calibración oficial',
      'Intermitencia en el mazo de cables o conector',
      'Falla transitoria detectada durante el ciclo de conducción',
    ],
    recommendedChecks: [
      'Consultar manual de taller oficial para el procedimiento de comprobación guiada',
      'Inspeccionar conectores eléctricos y estado de masas',
      'Verificar freeze frame (cuadro congelado) para evaluar condiciones de falla',
    ],
    isPending,
  };
}
