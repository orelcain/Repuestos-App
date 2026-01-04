import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlantAsset, Repuesto, getTagNombre, isTagAsignado } from '../types';
import { preloadImagesWithDimensions, ImageData } from './imageUtils';

// === EXPORT MOTORES / BOMBAS (ACTIVOS DE PLANTA) ===

export type PlantAssetsColumnKey =
  | 'tipo'
  | 'area'
  | 'subarea'
  | 'codigoSAP'
  | 'marca'
  | 'relacionReduccion'
  | 'marcadores';

export interface PlantAssetsExportOptions {
  filename?: string;
  columns: PlantAssetsColumnKey[];
  getMarkersLabel?: (asset: PlantAsset) => string;
}

const plantAssetsColumnHeader: Record<PlantAssetsColumnKey, string> = {
  tipo: 'Tipo',
  area: 'Área',
  subarea: 'Subárea',
  codigoSAP: 'SAP',
  marca: 'Marca',
  relacionReduccion: 'i',
  marcadores: 'Marcadores'
};

export async function exportPlantAssetsToExcel(assets: PlantAsset[], options: PlantAssetsExportOptions) {
  const { filename = 'motores_bombas', columns, getMarkersLabel } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baader 200 App';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Motores/Bombas');
  ws.columns = columns.map((key) => ({
    header: plantAssetsColumnHeader[key],
    key,
    width: key === 'marcadores' ? 45 : key === 'subarea' ? 26 : key === 'area' ? 22 : 16
  }));

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 18;

  assets.forEach((a, index) => {
    const rowObj: Record<string, unknown> = {};
    for (const key of columns) {
      switch (key) {
        case 'tipo':
          rowObj[key] = (a.tipo || '').toUpperCase();
          break;
        case 'marcadores':
          rowObj[key] = getMarkersLabel ? getMarkersLabel(a) : '';
          break;
        default:
          rowObj[key] = (a as any)[key] ?? '';
          break;
      }
    }

    const row = ws.addRow(rowObj);
    if (index % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
    }
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, assets.length + 1), column: Math.max(1, columns.length) }
  };

  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

export async function exportPlantAssetsToPDF(assets: PlantAsset[], options: PlantAssetsExportOptions) {
  const { filename = 'motores_bombas', columns, getMarkersLabel } = options;

  const doc = new jsPDF('l', 'mm', 'a4');
  const title = 'Motores / Bombas';
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 14, 20);

  const head = [columns.map((c) => plantAssetsColumnHeader[c])];
  const body = assets.map((a) => {
    return columns.map((key) => {
      switch (key) {
        case 'tipo':
          return (a.tipo || '').toUpperCase();
        case 'marcadores':
          return getMarkersLabel ? getMarkersLabel(a) : '';
        default:
          return String((a as any)[key] ?? '');
      }
    });
  });

  autoTable(doc, {
    head,
    body,
    startY: 26,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [243, 244, 246] }
  });

  doc.save(`${filename}.pdf`);
}

// Formatear número con decimales solo si los tiene
function formatNumber(num: number): string {
  if (Number.isInteger(num)) {
    return num.toLocaleString('es-CL');
  }
  return num.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper para obtener cantidad por contexto o desde tags
function getCantidadPorContexto(repuesto: Repuesto, contextTag: string | null, tipo: 'solicitud' | 'stock'): number {
  // Si hay contexto específico, buscar ese tag
  if (contextTag) {
    const tagEncontrado = repuesto.tags?.find(tag => {
      if (isTagAsignado(tag)) {
        return tag.nombre === contextTag && tag.tipo === tipo;
      }
      return false;
    });
    
    if (tagEncontrado && isTagAsignado(tagEncontrado)) {
      return tagEncontrado.cantidad;
    }
    return 0;
  }
  
  // Sin contexto: sumar todas las cantidades de tags de ese tipo
  let total = 0;
  repuesto.tags?.forEach(tag => {
    if (isTagAsignado(tag) && tag.tipo === tipo) {
      total += tag.cantidad || 0;
    }
  });
  
  return total;
}

// Helper para obtener total de todas las cantidades de un repuesto (de todos sus tags)
function getTotalCantidadesRepuesto(repuesto: Repuesto): { solicitud: number; stock: number } {
  let solicitud = 0;
  let stock = 0;
  
  repuesto.tags?.forEach(tag => {
    if (isTagAsignado(tag)) {
      if (tag.tipo === 'solicitud') {
        solicitud += tag.cantidad || 0;
      } else {
        stock += tag.cantidad || 0;
      }
    }
  });
  
  return { solicitud, stock };
}

// Colores para Excel
const COLORS = {
  primary: 'FF1E40AF',      // Azul primario
  primaryLight: 'FFDBEAFE', // Azul claro
  success: 'FF22C55E',      // Verde
  successLight: 'FFDCFCE7', // Verde claro
  danger: 'FFEF4444',       // Rojo
  dangerLight: 'FFFEE2E2',  // Rojo claro
  warning: 'FFF59E0B',      // Amarillo
  gray: 'FF6B7280',         // Gris
  grayLight: 'FFF3F4F6',    // Gris claro
  white: 'FFFFFFFF',
  black: 'FF000000'
};

// Opciones de exportación Excel
export interface ExcelExportOptions {
  formato: 'simple' | 'completo';
  incluirResumen?: boolean;
  incluirSinStock?: boolean;
  incluirPorTags?: boolean;
  incluirEstilos?: boolean;
  contextTag?: string | null;  // Tag de contexto para cantidades
  tipoContexto?: 'solicitud' | 'stock' | null; // Tipo del contexto para determinar columnas
}

// Exportación formato informe: Igual al "Informe Baader 200 v2.xlsx"
// Solo 6 columnas: CODIGO SAP, TEXTO BREVE, COD. BAADER, CANTIDAD, VALOR UN, TOTAL $
async function exportToExcelInforme(
  repuestos: Repuesto[], 
  filename: string, 
  contextTag: string | null,
  tipoContexto: 'solicitud' | 'stock' | null
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baader 200 App';
  workbook.created = new Date();

  // Determinar el tipo de cantidad a mostrar
  const esSolicitud = tipoContexto === 'solicitud' || !tipoContexto;
  const cantidadLabel = contextTag 
    ? (esSolicitud ? `CANTIDAD (${contextTag})` : `STOCK (${contextTag})`)
    : (esSolicitud ? 'CANTIDAD SOLICITADA' : 'STOCK BODEGA');
  
  const sheetName = contextTag 
    ? contextTag.substring(0, 31) // Excel limita a 31 caracteres
    : (esSolicitud ? 'Cantidad Solicitada' : 'Stock Bodega');

  const ws = workbook.addWorksheet(sheetName);

  // === COLUMNAS EXACTAS DEL INFORME ===
  ws.columns = [
    { header: 'CODIGO SAP', key: 'codigoSAP', width: 14 },
    { header: 'TEXTO BREVE', key: 'textoBreve', width: 50 },
    { header: 'COD. BAADER', key: 'codBaader', width: 16 },
    { header: cantidadLabel, key: 'cantidad', width: 18 },
    { header: 'VALOR UN', key: 'valorUn', width: 14 },
    { header: 'TOTAL $', key: 'total', width: 16 },
  ];

  // === ESTILO DEL HEADER ===
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;

  // === AGREGAR DATOS ===
  let totalGeneral = 0;
  let totalCantidad = 0;

  repuestos.forEach((r, index) => {
    // Obtener cantidad según tipo de contexto
    const cantidad = contextTag 
      ? getCantidadPorContexto(r, contextTag, esSolicitud ? 'solicitud' : 'stock')
      : (esSolicitud ? getTotalCantidadesRepuesto(r).solicitud : getTotalCantidadesRepuesto(r).stock);
    
    const total = r.valorUnitario * cantidad;
    totalGeneral += total;
    totalCantidad += cantidad;

    const row = ws.addRow({
      codigoSAP: r.codigoSAP,
      textoBreve: r.textoBreve,
      codBaader: r.codigoBaader,
      cantidad: cantidad,
      valorUn: r.valorUnitario,
      total: total
    });

    // Alternar colores de fila
    if (index % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    }

    // Formato de moneda
    row.getCell('valorUn').numFmt = '"$"#,##0.00';
    row.getCell('total').numFmt = '"$"#,##0.00';
    
    // Alineación
    row.getCell('codigoSAP').alignment = { horizontal: 'center' };
    row.getCell('codBaader').alignment = { horizontal: 'center' };
    row.getCell('cantidad').alignment = { horizontal: 'center' };
    row.getCell('valorUn').alignment = { horizontal: 'right' };
    row.getCell('total').alignment = { horizontal: 'right' };
  });

  // === FILA DE TOTALES ===
  const totalRow = ws.addRow({
    codigoSAP: '',
    textoBreve: 'TOTALES',
    codBaader: '',
    cantidad: totalCantidad,
    valorUn: '',
    total: totalGeneral
  });
  totalRow.font = { bold: true };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  totalRow.getCell('total').numFmt = '"$"#,##0.00';
  totalRow.getCell('textoBreve').alignment = { horizontal: 'right' };
  totalRow.getCell('cantidad').alignment = { horizontal: 'center' };
  totalRow.getCell('total').alignment = { horizontal: 'right' };

  // === BORDES ===
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
  });

  // === FILTROS AUTOMÁTICOS ===
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: repuestos.length + 1, column: 6 }
  };

  // === INFO DEL CONTEXTO EN NUEVA HOJA ===
  const wsInfo = workbook.addWorksheet('Info');
  wsInfo.columns = [
    { header: 'Campo', key: 'campo', width: 25 },
    { header: 'Valor', key: 'valor', width: 40 },
  ];
  wsInfo.addRow({ campo: 'Contexto/Evento', valor: contextTag || 'Todos' });
  wsInfo.addRow({ campo: 'Tipo', valor: esSolicitud ? 'Solicitud' : 'Stock Bodega' });
  wsInfo.addRow({ campo: 'Total Repuestos', valor: repuestos.length });
  wsInfo.addRow({ campo: 'Total Cantidad', valor: totalCantidad });
  wsInfo.addRow({ campo: 'Total USD', valor: totalGeneral });
  wsInfo.addRow({ campo: 'Fecha Exportación', valor: new Date().toLocaleDateString('es-CL') });
  wsInfo.getRow(1).font = { bold: true };
  wsInfo.getCell('B5').numFmt = '"$"#,##0.00';

  // Guardar archivo
  const tipoSufijo = esSolicitud ? 'solicitud' : 'stock';
  const finalFilename = contextTag 
    ? `${filename}_${contextTag.replace(/[^a-zA-Z0-9]/g, '_')}`
    : `${filename}_${tipoSufijo}`;
    
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${finalFilename}.xlsx`);
}

// Exportación simple: Solo datos básicos, sin estilos ni hojas adicionales (legacy)
async function exportToExcelSimple(repuestos: Repuesto[], filename: string, contextTag?: string | null) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baader 200 App';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Repuestos');

  // Columnas básicas (solo USD)
  const columns = [
    { header: 'Código SAP', key: 'codigoSAP', width: 14 },
    { header: 'Número Parte Manual', key: 'codigoBaader', width: 20 },
    { header: 'Descripción SAP', key: 'descripcion', width: 45 },
    { header: contextTag ? `Cant. Solicitada (${contextTag})` : 'Cantidad Solicitada', key: 'cantidadSolicitada', width: 20 },
    { header: 'Total Solicitado (USD)', key: 'totalSolicitadoUSD', width: 18 },
    { header: contextTag ? `Stock (${contextTag})` : 'Stock en Bodega', key: 'stockBodega', width: 18 },
    { header: 'Total Stock (USD)', key: 'totalStockUSD', width: 16 },
    { header: 'Valor Unitario (USD)', key: 'valorUnitario', width: 16 },
    { header: 'Total General (USD)', key: 'total', width: 16 },
    { header: 'Tags', key: 'tags', width: 25 },
  ];

  ws.columns = columns;

  // Agregar datos sin formato
  repuestos.forEach((r) => {
    const cantidades = getTotalCantidadesRepuesto(r);
    const cantSol = contextTag ? getCantidadPorContexto(r, contextTag, 'solicitud') : cantidades.solicitud;
    const cantStock = contextTag ? getCantidadPorContexto(r, contextTag, 'stock') : cantidades.stock;
    const totalSolUSD = r.valorUnitario * cantSol;
    const totalStockUSD = r.valorUnitario * cantStock;
    
    const rowData: Record<string, unknown> = {
      codigoSAP: r.codigoSAP,
      codigoBaader: r.codigoBaader,
      descripcion: r.textoBreve,
      cantidadSolicitada: cantSol,
      totalSolicitadoUSD: totalSolUSD,
      stockBodega: cantStock,
      totalStockUSD: totalStockUSD,
      valorUnitario: r.valorUnitario,
      total: totalSolUSD + totalStockUSD,
      tags: r.tags?.map(t => getTagNombre(t)).join(', ') || ''
    };

    const row = ws.addRow(rowData);
    // Solo formato de moneda básico
    row.getCell('valorUnitario').numFmt = '"$"#,##0.00';
    row.getCell('totalSolicitadoUSD').numFmt = '"$"#,##0.00';
    row.getCell('totalStockUSD').numFmt = '"$"#,##0.00';
    row.getCell('total').numFmt = '"$"#,##0.00';
  });

  // Guardar archivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

// Exportar a Excel con ExcelJS
export async function exportToExcel(
  repuestos: Repuesto[], 
  options: ExcelExportOptions = { formato: 'completo' },
  filename: string = 'repuestos_baader_200'
) {
  // Si es formato simple, usar el nuevo formato informe (6 columnas)
  if (options.formato === 'simple') {
    return exportToExcelInforme(repuestos, filename, options.contextTag || null, options.tipoContexto || null);
  }

  const {
    incluirResumen = true,
    incluirSinStock = true,
    incluirPorTags = true,
    incluirEstilos = true,
    contextTag = null
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baader 200 App';
  workbook.created = new Date();

  // === HOJA 1: DETALLE DE REPUESTOS ===
  const wsDetalle = workbook.addWorksheet('Detalle Repuestos', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }] // Congelar primera fila
  });

  // Definir columnas (solo USD) - con contexto si aplica
  const detalleColumns: { header: string; key: string; width: number }[] = [
    { header: 'Código SAP', key: 'codigoSAP', width: 14 },
    { header: 'Número Parte Manual', key: 'codigoBaader', width: 20 },
    { header: 'Descripción SAP', key: 'descripcion', width: 45 },
    { header: contextTag ? `Cant. Solicitada (${contextTag})` : 'Cantidad Solicitada', key: 'cantidadSolicitada', width: 22 },
    { header: 'Total Solicitado (USD)', key: 'totalSolicitadoUSD', width: 18 },
    { header: contextTag ? `Stock (${contextTag})` : 'Stock en Bodega', key: 'stockBodega', width: 20 },
    { header: 'Total Stock (USD)', key: 'totalStockUSD', width: 16 },
    { header: 'Valor Unitario (USD)', key: 'valorUnitario', width: 16 },
    { header: 'Total General (USD)', key: 'total', width: 16 },
  ];

  detalleColumns.push(
    { header: 'Tags', key: 'tags', width: 25 },
    { header: 'Últ. Act. Inventario', key: 'ultimaAct', width: 16 },
    { header: 'Img Manual', key: 'imgManual', width: 10 },
    { header: 'Fotos Reales', key: 'fotosReales', width: 11 }
  );

  wsDetalle.columns = detalleColumns;
  const numColumns = detalleColumns.length;

  // Estilo del header (condicional)
  if (incluirEstilos) {
    const headerRow = wsDetalle.getRow(1);
    headerRow.font = { bold: true, color: { argb: COLORS.white } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;
  }

  // Agregar datos
  repuestos.forEach((r, index) => {
    const cantidades = getTotalCantidadesRepuesto(r);
    const cantSol = contextTag ? getCantidadPorContexto(r, contextTag, 'solicitud') : cantidades.solicitud;
    const cantStock = contextTag ? getCantidadPorContexto(r, contextTag, 'stock') : cantidades.stock;
    const totalSolUSD = r.valorUnitario * cantSol;
    const totalStockUSD = r.valorUnitario * cantStock;
    
    const rowData: Record<string, unknown> = {
      codigoSAP: r.codigoSAP,
      codigoBaader: r.codigoBaader,
      descripcion: r.textoBreve,
      cantidadSolicitada: cantSol,
      totalSolicitadoUSD: totalSolUSD,
      stockBodega: cantStock,
      totalStockUSD: totalStockUSD,
      valorUnitario: r.valorUnitario,
      total: totalSolUSD + totalStockUSD,
      tags: r.tags?.length > 0 ? r.tags.map(t => getTagNombre(t)).join(', ') : null,
      ultimaAct: r.fechaUltimaActualizacionInventario 
        ? new Date(r.fechaUltimaActualizacionInventario).toLocaleDateString('es-CL')
        : null,
      imgManual: r.imagenesManual.length,
      fotosReales: r.fotosReales.length
    };

    const row = wsDetalle.addRow(rowData);

    if (incluirEstilos) {
      // Alternar colores de fila
      if (index % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
      }

      // Formato condicional: Stock en rojo si es 0
      const stockCell = row.getCell('stockBodega');
      if (cantStock === 0) {
        stockCell.font = { bold: true, color: { argb: COLORS.danger } };
        stockCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dangerLight } };
      } else {
        stockCell.font = { bold: true, color: { argb: COLORS.success } };
      }
    }

    // Formato de moneda (siempre)
    row.getCell('totalSolicitadoUSD').numFmt = '"$"#,##0.00';
    row.getCell('totalStockUSD').numFmt = '"$"#,##0.00';
    row.getCell('valorUnitario').numFmt = '"$"#,##0.00';
    row.getCell('total').numFmt = '"$"#,##0.00';
  });

  // Fila de totales
  const totalRowData: Record<string, unknown> = {
    codigoSAP: null,
    codigoBaader: null,
    descripcion: 'TOTALES',
    cantidadSolicitada: { formula: `SUM(D2:D${repuestos.length + 1})` },
    totalSolicitadoUSD: { formula: `SUM(E2:E${repuestos.length + 1})` },
    stockBodega: { formula: `SUM(F2:F${repuestos.length + 1})` },
    totalStockUSD: { formula: `SUM(G2:G${repuestos.length + 1})` },
    valorUnitario: null,
    total: { formula: `SUM(I2:I${repuestos.length + 1})` },
    tags: null,
    ultimaAct: null,
    imgManual: { formula: `SUM(L2:L${repuestos.length + 1})` },
    fotosReales: { formula: `SUM(M2:M${repuestos.length + 1})` }
  };

  const totalRow = wsDetalle.addRow(totalRowData);
  if (incluirEstilos) {
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
  }
  totalRow.getCell('totalSolicitadoUSD').numFmt = '"$"#,##0.00';
  totalRow.getCell('totalStockUSD').numFmt = '"$"#,##0.00';
  totalRow.getCell('total').numFmt = '"$"#,##0.00';

  // Agregar filtros automáticos
  wsDetalle.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: repuestos.length + 1, column: numColumns }
  };

  // Bordes a todas las celdas (condicional)
  if (incluirEstilos) {
    wsDetalle.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      });
    });
  }

  // === HOJA 2: DASHBOARD (Visual) ===
  if (incluirResumen) {
    const wsDash = workbook.addWorksheet('📊 Dashboard');
    
    // Calcular estadísticas usando tags (no valores legacy)
    const totalRepuestos = repuestos.length;
    const cantSolicitadaTotal = repuestos.reduce((s, r) => {
      const cant = contextTag 
        ? getCantidadPorContexto(r, contextTag, 'solicitud') 
        : getTotalCantidadesRepuesto(r).solicitud;
      return s + cant;
    }, 0);
    const stockBodegaTotal = repuestos.reduce((s, r) => {
      const cant = contextTag 
        ? getCantidadPorContexto(r, contextTag, 'stock') 
        : getTotalCantidadesRepuesto(r).stock;
      return s + cant;
    }, 0);
    const valorTotal = repuestos.reduce((s, r) => {
      const cantidades = getTotalCantidadesRepuesto(r);
      const cantSol = contextTag ? getCantidadPorContexto(r, contextTag, 'solicitud') : cantidades.solicitud;
      const cantStock = contextTag ? getCantidadPorContexto(r, contextTag, 'stock') : cantidades.stock;
      return s + (r.valorUnitario * cantSol) + (r.valorUnitario * cantStock);
    }, 0);
    const conStock = repuestos.filter(r => {
      const cant = contextTag 
        ? getCantidadPorContexto(r, contextTag, 'stock') 
        : getTotalCantidadesRepuesto(r).stock;
      return cant > 0;
    }).length;
    const sinStock = repuestos.filter(r => {
      const cant = contextTag 
        ? getCantidadPorContexto(r, contextTag, 'stock') 
        : getTotalCantidadesRepuesto(r).stock;
      return cant === 0;
    }).length;
    const conImagenManual = repuestos.filter(r => r.imagenesManual.length > 0).length;
    const conFotosReales = repuestos.filter(r => r.fotosReales.length > 0).length;
    const valorPromedio = totalRepuestos > 0 ? valorTotal / totalRepuestos : 0;
    const stockPromedio = totalRepuestos > 0 ? stockBodegaTotal / totalRepuestos : 0;
    const pctConStock = totalRepuestos > 0 ? (conStock / totalRepuestos) * 100 : 0;
    const pctSinStock = totalRepuestos > 0 ? (sinStock / totalRepuestos) * 100 : 0;
    
    // Valores por tag
    const allTags = new Set<string>();
    repuestos.forEach(r => r.tags?.forEach(t => allTags.add(getTagNombre(t))));
    
    // Anchos de columna
    wsDash.getColumn(1).width = 3;
    wsDash.getColumn(2).width = 22;
    wsDash.getColumn(3).width = 18;
    wsDash.getColumn(4).width = 3;
    wsDash.getColumn(5).width = 22;
    wsDash.getColumn(6).width = 18;
    wsDash.getColumn(7).width = 3;
    wsDash.getColumn(8).width = 22;
    wsDash.getColumn(9).width = 18;
    
    // === TÍTULO PRINCIPAL ===
    wsDash.mergeCells('B2:I2');
    const titleCell = wsDash.getCell('B2');
    titleCell.value = contextTag 
      ? `📊 DASHBOARD - ${contextTag}`
      : '📊 DASHBOARD - Repuestos Baader 200';
    titleCell.font = { bold: true, size: 20, color: { argb: COLORS.primary } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    wsDash.getRow(2).height = 35;
    
    wsDash.mergeCells('B3:I3');
    const dateCell = wsDash.getCell('B3');
    dateCell.value = `Generado: ${new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    dateCell.font = { size: 11, color: { argb: COLORS.gray } };
    dateCell.alignment = { horizontal: 'center' };
    
    // === TARJETAS DE KPIs (Fila 5-8) ===
    const createKPICard = (col: string, label: string, value: number | string, format: 'number' | 'currency' | 'percent' | 'text', color: string) => {
      // Label
      const labelCell = wsDash.getCell(`${col}5`);
      labelCell.value = label;
      labelCell.font = { size: 10, color: { argb: COLORS.gray } };
      labelCell.alignment = { horizontal: 'center' };
      
      // Value
      const valueCell = wsDash.getCell(`${col}6`);
      if (format === 'currency') {
        valueCell.value = value as number;
        valueCell.numFmt = '"USD "$#,##0.00';
      } else if (format === 'percent') {
        valueCell.value = (value as number) / 100;
        valueCell.numFmt = '0.0%';
      } else if (format === 'number') {
        valueCell.value = value as number;
        valueCell.numFmt = '#,##0';
      } else {
        valueCell.value = value;
      }
      valueCell.font = { bold: true, size: 24, color: { argb: color } };
      valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
      wsDash.getRow(6).height = 40;
    };
    
    // Tarjeta 1: Total Repuestos
    wsDash.mergeCells('B5:C5');
    wsDash.mergeCells('B6:C6');
    createKPICard('B', '📦 TOTAL REPUESTOS', totalRepuestos, 'number', COLORS.primary);
    
    // Tarjeta 2: Valor Total
    wsDash.mergeCells('E5:F5');
    wsDash.mergeCells('E6:F6');
    createKPICard('E', '💰 VALOR TOTAL', valorTotal, 'currency', COLORS.success);
    
    // Tarjeta 3: Sin Stock
    wsDash.mergeCells('H5:I5');
    wsDash.mergeCells('H6:I6');
    createKPICard('H', '⚠️ SIN STOCK', sinStock, 'number', COLORS.danger);
    
    // === SECCIÓN DE MÉTRICAS DETALLADAS (Fila 9-16) ===
    wsDash.mergeCells('B9:C9');
    const metricsTitle = wsDash.getCell('B9');
    metricsTitle.value = '📈 MÉTRICAS PRINCIPALES';
    metricsTitle.font = { bold: true, size: 12, color: { argb: COLORS.primary } };
    metricsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
    
    const metrics = [
      ['Cant. Solicitada Total', cantSolicitadaTotal, '#,##0'],
      ['Stock Bodega Total', stockBodegaTotal, '#,##0'],
      ['Valor Promedio/Item', valorPromedio, '"$"#,##0.00'],
      ['Stock Promedio/Item', stockPromedio, '0.0'],
      ['% Con Stock', pctConStock / 100, '0.0%'],
      ['% Sin Stock', pctSinStock / 100, '0.0%']
    ];
    
    metrics.forEach((metric, i) => {
      const row = 10 + i;
      wsDash.getCell(`B${row}`).value = metric[0] as string;
      wsDash.getCell(`B${row}`).font = { size: 10 };
      
      const valCell = wsDash.getCell(`C${row}`);
      valCell.value = metric[1] as number;
      valCell.numFmt = metric[2] as string;
      valCell.font = { bold: true };
      valCell.alignment = { horizontal: 'right' };
      
      if (i % 2 === 0) {
        wsDash.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
      }
    });
    
    // === SECCIÓN DE DOCUMENTACIÓN (Fila 9-16, columnas E-F) ===
    wsDash.mergeCells('E9:F9');
    const docsTitle = wsDash.getCell('E9');
    docsTitle.value = '📸 DOCUMENTACIÓN';
    docsTitle.font = { bold: true, size: 12, color: { argb: COLORS.primary } };
    docsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
    
    const docStats = [
      ['Con Imagen Manual', conImagenManual, totalRepuestos],
      ['Sin Imagen Manual', totalRepuestos - conImagenManual, totalRepuestos],
      ['Con Fotos Reales', conFotosReales, totalRepuestos],
      ['Sin Fotos Reales', totalRepuestos - conFotosReales, totalRepuestos],
      ['Total Imágenes Manual', repuestos.reduce((s, r) => s + r.imagenesManual.length, 0), null],
      ['Total Fotos Reales', repuestos.reduce((s, r) => s + r.fotosReales.length, 0), null]
    ];
    
    docStats.forEach((stat, i) => {
      const row = 10 + i;
      wsDash.getCell(`E${row}`).value = stat[0] as string;
      wsDash.getCell(`E${row}`).font = { size: 10 };
      
      const valCell = wsDash.getCell(`F${row}`);
      if (stat[2] !== null) {
        valCell.value = stat[1] as number;
        valCell.numFmt = '#,##0';
        // Agregar porcentaje en otra celda visual
      } else {
        valCell.value = stat[1] as number;
        valCell.numFmt = '#,##0';
      }
      valCell.font = { bold: true };
      valCell.alignment = { horizontal: 'right' };
      
      if (i % 2 === 0) {
        wsDash.getCell(`E${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
      }
    });
    
    // === SECCIÓN DE TAGS (Fila 9-16, columnas H-I) ===
    wsDash.mergeCells('H9:I9');
    const tagsTitle = wsDash.getCell('H9');
    tagsTitle.value = '🏷️ DISTRIBUCIÓN POR TAGS';
    tagsTitle.font = { bold: true, size: 12, color: { argb: COLORS.primary } };
    tagsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
    
    const tagStats = Array.from(allTags).slice(0, 6).map(tag => {
      const count = repuestos.filter(r => r.tags?.includes(tag)).length;
      return [tag, count];
    });
    
    tagStats.forEach((stat, i) => {
      const row = 10 + i;
      wsDash.getCell(`H${row}`).value = stat[0] as string;
      wsDash.getCell(`H${row}`).font = { size: 10 };
      
      const valCell = wsDash.getCell(`I${row}`);
      valCell.value = stat[1] as number;
      valCell.numFmt = '#,##0';
      valCell.font = { bold: true };
      valCell.alignment = { horizontal: 'right' };
      
      if (i % 2 === 0) {
        wsDash.getCell(`H${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
      }
    });
    
    // === BARRA DE PROGRESO VISUAL (Stock) ===
    wsDash.mergeCells('B18:I18');
    const progressTitle = wsDash.getCell('B18');
    progressTitle.value = '📊 COBERTURA DE STOCK';
    progressTitle.font = { bold: true, size: 12, color: { argb: COLORS.primary } };
    
    // Crear barra visual con caracteres
    const barLength = 50;
    const filledLength = Math.round((pctConStock / 100) * barLength);
    const emptyLength = barLength - filledLength;
    const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
    
    wsDash.mergeCells('B19:I19');
    const barCell = wsDash.getCell('B19');
    barCell.value = progressBar;
    barCell.font = { size: 14, color: { argb: pctConStock >= 50 ? COLORS.success : COLORS.danger } };
    barCell.alignment = { horizontal: 'center' };
    
    wsDash.mergeCells('B20:I20');
    const barLabel = wsDash.getCell('B20');
    barLabel.value = `${conStock} con stock (${pctConStock.toFixed(1)}%) | ${sinStock} sin stock (${pctSinStock.toFixed(1)}%)`;
    barLabel.font = { size: 10, color: { argb: COLORS.gray } };
    barLabel.alignment = { horizontal: 'center' };
    
    // === TOP 5 MÁS COSTOSOS ===
    wsDash.mergeCells('B22:F22');
    const top5Title = wsDash.getCell('B22');
    top5Title.value = '💎 TOP 5 REPUESTOS MÁS COSTOSOS';
    top5Title.font = { bold: true, size: 12, color: { argb: COLORS.primary } };
    top5Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
    
    const top5 = [...repuestos].sort((a, b) => b.total - a.total).slice(0, 5);
    
    // Headers
    ['#', 'Código', 'Descripción', 'Cant.', 'Total USD'].forEach((h, i) => {
      const cols = ['B', 'C', 'D', 'E', 'F'];
      const cell = wsDash.getCell(`${cols[i]}23`);
      cell.value = h;
      cell.font = { bold: true, size: 9, color: { argb: COLORS.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray } };
      cell.alignment = { horizontal: 'center' };
    });
    
    top5.forEach((r, i) => {
      const row = 24 + i;
      const top5Cantidades = getTotalCantidadesRepuesto(r);
      wsDash.getCell(`B${row}`).value = i + 1;
      wsDash.getCell(`C${row}`).value = r.codigoSAP || r.codigoBaader;
      wsDash.getCell(`D${row}`).value = r.textoBreve.substring(0, 30) + (r.textoBreve.length > 30 ? '...' : '');
      wsDash.getCell(`E${row}`).value = top5Cantidades.solicitud + top5Cantidades.stock;
      
      const totalCell = wsDash.getCell(`F${row}`);
      totalCell.value = r.total;
      totalCell.numFmt = '"$"#,##0.00';
      totalCell.font = { bold: true, color: { argb: COLORS.success } };
      
      if (i % 2 === 0) {
        ['B', 'C', 'D', 'E', 'F'].forEach(col => {
          wsDash.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
        });
      }
    });
    
    // === RESUMEN RÁPIDO ===
    wsDash.mergeCells('H22:I22');
    const quickTitle = wsDash.getCell('H22');
    quickTitle.value = '⚡ RESUMEN RÁPIDO';
    quickTitle.font = { bold: true, size: 12, color: { argb: COLORS.primary } };
    quickTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primaryLight } };
    
    const quickStats = [
      ['Repuestos Totales', totalRepuestos],
      ['Valor Total', valorTotal],
      ['Urgentes (sin stock)', sinStock],
      ['Con documentación', conImagenManual + conFotosReales],
      ['Tags utilizados', allTags.size]
    ];
    
    ['Concepto', 'Valor'].forEach((h, i) => {
      const cols = ['H', 'I'];
      const cell = wsDash.getCell(`${cols[i]}23`);
      cell.value = h;
      cell.font = { bold: true, size: 9, color: { argb: COLORS.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray } };
      cell.alignment = { horizontal: 'center' };
    });
    
    quickStats.forEach((stat, i) => {
      const row = 24 + i;
      wsDash.getCell(`H${row}`).value = stat[0] as string;
      wsDash.getCell(`H${row}`).font = { size: 10 };
      
      const valCell = wsDash.getCell(`I${row}`);
      valCell.value = stat[1] as number;
      if (i === 1) {
        valCell.numFmt = '"$"#,##0.00';
      } else {
        valCell.numFmt = '#,##0';
      }
      valCell.font = { bold: true };
      valCell.alignment = { horizontal: 'right' };
      
      if (i % 2 === 0) {
        wsDash.getCell(`H${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
      }
    });
    
    // Bordes para las secciones
    if (incluirEstilos) {
      // Aplicar bordes a las secciones de datos
      for (let row = 9; row <= 15; row++) {
        ['B', 'C', 'E', 'F', 'H', 'I'].forEach(col => {
          const cell = wsDash.getCell(`${col}${row}`);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
        });
      }
    }
  }

  // === HOJA 3: SIN STOCK ===
  if (incluirSinStock) {
    // Filtrar repuestos sin stock en tags
    const sinStock = repuestos.filter(r => {
      const cantStock = contextTag 
        ? getCantidadPorContexto(r, contextTag, 'stock')
        : getTotalCantidadesRepuesto(r).stock;
      return cantStock === 0;
    });
    if (sinStock.length > 0) {
      const wsSinStock = workbook.addWorksheet('Sin Stock', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
      });

      wsSinStock.columns = [
      { header: 'Código SAP', key: 'codigoSAP', width: 14 },
      { header: 'Número Parte Manual', key: 'codigoBaader', width: 20 },
      { header: 'Descripción SAP', key: 'descripcion', width: 45 },
      { header: contextTag ? `Cant. Solicitada (${contextTag})` : 'Cantidad Solicitada', key: 'cantidadSolicitada', width: 22 },
      { header: 'Valor Unitario (USD)', key: 'valorUnitario', width: 16 },
      { header: 'Total General (USD)', key: 'total', width: 16 },
      { header: 'Tags', key: 'tags', width: 25 }
    ];

    if (incluirEstilos) {
      const headerSinStock = wsSinStock.getRow(1);
      headerSinStock.font = { bold: true, color: { argb: COLORS.white } };
      headerSinStock.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.danger } };
      headerSinStock.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    sinStock.forEach((r, index) => {
      const cantidades = getTotalCantidadesRepuesto(r);
      const cantSol = contextTag ? getCantidadPorContexto(r, contextTag, 'solicitud') : cantidades.solicitud;
      const cantStockVal = contextTag ? getCantidadPorContexto(r, contextTag, 'stock') : cantidades.stock;
      const totalVal = (r.valorUnitario * cantSol) + (r.valorUnitario * cantStockVal);
      
      const row = wsSinStock.addRow({
        codigoSAP: r.codigoSAP,
        codigoBaader: r.codigoBaader,
        descripcion: r.textoBreve,
        cantidadSolicitada: cantSol,
        valorUnitario: r.valorUnitario,
        total: totalVal,
        tags: r.tags?.length > 0 ? r.tags.map(t => getTagNombre(t)).join(', ') : null
      });
      row.getCell('valorUnitario').numFmt = '"$"#,##0.00';
      row.getCell('total').numFmt = '"$"#,##0.00';
      if (incluirEstilos && index % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dangerLight } };
      }
    });

    // Total
    const totalSinStockVal = sinStock.reduce((s, r) => {
      const cantidades = getTotalCantidadesRepuesto(r);
      const cantSol = contextTag ? getCantidadPorContexto(r, contextTag, 'solicitud') : cantidades.solicitud;
      const cantStock = contextTag ? getCantidadPorContexto(r, contextTag, 'stock') : cantidades.stock;
      return s + (r.valorUnitario * cantSol) + (r.valorUnitario * cantStock);
    }, 0);
    const totalSinStockCant = sinStock.reduce((s, r) => {
      const cantSol = contextTag 
        ? getCantidadPorContexto(r, contextTag, 'solicitud') 
        : getTotalCantidadesRepuesto(r).solicitud;
      return s + cantSol;
    }, 0);
    
    const totalSinStockRow = wsSinStock.addRow({
      codigoSAP: null,
      codigoBaader: null,
      descripcion: `TOTAL (${sinStock.length} repuestos)`,
      cantidadSolicitada: totalSinStockCant,
      valorUnitario: null,
      total: totalSinStockVal,
      tags: null
    });
    if (incluirEstilos) {
      totalSinStockRow.font = { bold: true };
      totalSinStockRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dangerLight } };
    }
    totalSinStockRow.getCell('total').numFmt = '"$"#,##0.00';
    }
  }

  // === HOJA 4: POR TAGS ===
  if (incluirPorTags) {
    const allTags = new Set<string>();
    repuestos.forEach(r => r.tags?.forEach(t => allTags.add(getTagNombre(t))));
    
    if (allTags.size > 0) {
      const wsTags = workbook.addWorksheet('Por Tags');
      
      wsTags.columns = [
        { header: 'Tag', key: 'tag', width: 25 },
        { header: 'Cantidad Repuestos', key: 'cantidad', width: 18 },
        { header: 'Cant. Solicitada', key: 'cantSolicitada', width: 15 },
        { header: 'Stock Total', key: 'stockTotal', width: 12 },
        { header: 'Valor Total (USD)', key: 'valorTotal', width: 16 }
      ];

      if (incluirEstilos) {
        const headerTags = wsTags.getRow(1);
        headerTags.font = { bold: true, color: { argb: COLORS.white } };
        headerTags.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
        headerTags.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      Array.from(allTags).sort().forEach((tag, index) => {
        const tagged = repuestos.filter(r => r.tags?.some(t => getTagNombre(t) === tag));
        
        // Calcular totales para este tag
        let cantSolicitadaTag = 0;
        let stockTotalTag = 0;
        let valorTotalTag = 0;
        
        tagged.forEach(r => {
          const cantSol = getCantidadPorContexto(r, tag, 'solicitud');
          const cantStock = getCantidadPorContexto(r, tag, 'stock');
          cantSolicitadaTag += cantSol;
          stockTotalTag += cantStock;
          valorTotalTag += (r.valorUnitario * cantSol) + (r.valorUnitario * cantStock);
        });
        
        const row = wsTags.addRow({
          tag: tag,
          cantidad: tagged.length,
          cantSolicitada: cantSolicitadaTag,
          stockTotal: stockTotalTag,
          valorTotal: valorTotalTag
        });
        row.getCell('valorTotal').numFmt = '"$"#,##0.00';
        if (incluirEstilos && index % 2 === 1) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grayLight } };
        }
      });

      wsTags.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: allTags.size + 1, column: 5 }
      };
    }
  }

  // Guardar archivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

// Opciones de exportación PDF
export interface PDFExportOptions {
  includeCharts?: boolean;
  filename?: string;
  contextTag?: string | null;  // Tag de contexto para cantidades
}

// Exportar a PDF con imágenes
export async function exportToPDF(
  repuestos: Repuesto[], 
  options: PDFExportOptions = {},
  onProgress?: (progress: number, message: string) => void
) {
  const { includeCharts = true, filename = 'repuestos_baader_200', contextTag = null } = options;
  
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - 2 * margin;

  // Precargar imágenes con dimensiones
  onProgress?.(5, 'Precargando imágenes...');
  const imageMap = await preloadImagesWithDimensions(repuestos);
  console.log('Imágenes cargadas:', imageMap.size);
  onProgress?.(15, 'Generando resumen...');

  // === PÁGINA 1: RESUMEN AL INICIO ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(contextTag ? `Repuestos Baader 200 - ${contextTag}` : 'Repuestos Baader 200', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, pageWidth / 2, 28, { align: 'center' });

  // Calcular estadísticas usando tags (no valores legacy)
  const totalCantSolicitada = repuestos.reduce((s, r) => {
    const cant = contextTag 
      ? getCantidadPorContexto(r, contextTag, 'solicitud') 
      : getTotalCantidadesRepuesto(r).solicitud;
    return s + cant;
  }, 0);
  const totalStockBodega = repuestos.reduce((s, r) => {
    const cant = contextTag 
      ? getCantidadPorContexto(r, contextTag, 'stock') 
      : getTotalCantidadesRepuesto(r).stock;
    return s + cant;
  }, 0);
  const totalValor = repuestos.reduce((s, r) => {
    const cantidades = getTotalCantidadesRepuesto(r);
    const cantSol = contextTag ? getCantidadPorContexto(r, contextTag, 'solicitud') : cantidades.solicitud;
    const cantStock = contextTag ? getCantidadPorContexto(r, contextTag, 'stock') : cantidades.stock;
    return s + (r.valorUnitario * cantSol) + (r.valorUnitario * cantStock);
  }, 0);
  const conImagenManual = repuestos.filter(r => r.imagenesManual.length > 0).length;
  const conFotoReal = repuestos.filter(r => r.fotosReales.length > 0).length;
  const conStock = repuestos.filter(r => {
    const cant = contextTag 
      ? getCantidadPorContexto(r, contextTag, 'stock') 
      : getTotalCantidadesRepuesto(r).stock;
    return cant > 0;
  }).length;
  const sinStock = repuestos.length - conStock;

  // Variable para controlar posición de la tabla
  let tableStartY = 38;

  if (includeCharts) {
    // === SECCIÓN DE GRÁFICOS ===
    const barChartX = margin + 5;
    const barChartY = 38;
    const barWidth = 35;
    const maxBarHeight = 40;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Cantidad vs Stock', barChartX + barWidth, barChartY - 3, { align: 'center' });
  
  const maxQty = Math.max(totalCantSolicitada, totalStockBodega, 1);
  const bar1Height = (totalCantSolicitada / maxQty) * maxBarHeight;
  const bar2Height = (totalStockBodega / maxQty) * maxBarHeight;
  
  // Barra Cantidad Solicitada
  doc.setFillColor(59, 130, 246); // Azul
  doc.roundedRect(barChartX, barChartY + maxBarHeight - bar1Height, 15, bar1Height, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setTextColor(59, 130, 246);
  doc.text(totalCantSolicitada.toString(), barChartX + 7.5, barChartY + maxBarHeight - bar1Height - 2, { align: 'center' });
  
  // Barra Stock Bodega
  doc.setFillColor(34, 197, 94); // Verde
  doc.roundedRect(barChartX + 20, barChartY + maxBarHeight - bar2Height, 15, bar2Height, 1, 1, 'F');
  doc.setTextColor(34, 197, 94);
  doc.text(totalStockBodega.toString(), barChartX + 27.5, barChartY + maxBarHeight - bar2Height - 2, { align: 'center' });
  
  // Leyenda
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text('Solicitada', barChartX + 7.5, barChartY + maxBarHeight + 5, { align: 'center' });
  doc.text('Stock', barChartX + 27.5, barChartY + maxBarHeight + 5, { align: 'center' });

  // --- Gráfico circular: Imágenes ---
  const pieX = pageWidth / 2;
  const pieY = barChartY + 20;
  const pieRadius = 18;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Documentación', pieX, barChartY - 3, { align: 'center' });
  
  // Dibujar pie chart
  const totalImg = repuestos.length;
  if (totalImg > 0) {
    const soloManual = conImagenManual - repuestos.filter(r => r.imagenesManual.length > 0 && r.fotosReales.length > 0).length;
    const soloReal = conFotoReal - repuestos.filter(r => r.imagenesManual.length > 0 && r.fotosReales.length > 0).length;
    const ambas = repuestos.filter(r => r.imagenesManual.length > 0 && r.fotosReales.length > 0).length;
    const ninguna = repuestos.length - conImagenManual - soloReal;
    
    let startAngle = -Math.PI / 2;
    const segments = [
      { value: ambas, color: [34, 197, 94], label: 'Ambas' },
      { value: soloManual, color: [59, 130, 246], label: 'Manual' },
      { value: soloReal, color: [168, 85, 247], label: 'Real' },
      { value: Math.max(0, ninguna), color: [209, 213, 219], label: 'Sin img' }
    ].filter(s => s.value > 0);
    
    segments.forEach(seg => {
      const sliceAngle = (seg.value / totalImg) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      
      // Dibujar sector
      doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
      
      // Usar path para dibujar el sector
      const steps = 30;
      const points: [number, number][] = [[pieX, pieY]];
      for (let j = 0; j <= steps; j++) {
        const angle = startAngle + (sliceAngle * j / steps);
        points.push([pieX + Math.cos(angle) * pieRadius, pieY + Math.sin(angle) * pieRadius]);
      }
      points.push([pieX, pieY]);
      
      // Dibujar polígono
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      let pathStr = `${points[0][0]} ${points[0][1]} m`;
      for (let k = 1; k < points.length; k++) {
        pathStr += ` ${points[k][0]} ${points[k][1]} l`;
      }
      
      // Aproximar con triángulos pequeños
      for (let j = 0; j < steps; j++) {
        const a1 = startAngle + (sliceAngle * j / steps);
        const a2 = startAngle + (sliceAngle * (j + 1) / steps);
        doc.triangle(
          pieX, pieY,
          pieX + Math.cos(a1) * pieRadius, pieY + Math.sin(a1) * pieRadius,
          pieX + Math.cos(a2) * pieRadius, pieY + Math.sin(a2) * pieRadius,
          'F'
        );
      }
      
      startAngle = endAngle;
    });
    
    // Leyenda del pie
    let legendY = barChartY + maxBarHeight + 3;
    doc.setFontSize(6);
    segments.forEach((seg, idx) => {
      const legendX = pieX - 20 + (idx % 2) * 25;
      const ly = legendY + Math.floor(idx / 2) * 6;
      doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
      doc.rect(legendX, ly - 2, 3, 3, 'F');
      doc.setTextColor(80, 80, 80);
      doc.text(`${seg.label}: ${seg.value}`, legendX + 4, ly, { align: 'left' });
    });
  }

  // --- Indicadores de Stock ---
  const indicatorX = pageWidth - margin - 45;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Disponibilidad', indicatorX + 20, barChartY - 3, { align: 'center' });
  
  // Barra de progreso de stock
  const stockPercent = repuestos.length > 0 ? (conStock / repuestos.length) * 100 : 0;
  const barBaseY = barChartY + 5;
  
  // Fondo
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(indicatorX, barBaseY, 40, 8, 2, 2, 'F');
  
  // Barra de progreso
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(indicatorX, barBaseY, 40 * (stockPercent / 100), 8, 2, 2, 'F');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  if (stockPercent > 20) {
    doc.text(`${Math.round(stockPercent)}%`, indicatorX + 20, barBaseY + 5.5, { align: 'center' });
  }
  
  doc.setFontSize(6);
  doc.setTextColor(34, 197, 94);
  doc.text(`${conStock} con stock`, indicatorX + 20, barBaseY + 14, { align: 'center' });
  doc.setTextColor(239, 68, 68);
  doc.text(`${sinStock} sin stock`, indicatorX + 20, barBaseY + 19, { align: 'center' });
  
  // Valor total destacado
  doc.setFillColor(30, 64, 175);
  doc.roundedRect(indicatorX, barBaseY + 26, 40, 14, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('VALOR TOTAL', indicatorX + 20, barBaseY + 32, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`$${totalValor.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, indicatorX + 20, barBaseY + 38, { align: 'center' });

    // Actualizar posición para tabla
    tableStartY = barChartY + maxBarHeight + 20;
  } // Fin de includeCharts

  // === TABLA RESUMEN ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Resumen', pageWidth / 2, tableStartY, { align: 'center' });

  autoTable(doc, {
    startY: tableStartY + 5,
    head: [['Concepto', 'Valor']],
    body: [
      ['Total Repuestos', repuestos.length.toString()],
      ['Cant. Solicitada Total', totalCantSolicitada.toString()],
      ['Stock Bodega Total', totalStockBodega.toString()],
      ['Valor Total (USD)', `$${totalValor.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Con Imágenes Manual', `${conImagenManual} (${Math.round(conImagenManual/repuestos.length*100)}%)`],
      ['Con Fotos Reales', `${conFotoReal} (${Math.round(conFotoReal/repuestos.length*100)}%)`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
    margin: { left: margin + 30, right: margin + 30 },
    styles: { fontSize: 9 }
  });

  onProgress?.(20, 'Generando detalle...');

  // === PÁGINAS SIGUIENTES: DETALLE DE REPUESTOS ===
  doc.addPage();
  
  // Título de página de detalle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Detalle de Repuestos', pageWidth / 2, 12, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${repuestos.length} repuestos`, pageWidth / 2, 17, { align: 'center' });

  let currentY = 22;

  for (let i = 0; i < repuestos.length; i++) {
    const repuesto = repuestos[i];
    const allImages = [...repuesto.imagenesManual, ...repuesto.fotosReales];
    const hasImages = allImages.length > 0;
    
    // Altura del bloque
    const blockHeight = hasImages ? 42 : 26;
    
    // Nueva página si no cabe
    if (currentY + blockHeight > pageHeight - 10) {
      doc.addPage();
      currentY = 10;
    }

    // Layout: 35% datos, 65% imágenes (cuando hay imágenes)
    const dataWidth = hasImages ? contentWidth * 0.35 : contentWidth;
    const imgSectionX = margin + dataWidth;
    const imgSectionWidth = contentWidth - dataWidth;

    // Fondo
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, currentY, contentWidth, blockHeight, 1, 1, 'FD');

    // === DATOS (IZQUIERDA) ===
    const dataX = margin + 2;
    let textY = currentY + 5;

    // Número Parte Manual (título principal)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(`N° Parte Manual: ${repuesto.codigoBaader || '-'}`, dataX, textY);

    // Código SAP
    textY += 4;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Cód. SAP: ', dataX, textY);
    doc.setFont('helvetica', 'normal');
    doc.text(repuesto.codigoSAP || '-', dataX + doc.getTextWidth('Cód. SAP: '), textY);

    // Descripción
    textY += 4;
    doc.setFontSize(6);
    doc.setTextColor(50, 50, 50);
    const maxW = dataWidth - 4;
    const lines = doc.splitTextToSize(repuesto.textoBreve || '', maxW);
    doc.text(lines.slice(0, 2), dataX, textY);
    textY += Math.min(lines.length, 2) * 2.5 + 2;

    // Cantidad
    const cantidadesPDF = getTotalCantidadesRepuesto(repuesto);
    const cantSolPDF = contextTag ? getCantidadPorContexto(repuesto, contextTag, 'solicitud') : cantidadesPDF.solicitud;
    const cantStockPDF = contextTag ? getCantidadPorContexto(repuesto, contextTag, 'stock') : cantidadesPDF.stock;
    const totalPDF = (repuesto.valorUnitario * cantSolPDF) + (repuesto.valorUnitario * cantStockPDF);
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Cantidad: ', dataX, textY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cantSolPDF}`, dataX + doc.getTextWidth('Cantidad: '), textY);
    
    // Valor Unitario
    textY += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('V. Unitario: ', dataX, textY);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${formatNumber(repuesto.valorUnitario)}`, dataX + doc.getTextWidth('V. Unitario: '), textY);
    
    // Total
    textY += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('Total: ', dataX, textY);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${formatNumber(totalPDF)}`, dataX + doc.getTextWidth('Total: '), textY);
    
    // Stock
    const stockX = dataX + 28;
    doc.setFont('helvetica', 'bold');
    doc.text('Stock: ', stockX, textY);
    const stockColor = cantStockPDF > 0 ? [0, 130, 0] : [180, 0, 0];
    doc.setTextColor(stockColor[0], stockColor[1], stockColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cantStockPDF}`, stockX + doc.getTextWidth('Stock: '), textY);

    // === IMÁGENES (DERECHA) ===
    if (hasImages) {
      const imgPad = 2;
      const imgAreaX = imgSectionX + imgPad;
      const imgAreaWidth = imgSectionWidth - imgPad * 2;
      const imgAreaHeight = blockHeight - imgPad * 2;
      const imgY = currentY + imgPad;

      if (allImages.length === 1) {
        // Una imagen - mantener aspect ratio
        const maxSize = Math.min(imgAreaWidth * 0.85, imgAreaHeight - 4);
        const imgData = imageMap.get(allImages[0].url);
        const { w, h } = calculateFitDimensions(imgData, maxSize, maxSize);
        
        const imgX = imgAreaX + (imgAreaWidth - w) / 2;
        const centerY = imgY + (imgAreaHeight - h) / 2 - 1;
        
        drawImageWithAspectRatio(doc, imageMap, allImages[0].url, imgX, centerY, w, h);
        
        // Etiqueta
        doc.setFontSize(4);
        doc.setTextColor(130, 130, 130);
        doc.setFont('helvetica', 'normal');
        const label = allImages[0].tipo === 'manual' ? 'Manual' : 'Real';
        doc.text(label, imgX + w / 2, centerY + h + 2.5, { align: 'center' });

      } else {
        // Dos imágenes lado a lado - mantener aspect ratio
        const gap = 3;
        const maxImgSize = Math.min((imgAreaWidth - gap) / 2 - 2, imgAreaHeight - 6);
        
        // Calcular dimensiones para cada imagen
        const img1Data = imageMap.get(allImages[0].url);
        const img2Data = allImages[1] ? imageMap.get(allImages[1].url) : null;
        
        const dims1 = calculateFitDimensions(img1Data, maxImgSize, maxImgSize);
        const dims2 = img2Data ? calculateFitDimensions(img2Data, maxImgSize, maxImgSize) : dims1;
        
        const totalW = dims1.w + dims2.w + gap;
        const startX = imgAreaX + (imgAreaWidth - totalW) / 2;
        const maxH = Math.max(dims1.h, dims2.h);
        const baseY = imgY + (imgAreaHeight - maxH - 4) / 2;

        // Primera imagen
        const y1 = baseY + (maxH - dims1.h) / 2;
        drawImageWithAspectRatio(doc, imageMap, allImages[0].url, startX, y1, dims1.w, dims1.h);
        
        doc.setFontSize(4);
        doc.setTextColor(130, 130, 130);
        doc.setFont('helvetica', 'normal');
        doc.text(allImages[0].tipo === 'manual' ? 'Manual' : 'Real', startX + dims1.w / 2, y1 + dims1.h + 2.5, { align: 'center' });

        // Segunda imagen
        if (allImages[1]) {
          const x2 = startX + dims1.w + gap;
          const y2 = baseY + (maxH - dims2.h) / 2;
          drawImageWithAspectRatio(doc, imageMap, allImages[1].url, x2, y2, dims2.w, dims2.h);
          
          doc.text(allImages[1].tipo === 'manual' ? 'Manual' : 'Real', x2 + dims2.w / 2, y2 + dims2.h + 2.5, { align: 'center' });
        }

        if (allImages.length > 2) {
          doc.setFontSize(5);
          doc.setTextColor(100, 100, 100);
          doc.text(`+${allImages.length - 2}`, imgAreaX + imgAreaWidth - 5, currentY + blockHeight - 2);
        }
      }
    }

    // Progreso
    const progress = 20 + Math.round((i / repuestos.length) * 75);
    onProgress?.(progress, `Procesando ${i + 1} de ${repuestos.length}...`);

    currentY += blockHeight + 2;
  }

  onProgress?.(100, 'Guardando PDF...');
  doc.save(`${filename}.pdf`);
}

// Calcular dimensiones manteniendo aspect ratio
function calculateFitDimensions(
  imgData: ImageData | undefined, 
  maxW: number, 
  maxH: number
): { w: number; h: number } {
  if (!imgData) {
    return { w: maxW, h: maxH };
  }
  
  const aspectRatio = imgData.width / imgData.height;
  let w = maxW;
  let h = maxW / aspectRatio;
  
  if (h > maxH) {
    h = maxH;
    w = maxH * aspectRatio;
  }
  
  return { w, h };
}

// Dibujar imagen manteniendo aspect ratio
function drawImageWithAspectRatio(
  doc: jsPDF, 
  imageMap: Map<string, ImageData>, 
  url: string, 
  x: number, 
  y: number, 
  w: number, 
  h: number
) {
  const imgData = imageMap.get(url);
  
  if (imgData) {
    try {
      const format = imgData.base64.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(imgData.base64, format, x, y, w, h);
      return;
    } catch (err) {
      console.error('Error agregando imagen al PDF:', err);
    }
  }
  
  // Placeholder
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(x, y, w, h, 1, 1, 'FD');
  doc.setFontSize(5);
  doc.setTextColor(180, 180, 180);
  doc.text('Sin img', x + w / 2, y + h / 2 + 1, { align: 'center' });
}

// Parsear Excel de entrada usando ExcelJS
export async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const data = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No se encontró ninguna hoja en el archivo');
  }

  // Obtener headers de la primera fila
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value || '').trim();
  });

  // Parsear filas
  const result: Record<string, unknown>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const rowData: Record<string, unknown> = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        rowData[header] = cell.value;
      }
    });
    
    result.push(rowData);
  });

  return result;
}
