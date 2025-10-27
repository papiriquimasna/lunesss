import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Obtiene el valor de color resuelto de una variable CSS de Tailwind.
 * ECharts no puede analizar 'hsl(var(--...))', por lo que necesitamos darle el valor de color real.
 * Esta función ahora convierte los valores HSL separados por espacios a un formato separado por comas
 * para una mayor compatibilidad con la API de Canvas.
 * @param variable El nombre de la variable CSS (ej. '--primary').
 * @returns Una cadena de color HSL válida (ej. 'hsl(142.1, 76.2%, 36.3%)').
 */
export const getResolvedColor = (variable: string): string => {
  if (typeof window === 'undefined') {
    return ''; // Devuelve una cadena vacía para entornos SSR
  }
  // Obtiene los valores HSL crudos, ej: "142.1 76.2% 36.3%"
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  // Convierte "142.1 76.2% 36.3%" a "142.1, 76.2%, 36.3%"
  const commaSeparatedValue = value.replace(/ /g, ', ');
  return `hsl(${commaSeparatedValue})`;
};

/**
 * Obtiene el valor de color resuelto con un canal alfa.
 * @param variable El nombre de la variable CSS (ej. '--primary').
 * @param alpha El valor de opacidad (de 0 a 1).
 * @returns Una cadena de color HSLA válida (ej. 'hsla(142.1, 76.2%, 36.3%, 0.2)').
 */
export const getResolvedColorWithAlpha = (variable: string, alpha: number): string => {
    if (typeof window === 'undefined') {
        return '';
    }
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    // Convierte "142.1 76.2% 36.3%" a "142.1, 76.2%, 36.3%"
    const commaSeparatedValue = value.replace(/ /g, ', ');
    return `hsla(${commaSeparatedValue}, ${alpha})`;
}
