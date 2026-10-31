import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un número con configuración regional es-AR de forma determinista,
 * garantizando coherencia absoluta entre el renderizado del servidor (SSR) y la hidratación en cliente.
 * Ejemplo: 38500 -> "38.500"
 */
export function formatNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('es-AR');
}

/**
 * Formatea un valor de kilometraje con configuración regional es-AR añadiendo "km".
 * Ejemplo: 38500 -> "38.500 km"
 */
export function formatMileage(km: number | string | undefined | null): string {
  return `${formatNumber(km)} km`;
}

