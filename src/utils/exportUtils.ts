import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Repuesto } from '../types';

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
export async function exportToPDF(repuestos: Repuesto[], filename: string = 'repuestos_baader_200') {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Repuestos Baader 200', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')}`, pageWidth / 2, 27, { align: 'center' });
  doc.text(`Total: ${repuestos.length} repuestos`, pageWidth / 2, 32, { align: 'center' });

  let currentY = 40;

  for (let i = 0; i < repuestos.length; i++) {
    const repuesto = repuestos[i];
    
    // Verificar si necesitamos nueva página
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = 20;
    }

    // Recuadro del repuesto
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 60, 3, 3, 'FD');

    // Encabezado del repuesto
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(`${repuesto.codigoBaader}`, margin + 5, currentY + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`SAP: ${repuesto.codigoSAP}`, margin + 50, currentY + 8);

    // Descripción
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const descripcion = doc.splitTextToSize(repuesto.textoBreve, pageWidth - 2 * margin - 10);
    doc.text(descripcion, margin + 5, currentY + 16);

    // Datos en columnas
    const col1X = margin + 5;
    const col2X = margin + 60;
    const col3X = margin + 110;
    const dataY = currentY + 32;

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    doc.text('Cantidad:', col1X, dataY);
    doc.text('Valor Unit.:', col2X, dataY);
    doc.text('Total:', col3X, dataY);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(`${repuesto.cantidadSolicitada}`, col1X, dataY + 5);
    doc.text(`$${repuesto.valorUnitario.toFixed(2)}`, col2X, dataY + 5);
    doc.text(`$${repuesto.total.toFixed(2)}`, col3X, dataY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Stock Bodega:', col1X, dataY + 12);
    
    const stockColor = repuesto.cantidadStockBodega > 0 ? [34, 197, 94] : [156, 163, 175];
    doc.setTextColor(stockColor[0], stockColor[1], stockColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${repuesto.cantidadStockBodega}`, col1X + 25, dataY + 12);

    // Imágenes (si existen)
    const allImages = [...repuesto.imagenesManual, ...repuesto.fotosReales];
    if (allImages.length > 0) {
      const imgStartX = pageWidth - margin - 45;
      const imgY = currentY + 5;
      const imgSize = 25;

      // Mostrar hasta 2 imágenes
      for (let j = 0; j < Math.min(2, allImages.length); j++) {
        try {
          const img = allImages[j];
          // Intentar cargar la imagen (esto puede fallar con CORS)
          // En producción, las imágenes deberían estar en base64 o en el mismo dominio
          doc.addImage(img.url, 'JPEG', imgStartX + (j * (imgSize + 2)), imgY, imgSize, imgSize);
        } catch (e) {
          // Si falla, dibujar placeholder
          doc.setFillColor(230, 230, 230);
          doc.rect(imgStartX + (j * (imgSize + 2)), imgY, imgSize, imgSize, 'F');
          doc.setFontSize(6);
          doc.setTextColor(150, 150, 150);
          doc.text('Imagen', imgStartX + (j * (imgSize + 2)) + 5, imgY + 13);
        }
      }

      if (allImages.length > 2) {
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`+${allImages.length - 2} más`, imgStartX, imgY + imgSize + 5);
      }
    }

    currentY += 65;
  }

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

  doc.save(`${filename}.pdf`);
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
