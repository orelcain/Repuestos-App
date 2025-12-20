import { useState, useRef, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Circle,
  Square,
  Save,
  X,
  Loader2,
  Palette
} from 'lucide-react';
import { VinculoManual } from '../../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PDFMarkerEditorProps {
  pdfUrl: string;
  repuestoId: string;
  repuestoDescripcion: string;
  existingMarker?: VinculoManual;
  onSave: (marker: Omit<VinculoManual, 'id'>) => void;
  onCancel: () => void;
}

const MARKER_COLORS = [
  { name: 'Rojo', value: 'rgba(239, 68, 68, 0.4)', border: '#ef4444' },
  { name: 'Azul', value: 'rgba(59, 130, 246, 0.4)', border: '#3b82f6' },
  { name: 'Verde', value: 'rgba(34, 197, 94, 0.4)', border: '#22c55e' },
  { name: 'Amarillo', value: 'rgba(234, 179, 8, 0.4)', border: '#eab308' },
  { name: 'Morado', value: 'rgba(168, 85, 247, 0.4)', border: '#a855f7' },
  { name: 'Naranja', value: 'rgba(249, 115, 22, 0.4)', border: '#f97316' },
];

export function PDFMarkerEditor({
  pdfUrl,
  repuestoDescripcion,
  existingMarker,
  onSave,
  onCancel
}: PDFMarkerEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(existingMarker?.pagina || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  
  // Estado de dibujo
  const [forma, setForma] = useState<'circulo' | 'rectangulo'>(existingMarker?.forma || 'rectangulo');
  const [color, setColor] = useState(existingMarker?.color || MARKER_COLORS[0].value);
  const [colorBorder, setColorBorder] = useState(MARKER_COLORS[0].border);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentMarker, setCurrentMarker] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(existingMarker?.coordenadas || null);

  // Cargar PDF
  useEffect(() => {
    if (!pdfUrl) return;
    setLoading(true);
    
    pdfjsLib.getDocument(pdfUrl).promise
      .then((pdfDoc) => {
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al cargar PDF:', err);
        setLoading(false);
      });
  }, [pdfUrl]);

  // Renderizar página
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdf || !canvasRef.current) return;

    const page = await pdf.getPage(pageNum);
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // También ajustar el overlay
    if (overlayRef.current) {
      overlayRef.current.height = viewport.height;
      overlayRef.current.width = viewport.width;
    }

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Redibujar marcador existente
    if (currentMarker) {
      drawMarker(currentMarker);
    }
  }, [pdf, scale, currentMarker]);

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, renderPage]);

  // Dibujar marcador
  const drawMarker = useCallback((marker: { x: number; y: number; width: number; height: number }) => {
    if (!overlayRef.current) return;
    const ctx = overlayRef.current.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas overlay
    ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

    ctx.fillStyle = color;
    ctx.strokeStyle = colorBorder;
    ctx.lineWidth = 3;

    if (forma === 'rectangulo') {
      ctx.fillRect(marker.x, marker.y, marker.width, marker.height);
      ctx.strokeRect(marker.x, marker.y, marker.width, marker.height);
    } else {
      // Círculo/elipse
      const centerX = marker.x + marker.width / 2;
      const centerY = marker.y + marker.height / 2;
      const radiusX = Math.abs(marker.width) / 2;
      const radiusY = Math.abs(marker.height) / 2;

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  }, [forma, color, colorBorder]);

  // Eventos de dibujo
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentMarker(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const marker = {
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y)
    };

    setCurrentMarker(marker);
    drawMarker(marker);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setStartPoint(null);
  };

  // Cambiar color
  const handleColorChange = (newColor: typeof MARKER_COLORS[0]) => {
    setColor(newColor.value);
    setColorBorder(newColor.border);
    if (currentMarker) {
      setTimeout(() => drawMarker(currentMarker), 0);
    }
  };

  // Guardar marcador
  const handleSave = () => {
    if (!currentMarker) return;

    onSave({
      pagina: currentPage,
      coordenadas: currentMarker,
      forma,
      color,
      descripcion: `Marcador en página ${currentPage}`
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-900 text-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">Marcar en Manual</h3>
          <button
            onClick={onCancel}
            className="p-2 rounded hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-400 truncate">{repuestoDescripcion}</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-700 text-white flex-wrap gap-2">
        {/* Navegación */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm min-w-[80px] text-center">
            Pág. {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="p-2 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Forma */}
        <div className="flex items-center gap-1 bg-gray-600 rounded p-1">
          <button
            onClick={() => setForma('rectangulo')}
            className={`p-2 rounded transition-colors ${
              forma === 'rectangulo' ? 'bg-primary-600' : 'hover:bg-gray-500'
            }`}
            title="Rectángulo"
          >
            <Square className="w-5 h-5" />
          </button>
          <button
            onClick={() => setForma('circulo')}
            className={`p-2 rounded transition-colors ${
              forma === 'circulo' ? 'bg-primary-600' : 'hover:bg-gray-500'
            }`}
            title="Círculo/Elipse"
          >
            <Circle className="w-5 h-5" />
          </button>
        </div>

        {/* Colores */}
        <div className="flex items-center gap-1">
          <Palette className="w-4 h-4 mr-1 text-gray-400" />
          {MARKER_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => handleColorChange(c)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                color === c.value ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: c.border }}
              title={c.name}
            />
          ))}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
            className="p-2 rounded hover:bg-gray-600"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(prev => Math.min(2, prev + 0.25))}
            className="p-2 rounded hover:bg-gray-600"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="px-4 py-2 bg-primary-600 text-white text-sm">
        Dibuja un {forma === 'rectangulo' ? 'rectángulo' : 'círculo'} sobre el repuesto en el manual para marcarlo
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex items-start justify-center p-4"
      >
        <div className="relative">
          <canvas ref={canvasRef} className="bg-white shadow-lg" />
          <canvas
            ref={overlayRef}
            className="absolute top-0 left-0 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>

      {/* Footer con botón guardar */}
      <div className="px-4 py-3 bg-gray-900 flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {currentMarker 
            ? '✓ Marcador dibujado - Listo para guardar' 
            : 'Dibuja el marcador en el PDF'}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!currentMarker}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-5 h-5" />
            Guardar Marcador
          </button>
        </div>
      </div>
    </div>
  );
}
