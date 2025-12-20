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
  Loader2,
  X,
  ChevronUp,
  ChevronDown,
  Edit3,
  Trash2,
  Plus,
  MapPin
} from 'lucide-react';
import { VinculoManual } from '../../types';

// Configurar worker de PDF.js - usando versión específica estable
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl: string | null;
  targetPage?: number;
  marker?: VinculoManual;
  onCapture?: (imageData: string, pageNumber: number) => void;
  onEditMarker?: (marker: VinculoManual) => void;
  onDeleteMarker?: (marker: VinculoManual) => void;
  onAddMarker?: () => void;
}

export function PDFViewer({ 
  pdfUrl, 
  targetPage,
  marker,
  onCapture,
  onEditMarker,
  onDeleteMarker,
  onAddMarker
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Detectar si es móvil/PWA
  const isMobile = typeof window !== 'undefined' && (
    window.matchMedia('(max-width: 1024px)').matches || 
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
  
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  // Zoom inicial: 50% en móvil, 100% en desktop
  const [scale, setScale] = useState(isMobile ? 0.5 : 1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [captureMode, setCaptureMode] = useState(false);
  
  // Estados para pinch-to-zoom
  const lastTouchDistance = useRef<number | null>(null);
  const initialScale = useRef<number>(isMobile ? 0.5 : 1.0);
  
  // Estados para búsqueda de texto en PDF
  const [textSearchQuery, setTextSearchQuery] = useState('');
  const [textSearchResults, setTextSearchResults] = useState<{pageNum: number; text: string; matches: number}[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [highlightPositions, setHighlightPositions] = useState<{x: number; y: number; width: number; height: number}[]>([]);
  const [allPagesText, setAllPagesText] = useState<Map<number, {text: string; items: {str: string; transform: number[]}[]}>>(new Map());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        
        // Precargar texto de todas las páginas para búsqueda rápida
        preloadAllPagesText(pdfDoc);
      })
      .catch((err) => {
        console.error('Error al cargar PDF:', err);
        setError('No se pudo cargar el manual PDF');
        setLoading(false);
      });
  }, [pdfUrl]);

  // Precargar texto de todas las páginas
  const preloadAllPagesText = async (pdfDoc: pdfjsLib.PDFDocumentProxy) => {
    const textMap = new Map<number, {text: string; items: {str: string; transform: number[]}[]}>();
    
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const items = textContent.items
          .filter((item): item is { str: string; transform: number[] } & typeof item => 'str' in item && 'transform' in item)
          .map(item => ({ str: item.str, transform: item.transform as number[] }));
        
        // Unir texto de forma inteligente (sin espacios extra entre caracteres)
        let fullText = '';
        let lastX = -1;
        
        for (const item of items) {
          const x = item.transform[4];
          // Si hay un salto grande en X, agregar espacio
          if (lastX !== -1 && x - lastX > 10) {
            fullText += ' ';
          }
          fullText += item.str;
          lastX = x + (item.str.length * 5); // Aproximación del ancho
        }
        
        textMap.set(pageNum, { text: fullText, items });
      } catch (err) {
        console.error(`Error cargando texto de página ${pageNum}:`, err);
      }
    }
    
    setAllPagesText(textMap);
  };

  // Atajo de teclado Ctrl+F para buscar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchPanel(true);
      }
      if (e.key === 'Escape' && showSearchPanel) {
        setShowSearchPanel(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearchPanel]);

  // Navegar a página específica cuando cambia targetPage O cuando el PDF termina de cargar
  useEffect(() => {
    if (targetPage && targetPage > 0 && totalPages > 0 && targetPage <= totalPages) {
      setCurrentPage(targetPage);
    }
  }, [targetPage, totalPages]);
  
  // Cuando el PDF carga por primera vez, ir a targetPage si existe
  useEffect(() => {
    if (!loading && pdf && targetPage && targetPage > 0 && targetPage <= totalPages) {
      setCurrentPage(targetPage);
    }
  }, [loading, pdf, targetPage, totalPages]);

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
          
          // Determinar si las coordenadas son normalizadas (0-1) o absolutas
          // Si x,y,width,height son todos <= 1, son normalizadas
          const isNormalized = x <= 1 && y <= 1 && width <= 1 && height <= 1;
          
          let pixelX, pixelY, pixelWidth, pixelHeight;
          
          if (isNormalized) {
            // Convertir coordenadas normalizadas a píxeles según el viewport actual
            pixelX = x * viewport.width;
            pixelY = y * viewport.height;
            pixelWidth = width * viewport.width;
            pixelHeight = height * viewport.height;
          } else {
            // Coordenadas absolutas antiguas - escalar según el zoom
            pixelX = x * scale;
            pixelY = y * scale;
            pixelWidth = width * scale;
            pixelHeight = height * scale;
          }
          
          // Solo relleno de color, sin borde (se ve mejor)
          ctx.fillStyle = marker.color || 'rgba(239, 68, 68, 0.4)';

          if (marker.forma === 'circulo') {
            const centerX = pixelX + pixelWidth / 2;
            const centerY = pixelY + pixelHeight / 2;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, pixelWidth / 2, pixelHeight / 2, 0, 0, 2 * Math.PI);
            ctx.fill();
            // Solo dibujar borde si no está desactivado
            if (!marker.sinBorde) {
              ctx.strokeStyle = marker.color?.replace('0.4', '0.8') || '#ef4444';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          } else {
            ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
            // Solo dibujar borde si no está desactivado
            if (!marker.sinBorde) {
              ctx.strokeStyle = marker.color?.replace('0.4', '0.8') || '#ef4444';
              ctx.lineWidth = 2;
              ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
            }
          }
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
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25));
  
  // Pinch-to-zoom handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      lastTouchDistance.current = distance;
      initialScale.current = scale;
    }
  }, [scale]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scaleChange = distance / lastTouchDistance.current;
      const newScale = Math.min(Math.max(initialScale.current * scaleChange, 0.25), 3);
      setScale(newScale);
    }
  }, []);
  
  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
  }, []);

  // Búsqueda por página
  const handleSearch = () => {
    const pageNum = parseInt(searchInput);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setSearchInput('');
    }
  };

  // Búsqueda en tiempo real mientras escribe
  const searchTextInPDF = useCallback((query: string) => {
    if (!query.trim() || query.length < 1) {
      setTextSearchResults([]);
      setCurrentResultIndex(-1);
      setHighlightPositions([]);
      return;
    }
    
    setIsSearching(true);
    
    const results: {pageNum: number; text: string; matches: number}[] = [];
    const searchLower = query.toLowerCase().trim();
    // También buscar sin espacios para manejar texto fragmentado
    const searchNoSpaces = searchLower.replace(/\s+/g, '');

    allPagesText.forEach((pageData, pageNum) => {
      const pageTextLower = pageData.text.toLowerCase();
      const pageTextNoSpaces = pageTextLower.replace(/\s+/g, '');
      
      // Buscar de múltiples formas
      let found = false;
      let matchCount = 0;
      
      // Búsqueda normal
      if (pageTextLower.includes(searchLower)) {
        found = true;
        matchCount = (pageTextLower.match(new RegExp(searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      }
      
      // Búsqueda sin espacios (para texto fragmentado)
      if (!found && searchNoSpaces.length >= 2 && pageTextNoSpaces.includes(searchNoSpaces)) {
        found = true;
        matchCount = (pageTextNoSpaces.match(new RegExp(searchNoSpaces.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      }

      if (found) {
        // Extraer contexto
        const index = pageTextLower.indexOf(searchLower) !== -1 
          ? pageTextLower.indexOf(searchLower)
          : pageTextNoSpaces.indexOf(searchNoSpaces);
        const start = Math.max(0, index - 30);
        const end = Math.min(pageData.text.length, index + query.length + 30);
        const contextText = (start > 0 ? '...' : '') + pageData.text.substring(start, end) + (end < pageData.text.length ? '...' : '');
        
        results.push({
          pageNum,
          text: contextText,
          matches: matchCount
        });
      }
    });

    // Ordenar por número de coincidencias
    results.sort((a, b) => b.matches - a.matches);

    setTextSearchResults(results);
    setCurrentResultIndex(results.length > 0 ? 0 : -1);
    setIsSearching(false);
    
    // Si hay resultados, ir al primero
    if (results.length > 0) {
      setCurrentPage(results[0].pageNum);
    }
  }, [allPagesText]);

  // Efecto para búsqueda en tiempo real con debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (textSearchQuery.length >= 1) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTextInPDF(textSearchQuery);
      }, 150); // 150ms de debounce
    } else {
      setTextSearchResults([]);
      setHighlightPositions([]);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [textSearchQuery, searchTextInPDF]);

  // Resaltar texto encontrado en el canvas
  useEffect(() => {
    if (!overlayRef.current || !pdf || !textSearchQuery.trim()) {
      setHighlightPositions([]);
      return;
    }
    
    const highlightText = async () => {
      const pageData = allPagesText.get(currentPage);
      if (!pageData) return;
      
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const textContent = await page.getTextContent();
      
      const searchLower = textSearchQuery.toLowerCase().trim();
      const positions: {x: number; y: number; width: number; height: number}[] = [];
      
      // Buscar en cada item de texto
      textContent.items.forEach((item) => {
        if (!('str' in item) || !('transform' in item)) return;
        const textItem = item as { str: string; transform: number[]; width?: number; height?: number };
        
        if (textItem.str.toLowerCase().includes(searchLower)) {
          const [, , , , x, y] = textItem.transform;
          const width = textItem.width || textItem.str.length * 8;
          const height = textItem.height || 12;
          
          // Transformar coordenadas al viewport
          const tx = x * scale;
          const ty = viewport.height - (y * scale) - (height * scale);
          
          positions.push({
            x: tx,
            y: ty,
            width: width * scale,
            height: height * scale * 1.2
          });
        }
      });
      
      setHighlightPositions(positions);
    };
    
    highlightText();
  }, [currentPage, textSearchQuery, pdf, scale, allPagesText]);

  // Dibujar resaltados en el overlay
  useEffect(() => {
    if (!overlayRef.current) return;
    
    const ctx = overlayRef.current.getContext('2d');
    if (!ctx) return;
    
    // No limpiar si hay marcador activo
    if (!marker || marker.pagina !== currentPage) {
      ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
    
    // Dibujar resaltados de búsqueda
    if (highlightPositions.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
      ctx.lineWidth = 2;
      
      highlightPositions.forEach(pos => {
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
        ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
      });
    }
  }, [highlightPositions, marker, currentPage]);

  // Navegar entre resultados de búsqueda
  const goToNextResult = () => {
    if (textSearchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % textSearchResults.length;
    setCurrentResultIndex(nextIndex);
    setCurrentPage(textSearchResults[nextIndex].pageNum);
  };

  const goToPrevResult = () => {
    if (textSearchResults.length === 0) return;
    const prevIndex = currentResultIndex <= 0 ? textSearchResults.length - 1 : currentResultIndex - 1;
    setCurrentResultIndex(prevIndex);
    setCurrentPage(textSearchResults[prevIndex].pageNum);
  };

  // Capturar imagen de área actual
  const handleCapture = () => {
    if (!canvasRef.current || !onCapture) return;
    
    const imageData = canvasRef.current.toDataURL('image/png');
    onCapture(imageData, currentPage);
    setCaptureMode(false);
  };

  // Fullscreen - mejorado para móvil
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      // Intentar diferentes APIs de fullscreen para compatibilidad
      const elem = containerRef.current as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        msRequestFullscreen?: () => void;
      };
      
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      const doc = document as Document & {
        webkitExitFullscreen?: () => Promise<void>;
        msExitFullscreen?: () => void;
      };
      
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };
  
  // Escuchar cambios de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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

          {/* Botón buscar texto en PDF */}
          <button
            onClick={() => setShowSearchPanel(!showSearchPanel)}
            className={`p-2 rounded transition-colors ${
              showSearchPanel ? 'bg-primary-600' : 'hover:bg-gray-700'
            }`}
            title="Buscar texto en PDF (Ctrl+F)"
          >
            <Search className="w-5 h-5" />
          </button>

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

      {/* Panel de búsqueda de texto en PDF - Búsqueda en tiempo real */}
      {showSearchPanel && (
        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 relative">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="flex items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={textSearchQuery}
                    onChange={(e) => setTextSearchQuery(e.target.value)}
                    placeholder="Buscar en el PDF... (ej: 200, 1-0201, Baader)"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-700 rounded-l-lg border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    autoFocus
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 animate-spin" />
                  )}
                </div>
                
                {/* Contador de resultados inline */}
                {textSearchQuery && !isSearching && (
                  <div className={`px-3 py-2.5 text-sm border-y border-gray-600 ${
                    textSearchResults.length > 0 ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                  }`}>
                    {textSearchResults.length > 0 
                      ? `${textSearchResults.length} pág${textSearchResults.length > 1 ? 's' : ''}`
                      : '0'
                    }
                  </div>
                )}
                
                {/* Navegación rápida */}
                {textSearchResults.length > 0 && (
                  <div className="flex border border-gray-600 border-l-0 rounded-r-lg overflow-hidden">
                    <button
                      onClick={goToPrevResult}
                      className="p-2.5 bg-gray-700 hover:bg-gray-600 text-white border-r border-gray-600"
                      title="Anterior (↑)"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={goToNextResult}
                      className="p-2.5 bg-gray-700 hover:bg-gray-600 text-white"
                      title="Siguiente (↓)"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {!textSearchResults.length && textSearchQuery && !isSearching && (
                  <div className="px-3 py-2.5 bg-gray-700 rounded-r-lg border border-l-0 border-gray-600">
                    <span className="text-gray-500 text-sm">—</span>
                  </div>
                )}
              </div>
              
              {/* Dropdown dinámico con resultados */}
              {textSearchQuery && textSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  <div className="p-2 text-xs text-gray-400 border-b border-gray-700 flex items-center justify-between">
                    <span>📄 {textSearchResults.length} página{textSearchResults.length > 1 ? 's' : ''} con resultados</span>
                    <span className="text-yellow-400">🔍 Resaltado activo</span>
                  </div>
                  {textSearchResults.map((result, index) => (
                    <button
                      key={`${result.pageNum}-${index}`}
                      onClick={() => {
                        setCurrentResultIndex(index);
                        setCurrentPage(result.pageNum);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm border-b border-gray-700 last:border-b-0 transition-colors ${
                        index === currentResultIndex 
                          ? 'bg-primary-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Página {result.pageNum}</span>
                        {result.matches > 1 && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            index === currentResultIndex ? 'bg-primary-700' : 'bg-gray-600'
                          }`}>
                            {result.matches} coincidencias
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1 opacity-70 truncate">{result.text}</p>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Mensaje de no resultados */}
              {textSearchQuery && textSearchResults.length === 0 && !isSearching && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 p-4 text-center">
                  <p className="text-yellow-400 text-sm">⚠️ No se encontró "{textSearchQuery}"</p>
                  <p className="text-gray-500 text-xs mt-1">Prueba con otro término o revisa la ortografía</p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                setShowSearchPanel(false);
                setTextSearchQuery('');
                setTextSearchResults([]);
                setCurrentResultIndex(-1);
                setHighlightPositions([]);
              }}
              className="p-2 text-gray-400 hover:text-white rounded hover:bg-gray-700"
              title="Cerrar búsqueda (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Indicador de página actual */}
          {textSearchResults.length > 0 && currentResultIndex >= 0 && (
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-gray-400">
                Resultado {currentResultIndex + 1} de {textSearchResults.length} • Página {textSearchResults[currentResultIndex]?.pageNum}
              </span>
              <span className="text-yellow-400 flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-400/40 border border-yellow-500 rounded-sm"></span>
                Texto resaltado en amarillo
              </span>
            </div>
          )}
        </div>
      )}

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

      {/* Barra de marcador con opciones de editar/eliminar/agregar */}
      {(marker || onAddMarker) && (
        <div className="px-4 py-2 bg-gray-700 text-white text-sm flex items-center justify-between">
          {marker && marker.pagina === currentPage ? (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium">Marcador en esta página</span>
              </div>
              <div className="flex items-center gap-2">
                {onEditMarker && (
                  <button
                    onClick={() => onEditMarker(marker)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    Editar
                  </button>
                )}
                {onDeleteMarker && (
                  <button
                    onClick={() => {
                      if (confirm('¿Eliminar este marcador?')) {
                        onDeleteMarker(marker);
                      }
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Eliminar
                  </button>
                )}
              </div>
            </>
          ) : marker ? (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400">Marcador en página {marker.pagina}</span>
                <button
                  onClick={() => setCurrentPage(marker.pagina)}
                  className="px-2 py-0.5 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                >
                  Ir al marcador
                </button>
              </div>
              <div className="flex items-center gap-2">
                {onEditMarker && (
                  <button
                    onClick={() => onEditMarker(marker)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    Editar
                  </button>
                )}
                {onDeleteMarker && (
                  <button
                    onClick={() => {
                      if (confirm('¿Eliminar este marcador?')) {
                        onDeleteMarker(marker);
                      }
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Eliminar
                  </button>
                )}
              </div>
            </>
          ) : onAddMarker ? (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Sin marcador</span>
              </div>
              <button
                onClick={onAddMarker}
                className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Agregar marcador
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Canvas Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto pdf-container flex items-start justify-center p-4 touch-pan-x touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-x pan-y' }}
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

      {/* Indicador de navegación - diferente para móvil */}
      <div className="px-4 py-1 bg-gray-900 text-gray-400 text-xs text-center">
        {isMobile ? (
          <span>📱 Pellizca para zoom • Desliza para navegar</span>
        ) : (
          <span>💡 Usa la rueda del ratón para navegar entre páginas</span>
        )}
      </div>
    </div>
  );
}
