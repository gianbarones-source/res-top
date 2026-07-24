/**
 * Parser de la matriz de ventas (formato MATRIZ_DD-MMTN.xls / TM.xls)
 *
 * Estructura esperada del archivo (fila 0 = headers, última fila = totales):
 *   col 0: nombre producto Sub 15cm
 *   col 1: cantidad vendida 15cm
 *   col 2: %
 *   col 3: nombre producto Footlong (30cm)
 *   col 4: cantidad vendida Footlong
 *   col 5: %
 *   col 6: total
 *   col 7: %
 *   col 8: relación 15/30
 *
 * Conversión a unidades de pan (equivalente 15cm):
 *   1 Sub 15cm    = 1 unidad
 *   1 Footlong    = 2 unidades (pan de 30cm entero, sin cortar)
 */

import * as XLSX from 'xlsx';

// Filas que no representan un producto real (o no tienen pan asociado)
const PRODUCTOS_IGNORAR = ['verifique', 'wow'];

export interface DetalleVenta {
  producto15: string;
  cantidad15: number;
  productoFootlong: string;
  cantidadFootlong: number;
}

export interface ResultadoParseoGrilla {
  total15: number;
  totalFootlong: number;
  deltaPan: number; // negativo: es consumo de stock
  detalle: DetalleVenta[];
}

export function parseGrillaVentas(fileBuffer: Buffer): ResultadoParseoGrilla {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  if (rows.length < 3) {
    throw new Error('El archivo no tiene el formato esperado (muy pocas filas)');
  }

  let total15 = 0;
  let totalFootlong = 0;
  const detalle: DetalleVenta[] = [];

  // Salteamos fila 0 (headers) y la última fila (totales, ya los recalculamos nosotros
  // para no depender de que el archivo los traiga bien sumados)
  for (let i = 1; i < rows.length - 1; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    const producto15 = String(row[0] ?? '').trim();
    const cantidad15 = Number(row[1]) || 0;
    const productoFootlong = String(row[3] ?? '').trim();
    const cantidadFootlong = Number(row[4]) || 0;

    const esIgnorable = PRODUCTOS_IGNORAR.some(
      (p) =>
        producto15.toLowerCase().includes(p) ||
        productoFootlong.toLowerCase().includes(p)
    );
    if (esIgnorable) continue;

    total15 += cantidad15;
    totalFootlong += cantidadFootlong;
    detalle.push({ producto15, cantidad15, productoFootlong, cantidadFootlong });
  }

  const deltaPan = -(total15 * 1 + totalFootlong * 2);

  return { total15, totalFootlong, deltaPan, detalle };
}

/**
 * Extrae fecha y turno del nombre de archivo, ej: "MATRIZ_23-07TN.xls"
 * Asume año actual. Devuelve null si no matchea el patrón.
 */
export function parseNombreArchivo(
  filename: string
): { fecha: string; turno: 'TM' | 'TN' } | null {
  const match = filename.match(/(\d{2})-(\d{2})\s*(TM|TN)/i);
  if (!match) return null;

  const [, dia, mes, turno] = match;
  const anio = new Date().getFullYear();
  const fecha = `${anio}-${mes}-${dia}`;

  return { fecha, turno: turno.toUpperCase() as 'TM' | 'TN' };
}

/**
 * Uso típico en un API route / server action de Next.js:
 *
 * const buffer = Buffer.from(await file.arrayBuffer());
 * const { deltaPan, total15, totalFootlong } = parseGrillaVentas(buffer);
 * const nombreArchivo = parseNombreArchivo(file.name);
 *
 * // IMPORTANTE: igual que en Caja, solo el turno TN trae el total de
 * // ventas del día completo (Linisco). Si el archivo es de turno TM,
 * // no insertar el movimiento para evitar doble conteo.
 * if (nombreArchivo?.turno !== 'TN') {
 *   // ignorar o avisar al usuario que suba el archivo de TN
 * } else {
 *   await supabase.from('pan_stock_movimientos').insert({
 *     restaurant_id: restaurantId,
 *     movement_type: 'venta',
 *     cantidad: deltaPan,
 *     fecha: nombreArchivo.fecha,
 *     fuente: file.name,
 *   });
 * }
 */
