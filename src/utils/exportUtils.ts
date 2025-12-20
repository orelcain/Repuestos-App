import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Repuesto } from '../types';
import { preloadImagesAsBase64 } from './imageUtils';

// Exportar a Excel
export async function exportToExcel(repuestos: Repuesto[], filename: string = 'repuestos_baader_200') {
  const data = repuestos.map(r => ({
    'Código SAP': r.codigoSAP,
    'Código Baader': r.codigoBaader,
    'Descripción': r.textoBreve,
    'Cantidad Solicitada': r.cantidadSolicitada,
    'Valor Unitario (USD)': r.valorUnitario,
    'Total (USD)': r.total,
    'Stock Bodega': r.cantidadStockBodega,
    'Última Act. Inventario': r.fechaUltimaActualizacionInventario 
      ? new Date(r.fechaUltimaActualizacionInventario).toLocaleDateString('es-CL')
      : '',
    'Imágenes Manual': r.imagenesManual.length,
    'Fotos Reales': r.fotosReales.length
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Repuestos');

  // Ajustar anchos de columna
  const colWidths = [
    { wch: 12 }, // Código SAP
    { wch: 15 }, // Código Baader
    { wch: 40 }, // Descripción
    { wch: 10 }, // Cantidad
    { wch: 12 }, // Valor Unitario
    { wch: 12 }, // Total
    { wch: 10 }, // Stock
    { wch: 15 }, // Última Act.
    { wch: 10 }, // Imágenes
    { wch: 10 }, // Fotos
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Exportar a PDF con imágenes
export async function exportToPDF(
  repuestos: Repuesto[], 
  filename: string = 'repuestos_baader_200',
  onProgress?: (progress: number, message: string) => void
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  // Precargar imágenes como base64 para evitar problemas de CORS
  onProgress?.(5, 'Precargando imágenes...');
  const imageMap = await preloadImagesAsBase64(repuestos);
  onProgress?.(20, 'Generando PDF...');

  // Título
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Repuestos Baader 200', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')} | Total: ${repuestos.length} repuestos`, pageWidth / 2, 21, { align: 'center' });

  let currentY = 28;

  for (let i = 0; i < repuestos.length; i++) {
    const repuesto = repuestos[i];
    const allImages = [...repuesto.imagenesManual, ...repuesto.fotosReales];
    const hasImages = allImages.length > 0;
    
    // Calcular altura del bloque según contenido
    const blockHeight = hasImages ? 50 : 35;
    
    // Verificar si necesitamos nueva página
    if (currentY + blockHeight > pageHeight - 15) {
      doc.addPage();
      currentY = 15;
    }

    // Configuración de layout
    const dataWidth = hasImages ? contentWidth * 0.55 : contentWidth;
    const imgSectionWidth = hasImages ? contentWidth * 0.45 : 0;
    const imgStartX = margin + dataWidth + 3;

    // Recuadro del repuesto
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(margin, currentY, contentWidth, blockHeight, 2, 2, 'FD');

    // Línea divisoria si hay imágenes
    if (hasImages) {
      doc.setDrawColor(230, 230, 230);
      doc.line(margin + dataWidth, currentY + 3, margin + dataWidth, currentY + blockHeight - 3);
    }

    // === SECCIÓN IZQUIERDA: DATOS ===
    let textY = currentY + 6;

    // Código Baader (título principal)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(repuesto.codigoBaader || '-', margin + 3, textY);
    
    // SAP al lado
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    const sapText = `SAP: ${repuesto.codigoSAP || '-'}`;
    doc.text(sapText, margin + 3 + doc.getTextWidth(repuesto.codigoBaader || '-') + 5, textY);

    // Descripción (truncada si es muy larga)
    textY += 6;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const maxDescWidth = dataWidth - 8;
    let descripcion = repuesto.textoBreve || '';
    if (doc.getTextWidth(descripcion) > maxDescWidth) {
      while (doc.getTextWidth(descripcion + '...') > maxDescWidth && descripcion.length > 0) {
        descripcion = descripcion.slice(0, -1);
      }
      descripcion += '...';
    }
    doc.text(descripcion, margin + 3, textY);

    // Datos en fila compacta
    textY += 8;
    doc.setFontSize(7);
    
    // Cantidad
    doc.setTextColor(100, 100, 100);
    doc.text('Cant:', margin + 3, textY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(`${repuesto.cantidadSolicitada}`, margin + 13, textY);

    // Valor Unitario
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('V.Unit:', margin + 25, textY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(`$${repuesto.valorUnitario.toFixed(2)}`, margin + 37, textY);

    // Total
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Total:', margin + 58, textY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 139, 34);
    doc.text(`$${repuesto.total.toFixed(2)}`, margin + 68, textY);

    // Stock (segunda fila si hay espacio)
    if (hasImages) {
      textY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Stock Bodega:', margin + 3, textY);
      
      const stockColor = repuesto.cantidadStockBodega > 0 ? [34, 197, 94] : [220, 38, 38];
      doc.setTextColor(stockColor[0], stockColor[1], stockColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${repuesto.cantidadStockBodega}`, margin + 26, textY);
    } else {
      // Stock en la misma fila si no hay imágenes
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Stock:', margin + 88, textY);
      
      const stockColor = repuesto.cantidadStockBodega > 0 ? [34, 197, 94] : [220, 38, 38];
      doc.setTextColor(stockColor[0], stockColor[1], stockColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${repuesto.cantidadStockBodega}`, margin + 100, textY);
    }

    // Tags si existen
    if (repuesto.tags && repuesto.tags.length > 0) {
      textY += 5;
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 150);
      const tagsText = repuesto.tags.slice(0, 3).join(' • ');
      doc.text(tagsText, margin + 3, textY);
    }

    // === SECCIÓN DERECHA: IMÁGENES ===
    if (hasImages) {
      const imgPadding = 2;
      const availableWidth = imgSectionWidth - imgPadding * 2;
      const availableHeight = blockHeight - imgPadding * 2;
      const imgY = currentY + imgPadding;

      if (allImages.length === 1) {
        // Una sola imagen - usar todo el espacio
        const imgSize = Math.min(availableWidth - 4, availableHeight - 4);
        const imgX = imgStartX + (availableWidth - imgSize) / 2;
        const centerY = imgY + (availableHeight - imgSize) / 2;
        
        const base64 = imageMap.get(allImages[0].url);
        if (base64) {
          try {
            const format = getImageFormat(base64);
            doc.addImage(base64, format, imgX, centerY, imgSize, imgSize);
          } catch {
            drawImagePlaceholder(doc, imgX, centerY, imgSize);
          }
        } else {
          drawImagePlaceholder(doc, imgX, centerY, imgSize);
        }
        
        // Etiqueta del tipo de imagen
        doc.setFontSize(5);
        doc.setTextColor(150, 150, 150);
        const tipo = allImages[0].tipo === 'manual' ? 'Manual' : 'Real';
        doc.text(tipo, imgX + imgSize / 2, centerY + imgSize + 3, { align: 'center' });

      } else {
        // Dos o más imágenes - dividir espacio
        const imgSize = Math.min((availableWidth - 6) / 2, availableHeight - 8);
        const gap = 3;
        const totalWidth = imgSize * 2 + gap;
        const startX = imgStartX + (availableWidth - totalWidth) / 2;
        const centerY = imgY + (availableHeight - imgSize - 6) / 2;

        for (let j = 0; j < Math.min(2, allImages.length); j++) {
          const img = allImages[j];
          const imgX = startX + j * (imgSize + gap);
          const base64 = imageMap.get(img.url);
          
          if (base64) {
            try {
              const format = getImageFormat(base64);
              doc.addImage(base64, format, imgX, centerY, imgSize, imgSize);
            } catch {
              drawImagePlaceholder(doc, imgX, centerY, imgSize);
            }
          } else {
            drawImagePlaceholder(doc, imgX, centerY, imgSize);
          }

          // Etiqueta del tipo
          doc.setFontSize(5);
          doc.setTextColor(150, 150, 150);
          const tipo = img.tipo === 'manual' ? 'Manual' : 'Real';
          doc.text(tipo, imgX + imgSize / 2, centerY + imgSize + 3, { align: 'center' });
        }

        // Indicador de más imágenes
        if (allImages.length > 2) {
          doc.setFontSize(6);
          doc.setTextColor(100, 100, 100);
          doc.text(`+${allImages.length - 2} más`, imgStartX + availableWidth / 2, currentY + blockHeight - 2, { align: 'center' });
        }
      }
    }

    // Actualizar progreso
    const progress = 20 + Math.round((i / repuestos.length) * 70);
    onProgress?.(progress, `Procesando ${i + 1} de ${repuestos.length}...`);

    currentY += blockHeight + 3;
  }

  onProgress?.(95, 'Generando resumen...');

  // Resumen al final
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Resumen', pageWidth / 2, 20, { align: 'center' });

  // Tabla resumen
  autoTable(doc, {
    startY: 30,
    head: [['Concepto', 'Valor']],
    body: [
      ['Total Repuestos', repuestos.length.toString()],
      ['Total Cantidad Solicitada', repuestos.reduce((sum, r) => sum + r.cantidadSolicitada, 0).toString()],
      ['Total en Stock', repuestos.reduce((sum, r) => sum + r.cantidadStockBodega, 0).toString()],
      ['Valor Total (USD)', `$${repuestos.reduce((sum, r) => sum + r.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Con Imágenes del Manual', repuestos.filter(r => r.imagenesManual.length > 0).length.toString()],
      ['Sin Imágenes del Manual', repuestos.filter(r => r.imagenesManual.length === 0).length.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
    margin: { left: margin, right: margin }
  });

  onProgress?.(100, 'Guardando PDF...');
  doc.save(`${filename}.pdf`);
}

// Función auxiliar para obtener formato de imagen desde base64
function getImageFormat(base64: string): string {
  if (base64.includes('image/png')) return 'PNG';
  if (base64.includes('image/webp')) return 'WEBP';
  if (base64.includes('image/gif')) return 'GIF';
  return 'JPEG';
}

// Función auxiliar para dibujar placeholder de imagen
function drawImagePlaceholder(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(240, 240, 240);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(x, y, size, size, 1, 1, 'FD');
  doc.setFontSize(5);
  doc.setTextColor(180, 180, 180);
  doc.text('Sin imagen', x + size / 2, y + size / 2 + 1, { align: 'center' });
}

// Parsear Excel de entrada
export async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData as Record<string, unknown>[]);
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsBinaryString(file);
  });
}
