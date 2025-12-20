import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Search,
  Maximize2,
  Minimize2,
  Camera,
  Loader2
} from 'lucide-react';
import { VinculoManual } from '../../types';

// Configurar worker de PDF.js - usando versión específica estable
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl: string | null;
  targetPage?: number;
  marker?: VinculoManual;
  onCapture?: (imageData: string, pageNumber: number) => void;
}

export function PDFViewer({ 
  pdfUrl, 
  targetPage,
  marker,
  onCapture
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [captureMode, setCaptureMode] = useState(false);

  // Cargar PDF
  useEffect(() => {
    if (!pdfUrl) return;

    setLoading(true);
    setError(null);

    pdfjsLib.getDocument(pdfUrl).promise
      .then((pdfDoc) => {
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al cargar PDF:', err);
        setError('No se pudo cargar el manual PDF');
        setLoading(false);
      });
  }, [pdfUrl]);

  // Navegar a página específica
  useEffect(() => {
    if (targetPage && targetPage > 0 && targetPage <= totalPages) {
      setCurrentPage(targetPage);
    }
  }, [targetPage, totalPages]);

  // Renderizar página
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdf || !canvasRef.current) return;

    try {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Ajustar overlay
      if (overlayRef.current) {
        overlayRef.current.height = viewport.height;
        overlayRef.current.width = viewport.width;
      }

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Dibujar marcador si existe y estamos en la página correcta
      if (marker && marker.pagina === pageNum && marker.coordenadas && overlayRef.current) {
        const ctx = overlayRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
          
          const { x, y, width, height } = marker.coordenadas;
          ctx.fillStyle = marker.color || 'rgba(239, 68, 68, 0.4)';
          ctx.strokeStyle = marker.color?.replace('0.4', '1') || '#ef4444';
          ctx.lineWidth = 3;

          if (marker.forma === 'circulo') {
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);
          }

          // Animación de pulso
          ctx.globalAlpha = 0.6;
          ctx.lineWidth = 6;
          ctx.stroke();
        }
      } else if (overlayRef.current) {
        const ctx = overlayRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      }
    } catch (err) {
      console.error('Error al renderizar página:', err);
    }
  }, [pdf, scale, marker]);

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, renderPage]);

  // Manejar scroll del ratón para cambiar páginas
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !pdf) return;

    let scrollTimeout: NodeJS.Timeout | null = null;
    let accumulatedDelta = 0;
    const threshold = 100; // Cantidad de scroll necesario para cambiar página

    const handleWheel = (e: WheelEvent) => {
      // Verificar si el contenedor tiene scroll interno
      const hasVerticalScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;
      const atTop = scrollContainer.scrollTop <= 0;
      const atBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 5;

      // Si hay scroll interno y no estamos en los extremos, permitir scroll normal
      if (hasVerticalScroll && !atTop && !atBottom) {
        return;
      }

      // Si estamos en el tope y scrolleando hacia arriba, ir a página anterior
      if (atTop && e.deltaY < 0 && currentPage > 1) {
        e.preventDefault();
        accumulatedDelta += Math.abs(e.deltaY);
        
        if (accumulatedDelta >= threshold) {
          setCurrentPage(prev => prev - 1);
          accumulatedDelta = 0;
          // Ir al final de la página anterior
          setTimeout(() => {
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
          }, 100);
        }
      }
      // Si estamos al final y scrolleando hacia abajo, ir a página siguiente
      else if (atBottom && e.deltaY > 0 && currentPage < totalPages) {
        e.preventDefault();
        accumulatedDelta += Math.abs(e.deltaY);
        
        if (accumulatedDelta >= threshold) {
          setCurrentPage(prev => prev + 1);
          accumulatedDelta = 0;
          // Ir al inicio de la página siguiente
          setTimeout(() => {
            if (scrollContainer) {
              scrollContainer.scrollTop = 0;
            }
          }, 100);
        }
      }

      // Reset del acumulador después de inactividad
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        accumulatedDelta = 0;
      }, 200);
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [pdf, currentPage, totalPages]);

  // Navegación
  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  // Zoom
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  // Búsqueda por página
  const handleSearch = () => {
    const pageNum = parseInt(searchInput);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setSearchInput('');
    }
  };

  // Capturar imagen de área actual
  const handleCapture = () => {
    if (!canvasRef.current || !onCapture) return;
    
    const imageData = canvasRef.current.toDataURL('image/png');
    onCapture(imageData, currentPage);
    setCaptureMode(false);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!pdfUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 text-gray-500">
        <p>Selecciona un repuesto para ver el manual</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
        <p className="text-gray-600">Cargando manual...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full flex flex-col bg-gray-800"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white">
        <div className="flex items-center gap-2">
          {/* Navegación */}
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="text-sm">
            {currentPage} / {totalPages}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Búsqueda por página */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Pág."
            className="w-16 px-2 py-1 text-sm bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-400"
            min="1"
            max={totalPages}
          />
          <button
            onClick={handleSearch}
            className="p-2 rounded hover:bg-gray-700"
            title="Ir a página"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom y acciones */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="p-2 rounded hover:bg-gray-700"
            title="Alejar"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          
          <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          
          <button
            onClick={zoomIn}
            className="p-2 rounded hover:bg-gray-700"
            title="Acercar"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-gray-700 mx-2" />

          {onCapture && (
            <button
              onClick={() => setCaptureMode(!captureMode)}
              className={`p-2 rounded transition-colors ${
                captureMode ? 'bg-primary-600' : 'hover:bg-gray-700'
              }`}
              title="Capturar imagen"
            >
              <Camera className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded hover:bg-gray-700"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Capture Mode Bar */}
      {captureMode && (
        <div className="px-4 py-2 bg-primary-600 text-white text-sm flex items-center justify-between">
          <span>Modo captura activo - La página actual será capturada como imagen</span>
          <button
            onClick={handleCapture}
            className="px-4 py-1 bg-white text-primary-600 rounded font-medium hover:bg-gray-100"
          >
            Capturar página {currentPage}
          </button>
        </div>
      )}

      {/* Canvas Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto pdf-container flex items-start justify-center p-4"
      >
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="pdf-page bg-white shadow-lg"
            style={{ maxWidth: '100%' }}
          />
          <canvas
            ref={overlayRef}
            className="absolute top-0 left-0 pointer-events-none"
          />
        </div>
      </div>

      {/* Indicador de navegación por scroll */}
      <div className="px-4 py-1 bg-gray-900 text-gray-400 text-xs text-center">
        💡 Usa la rueda del ratón para navegar entre páginas
      </div>
    </div>
  );
}
