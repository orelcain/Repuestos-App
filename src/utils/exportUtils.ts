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

  // === SECCIÓN DE GRÁFICOS ===
  const totalCantSolicitada = repuestos.reduce((s, r) => s + r.cantidadSolicitada, 0);
  const totalStockBodega = repuestos.reduce((s, r) => s + r.cantidadStockBodega, 0);
  const totalValor = repuestos.reduce((s, r) => s + r.total, 0);
  const conImagenManual = repuestos.filter(r => r.imagenesManual.length > 0).length;
  const conFotoReal = repuestos.filter(r => r.fotosReales.length > 0).length;
  const sinImagenes = repuestos.length - Math.max(conImagenManual, conFotoReal);
  const conStock = repuestos.filter(r => r.cantidadStockBodega > 0).length;
  const sinStock = repuestos.length - conStock;

  // --- Gráfico de barras: Cantidad vs Stock ---
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

  // === TABLA RESUMEN (más abajo) ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Detalle Numérico', pageWidth / 2, barChartY + maxBarHeight + 20, { align: 'center' });

  autoTable(doc, {
    startY: barChartY + maxBarHeight + 25,
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
