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
