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
  Palette,
  Search
} from 'lucide-react';
import { Repuesto, VinculoManual } from '../../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PDFMarkerEditorProps {
  pdfUrl: string;
  repuestoId: string;
  repuestoDescripcion: string;
  existingMarker?: VinculoManual;
  onSave: (marker: Omit<VinculoManual, 'id'>) => void;
  onCancel: () => void;
  repuestos?: Repuesto[]; // Lista de repuestos para búsqueda
  onSelectRepuesto?: (repuesto: Repuesto) => void; // Callback al seleccionar un repuesto
}

const MARKER_COLORS = [
  { name: 'Rojo', value: 'rgba(239, 68, 68, 0.4)', border: '#ef4444' },
  { name: 'Azul', value: 'rgba(59, 130, 246, 0.4)', border: '#3b82f6' },
  { name: 'Verde', value: 'rgba(34, 197, 94, 0.4)', border: '#22c55e' },
  { name: 'Amarillo', value: 'rgba(234, 179, 8, 0.4)', border: '#eab308' },
  { name: 'Morado', value: 'rgba(168, 85, 247, 0.4)', border: '#a855f7' },
  { name: 'Naranja', value: 'rgba(249, 115, 22, 0.4)', border: '#f97316' },
];

const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.15;

export function PDFMarkerEditor({
  pdfUrl,
  repuestoDescripcion,
  existingMarker,
  onSave,
  onCancel,
  repuestos = [],
  onSelectRepuesto
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

  // Estado de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Repuesto[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);

  // Estado de repuesto actual
  const [currentDescription, setCurrentDescription] = useState(repuestoDescripcion);

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

  // Búsqueda de repuestos
  useEffect(() => {
    if (!searchTerm.trim() || repuestos.length === 0) {
      setSearchResults([]);
      setSelectedSearchIndex(-1);
      return;
    }

    const term = searchTerm.toLowerCase();
    const results = repuestos.filter(r => 
      r.codigoSAP?.toLowerCase().includes(term) ||
      r.codigoBaader?.toLowerCase().includes(term) ||
      r.textoBreve?.toLowerCase().includes(term) ||
      r.descripcion?.toLowerCase().includes(term)
    ).slice(0, 10); // Máximo 10 resultados

    setSearchResults(results);
    setSelectedSearchIndex(results.length > 0 ? 0 : -1);
  }, [searchTerm, repuestos]);

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

  // Eventos de dibujo con mouse
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

  // Touch events para móviles
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentMarker(null);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || !overlayRef.current || e.touches.length !== 1) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = overlayRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const marker = {
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y)
    };

    setCurrentMarker(marker);
    drawMarker(marker);
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
    setStartPoint(null);
  };

  // Zoom con rueda del mouse
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
      setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
    }
  };

  // Zoom con pinch en touch
  const lastTouchDistance = useRef<number | null>(null);
  
  const handleContainerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (lastTouchDistance.current !== null) {
        const delta = (distance - lastTouchDistance.current) * 0.005;
        setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
      }
      lastTouchDistance.current = distance;
    }
  };

  const handleContainerTouchEnd = () => {
    lastTouchDistance.current = null;
  };

  // Cambiar color
  const handleColorChange = (newColor: typeof MARKER_COLORS[0]) => {
    setColor(newColor.value);
    setColorBorder(newColor.border);
    if (currentMarker) {
      setTimeout(() => drawMarker(currentMarker), 0);
    }
  };

  // Seleccionar repuesto de búsqueda
  const handleSelectSearchResult = (repuesto: Repuesto) => {
    setCurrentDescription(repuesto.descripcion || repuesto.textoBreve);
    setSearchTerm('');
    setShowSearch(false);
    setCurrentMarker(null);
    
    // Limpiar overlay
    if (overlayRef.current) {
      const ctx = overlayRef.current.getContext('2d');
      ctx?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
    
    if (onSelectRepuesto) {
      onSelectRepuesto(repuesto);
    }
  };

  // Keyboard navigation for search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!searchResults.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter' && selectedSearchIndex >= 0) {
      e.preventDefault();
      handleSelectSearchResult(searchResults[selectedSearchIndex]);
    } else if (e.key === 'Escape') {
      setShowSearch(false);
      setSearchTerm('');
    }
  };

  // Ir a página específica
  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = parseInt((e.target as HTMLInputElement).value);
      if (!isNaN(value) && value >= 1 && value <= totalPages) {
        setCurrentPage(value);
      }
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
      {/* Header con búsqueda */}
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
        
        {/* Búsqueda de repuesto */}
        {repuestos.length > 0 && (
          <div className="relative mb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar repuesto por código o descripción..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            {/* Resultados de búsqueda */}
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                {searchResults.map((r, index) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectSearchResult(r)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-600 flex items-center gap-3 ${
                      index === selectedSearchIndex ? 'bg-gray-600' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded text-primary-400">
                          {r.codigoSAP}
                        </span>
                        {r.codigoBaader && (
                          <span className="font-mono text-xs text-gray-400">
                            {r.codigoBaader}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 truncate mt-1">
                        {r.descripcion || r.textoBreve}
                      </p>
                    </div>
                    {r.vinculosManual?.length > 0 && (
                      <span className="text-xs bg-green-600 px-2 py-0.5 rounded text-white">
                        Marcado
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Repuesto actual */}
        <p className="text-sm text-gray-400 truncate">
          <span className="text-primary-400 font-medium">Marcando:</span> {currentDescription}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-700 text-white flex-wrap gap-2">
        {/* Navegación */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded hover:bg-gray-600 disabled:opacity-50"
            title="Página anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            <span className="text-sm">Pág.</span>
            <input
              type="number"
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) setCurrentPage(Math.min(totalPages, Math.max(1, val)));
              }}
              onKeyDown={handlePageInput}
              className="w-12 px-2 py-1 bg-gray-600 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              min={1}
              max={totalPages}
            />
            <span className="text-sm">/ {totalPages}</span>
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="p-2 rounded hover:bg-gray-600 disabled:opacity-50"
            title="Página siguiente"
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
            onClick={() => setScale(prev => Math.max(MIN_SCALE, prev - SCALE_STEP))}
            className="p-2 rounded hover:bg-gray-600"
            title="Alejar"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm w-14 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(prev => Math.min(MAX_SCALE, prev + SCALE_STEP))}
            className="p-2 rounded hover:bg-gray-600"
            title="Acercar"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="px-4 py-2 bg-primary-600 text-white text-sm flex items-center justify-between flex-wrap gap-2">
        <span>
          Dibuja un {forma === 'rectangulo' ? 'rectángulo' : 'círculo'} sobre el repuesto en el manual para marcarlo
        </span>
        <span className="text-primary-200 text-xs hidden sm:block">
          💡 Ctrl+Scroll para zoom | Arrastra para dibujar
        </span>
      </div>

      {/* Canvas Container - con scroll */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex items-start justify-center p-4"
        style={{ cursor: 'grab' }}
        onWheel={handleWheel}
        onTouchMove={handleContainerTouchMove}
        onTouchEnd={handleContainerTouchEnd}
      >
        <div className="relative inline-block">
          <canvas ref={canvasRef} className="bg-white shadow-lg" />
          <canvas
            ref={overlayRef}
            className="absolute top-0 left-0"
            style={{ cursor: 'crosshair' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      </div>

      {/* Footer con botón guardar */}
      <div className="px-4 py-3 bg-gray-900 flex items-center justify-between flex-wrap gap-2">
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
