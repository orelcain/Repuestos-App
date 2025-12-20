import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Repuesto } from '../types';
import { preloadImagesWithDimensions, ImageData } from './imageUtils';

// Formatear número con decimales solo si los tiene
function formatNumber(num: number): string {
  if (Number.isInteger(num)) {
    return num.toLocaleString('es-CL');
  }
  return num.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

  // Precargar imágenes con dimensiones
  onProgress?.(5, 'Precargando imágenes...');
  const imageMap = await preloadImagesWithDimensions(repuestos);
  console.log('Imágenes cargadas:', imageMap.size);
  onProgress?.(15, 'Generando resumen...');

  // === PÁGINA 1: RESUMEN AL INICIO ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Repuestos Baader 200', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Resumen', pageWidth / 2, 42, { align: 'center' });

  autoTable(doc, {
    startY: 50,
    head: [['Concepto', 'Valor']],
    body: [
      ['Total Repuestos', repuestos.length.toString()],
      ['Total Cantidad Solicitada', repuestos.reduce((s, r) => s + r.cantidadSolicitada, 0).toString()],
      ['Total Stock Bodega', repuestos.reduce((s, r) => s + r.cantidadStockBodega, 0).toString()],
      ['Valor Total (USD)', `$${repuestos.reduce((s, r) => s + r.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Con Imágenes Manual', repuestos.filter(r => r.imagenesManual.length > 0).length.toString()],
      ['Con Fotos Reales', repuestos.filter(r => r.fotosReales.length > 0).length.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10 }
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

    // Código Baader (título principal)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(`Cód. Baader: ${repuesto.codigoBaader || '-'}`, dataX, textY);

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
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Cantidad: ', dataX, textY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${repuesto.cantidadSolicitada}`, dataX + doc.getTextWidth('Cantidad: '), textY);
    
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
    doc.text(`$${formatNumber(repuesto.total)}`, dataX + doc.getTextWidth('Total: '), textY);
    
    // Stock
    const stockX = dataX + 28;
    doc.setFont('helvetica', 'bold');
    doc.text('Stock: ', stockX, textY);
    const stockColor = repuesto.cantidadStockBodega > 0 ? [0, 130, 0] : [180, 0, 0];
    doc.setTextColor(stockColor[0], stockColor[1], stockColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${repuesto.cantidadStockBodega}`, stockX + doc.getTextWidth('Stock: '), textY);

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
