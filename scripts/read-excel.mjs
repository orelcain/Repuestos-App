/**
 * Script para leer el Excel y generar los datos de repuestos para importar
 */

import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// Leer el archivo Excel
const workbook = XLSX.readFile('d:\\a\\repuestos baader 200 temp baja 2026\\Informe Baader 200 v2.xlsx');

// Leer la hoja INFORME 2 que tiene los datos completos
const sheet = workbook.Sheets['INFORME 2'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Cabecera:', data[0]);
console.log('Primera fila de datos:', data[1]);
console.log('Total filas:', data.length);

// Procesar los datos (saltando la cabecera)
const repuestos = [];
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;
  
  const codigoSAP = row[0] ? String(row[0]) : '';
  const descripcion = row[1] ? String(row[1]) : '';
  const codigoBaader = row[2] ? String(row[2]) : '';
  const cantidad = row[3] ? Number(row[3]) : 0;
  const valorUnitario = row[4] ? Number(row[4]) : 0;
  const total = row[5] ? Number(row[5]) : 0;
  const cantidadReal = row[6] ? Number(row[6]) : 0;
  const stockBodega = row[8] ? Number(row[8]) : 0;
  
  if (codigoSAP || codigoBaader) {
    repuestos.push({
      codigoSAP,
      codigoBaader,
      descripcion,
      cantidadSolicitada: cantidad,
      cantidadStockBodega: stockBodega,
      valorUnitario: Math.round(valorUnitario * 100) / 100,
      total: Math.round(total * 100) / 100
    });
  }
}

console.log(`\n=== Total repuestos procesados: ${repuestos.length} ===`);
console.log('\nPrimeros 5:');
repuestos.slice(0, 5).forEach(r => console.log(r));
console.log('\nÚltimos 5:');
repuestos.slice(-5).forEach(r => console.log(r));

// Generar el código JavaScript para el script de importación
const output = `// Datos de los ${repuestos.length} repuestos Baader 200 extraídos del Excel
export const repuestosData = ${JSON.stringify(repuestos, null, 2)};
`;

writeFileSync('d:\\a\\repuestos baader 200 temp baja 2026\\baader-app\\scripts\\repuestos-data.mjs', output);
console.log('\n✅ Archivo repuestos-data.mjs generado con', repuestos.length, 'repuestos');
