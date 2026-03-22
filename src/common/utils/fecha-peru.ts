const ZONA_PERU = 'America/Lima';

export function formatearFechaPe(fecha: Date): string {
  return fecha.toLocaleString('es-PE', {
    timeZone: ZONA_PERU,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function todayPeru(): Date {
  // Retorna medianoche de hoy en Lima, expresado como UTC
  // Ej: si en Lima son las 23:00 del 21/03, retorna 2026-03-21T05:00:00Z
  const str = new Date().toLocaleDateString('en-CA', { timeZone: ZONA_PERU }); // "2026-03-21"
  return new Date(`${str}T00:00:00-05:00`);
}

export function formatPeru(date: Date): string {
  return date.toLocaleString('es-PE', {
    timeZone: ZONA_PERU,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
