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

  const colWidths = [
    { wch: 12 }, { wch: 15 }, { wch: 40 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 },
    { wch: 10 }, { wch: 10 },
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
  const margin = 8;
  const contentWidth = pageWidth - 2 * margin;

  // Precargar imágenes
  onProgress?.(5, 'Precargando imágenes...');
  const imageMap = await preloadImagesAsBase64(repuestos);
  console.log('Imágenes cargadas:', imageMap.size);
  onProgress?.(20, 'Generando PDF...');

  // Título
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Repuestos Baader 200', pageWidth / 2, 12, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${new Date().toLocaleDateString('es-CL')} | ${repuestos.length} repuestos`, pageWidth / 2, 17, { align: 'center' });

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

    // Código Baader
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(repuesto.codigoBaader || '-', dataX, textY);

    // SAP
    textY += 4;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`SAP: ${repuesto.codigoSAP || '-'}`, dataX, textY);

    // Descripción
    textY += 4;
    doc.setFontSize(6);
    doc.setTextColor(50, 50, 50);
    const maxW = dataWidth - 4;
    const lines = doc.splitTextToSize(repuesto.textoBreve || '', maxW);
    doc.text(lines.slice(0, 2), dataX, textY);
    textY += Math.min(lines.length, 2) * 2.5 + 1;

    // Datos compactos
    doc.setFontSize(5.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Cant: ${repuesto.cantidadSolicitada}  |  V.U: $${repuesto.valorUnitario.toFixed(0)}`, dataX, textY);
    
    textY += 3;
    doc.text(`Total: $${repuesto.total.toFixed(0)}`, dataX, textY);
    
    // Stock
    const stockColor = repuesto.cantidadStockBodega > 0 ? [0, 130, 0] : [180, 0, 0];
    doc.setTextColor(80, 80, 80);
    doc.text(`  |  Stock: `, dataX + doc.getTextWidth(`Total: $${repuesto.total.toFixed(0)}`), textY);
    doc.setTextColor(stockColor[0], stockColor[1], stockColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${repuesto.cantidadStockBodega}`, dataX + doc.getTextWidth(`Total: $${repuesto.total.toFixed(0)}  |  Stock: `), textY);

    // === IMÁGENES (DERECHA) ===
    if (hasImages) {
      const imgPad = 2;
      const imgAreaX = imgSectionX + imgPad;
      const imgAreaWidth = imgSectionWidth - imgPad * 2;
      const imgAreaHeight = blockHeight - imgPad * 2;
      const imgY = currentY + imgPad;

      if (allImages.length === 1) {
        // Una imagen grande
        const imgSize = Math.min(imgAreaWidth * 0.85, imgAreaHeight - 4);
        const imgX = imgAreaX + (imgAreaWidth - imgSize) / 2;
        const centerY = imgY + (imgAreaHeight - imgSize) / 2 - 1;
        
        drawImageOrPlaceholder(doc, imageMap, allImages[0].url, imgX, centerY, imgSize, imgSize);
        
        // Etiqueta
        doc.setFontSize(4);
        doc.setTextColor(130, 130, 130);
        doc.setFont('helvetica', 'normal');
        const label = allImages[0].tipo === 'manual' ? 'Manual' : 'Real';
        doc.text(label, imgX + imgSize / 2, centerY + imgSize + 2.5, { align: 'center' });

      } else {
        // Dos imágenes lado a lado
        const gap = 2;
        const imgSize = Math.min((imgAreaWidth - gap) / 2 - 2, imgAreaHeight - 6);
        const totalW = imgSize * 2 + gap;
        const startX = imgAreaX + (imgAreaWidth - totalW) / 2;
        const centerY = imgY + (imgAreaHeight - imgSize - 4) / 2;

        for (let j = 0; j < Math.min(2, allImages.length); j++) {
          const img = allImages[j];
          const imgX = startX + j * (imgSize + gap);
          
          drawImageOrPlaceholder(doc, imageMap, img.url, imgX, centerY, imgSize, imgSize);
          
          // Etiqueta
          doc.setFontSize(4);
          doc.setTextColor(130, 130, 130);
          doc.setFont('helvetica', 'normal');
          const label = img.tipo === 'manual' ? 'Manual' : 'Real';
          doc.text(label, imgX + imgSize / 2, centerY + imgSize + 2.5, { align: 'center' });
        }

        if (allImages.length > 2) {
          doc.setFontSize(5);
          doc.setTextColor(100, 100, 100);
          doc.text(`+${allImages.length - 2}`, imgAreaX + imgAreaWidth - 5, currentY + blockHeight - 2);
        }
      }
    }

    // Progreso
    const progress = 20 + Math.round((i / repuestos.length) * 70);
    onProgress?.(progress, `Procesando ${i + 1} de ${repuestos.length}...`);

    currentY += blockHeight + 2;
  }

  onProgress?.(95, 'Generando resumen...');

  // Resumen
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Resumen', pageWidth / 2, 20, { align: 'center' });

  autoTable(doc, {
    startY: 30,
    head: [['Concepto', 'Valor']],
    body: [
      ['Total Repuestos', repuestos.length.toString()],
      ['Total Cantidad', repuestos.reduce((s, r) => s + r.cantidadSolicitada, 0).toString()],
      ['Total en Stock', repuestos.reduce((s, r) => s + r.cantidadStockBodega, 0).toString()],
      ['Valor Total (USD)', `$${repuestos.reduce((s, r) => s + r.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Con Imágenes Manual', repuestos.filter(r => r.imagenesManual.length > 0).length.toString()],
      ['Con Fotos Reales', repuestos.filter(r => r.fotosReales.length > 0).length.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
    margin: { left: margin, right: margin }
  });

  onProgress?.(100, 'Guardando PDF...');
  doc.save(`${filename}.pdf`);
}

// Dibujar imagen o placeholder
function drawImageOrPlaceholder(
  doc: jsPDF, 
  imageMap: Map<string, string>, 
  url: string, 
  x: number, 
  y: number, 
  w: number, 
  h: number
) {
  const base64 = imageMap.get(url);
  
  if (base64) {
    try {
      const format = base64.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(base64, format, x, y, w, h);
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
