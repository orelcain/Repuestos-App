import { useState, useRef, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getGlobalPDFCache } from '../../hooks/usePDFPreloader';
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
  Search,
  FileSearch,
  Hexagon,
  Undo2
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
  repuestos?: Repuesto[];
  onSelectRepuesto?: (repuesto: Repuesto) => void;
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
const MAX_SCALE = 5.0; // Aumentado para zoom más profundo
const SCALE_STEP = 0.15;

// Distancia mínima para cerrar polígono (en píxeles)
const POLYGON_CLOSE_DISTANCE = 15;

interface TextSearchResult {
  pageNum: number;
  text: string;
}

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
  const [forma, setForma] = useState<'circulo' | 'rectangulo' | 'poligono'>(existingMarker?.forma || 'rectangulo');
  const [color, setColor] = useState(existingMarker?.color || MARKER_COLORS[0].value);
  const [colorBorder, setColorBorder] = useState(MARKER_COLORS[0].border);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentMarker, setCurrentMarker] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null); // Se inicializa después de cargar el PDF

  // Estados para polígono
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>(
    existingMarker?.puntos || []
  );
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);
  const [hoveringFirstPoint, setHoveringFirstPoint] = useState(false);

  // Estado para mostrar/ocultar borde - SIN BORDE por defecto
  const [showBorder, setShowBorder] = useState(existingMarker?.sinBorde === false);

  // Estado de búsqueda de repuestos
  const [repuestoSearchTerm, setRepuestoSearchTerm] = useState('');
  const [repuestoSearchResults, setRepuestoSearchResults] = useState<Repuesto[]>([]);
  const [_showRepuestoSearch, _setShowRepuestoSearch] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);

  // Estado de búsqueda en PDF
  const [pdfSearchTerm, setPdfSearchTerm] = useState('');
  const [pdfSearchResults, setPdfSearchResults] = useState<TextSearchResult[]>([]);
  const [pdfSearching, setPdfSearching] = useState(false);
  const [currentPdfResultIndex, setCurrentPdfResultIndex] = useState(-1);

  // Estado de repuesto actual
  const [currentDescription, setCurrentDescription] = useState(repuestoDescripcion);

  // Cargar PDF - usar precargado si está disponible
  useEffect(() => {
    if (!pdfUrl) return;

    // Verificar si hay PDF precargado en cache global
    const cachedPDF = getGlobalPDFCache();
    
    if (cachedPDF && cachedPDF.url === pdfUrl) {
      console.log('[PDFMarkerEditor] Usando PDF precargado ⚡');
      setPdf(cachedPDF.pdf);
      setTotalPages(cachedPDF.pdf.numPages);
      setLoading(false);
      return;
    }

    // Cargar PDF normalmente si no hay cache
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
    if (!repuestoSearchTerm.trim() || repuestos.length === 0) {
      setRepuestoSearchResults([]);
      setSelectedSearchIndex(-1);
      return;
    }

    const term = repuestoSearchTerm.toLowerCase();
    const results = repuestos.filter(r => 
      r.codigoSAP?.toLowerCase().includes(term) ||
      r.codigoBaader?.toLowerCase().includes(term) ||
      r.textoBreve?.toLowerCase().includes(term) ||
      r.descripcion?.toLowerCase().includes(term)
    ).slice(0, 10);

    setRepuestoSearchResults(results);
    setSelectedSearchIndex(results.length > 0 ? 0 : -1);
  }, [repuestoSearchTerm, repuestos]);

  // Buscar texto en PDF
  const searchInPDF = useCallback(async (searchText: string) => {
    if (!pdf || !searchText.trim()) {
      setPdfSearchResults([]);
      return;
    }

    setPdfSearching(true);
    const results: TextSearchResult[] = [];
    const searchLower = searchText.toLowerCase();

    try {
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item): item is { str: string } & typeof item => 'str' in item)
          .map(item => item.str)
          .join(' ');

        if (pageText.toLowerCase().includes(searchLower)) {
          // Extraer contexto alrededor del texto encontrado
          const index = pageText.toLowerCase().indexOf(searchLower);
          const start = Math.max(0, index - 30);
          const end = Math.min(pageText.length, index + searchText.length + 30);
          const contextText = '...' + pageText.substring(start, end) + '...';
          
          results.push({
            pageNum,
            text: contextText
          });
        }
      }
    } catch (err) {
      console.error('Error buscando en PDF:', err);
    }

    setPdfSearchResults(results);
    setCurrentPdfResultIndex(results.length > 0 ? 0 : -1);
    
    // Ir a la primera página con resultado
    if (results.length > 0) {
      setCurrentPage(results[0].pageNum);
    }
    
    setPdfSearching(false);
  }, [pdf]);

  // Ir al siguiente/anterior resultado de búsqueda en PDF
  const goToNextPdfResult = () => {
    if (pdfSearchResults.length === 0) return;
    const nextIndex = (currentPdfResultIndex + 1) % pdfSearchResults.length;
    setCurrentPdfResultIndex(nextIndex);
    setCurrentPage(pdfSearchResults[nextIndex].pageNum);
  };

  const goToPrevPdfResult = () => {
    if (pdfSearchResults.length === 0) return;
    const prevIndex = currentPdfResultIndex === 0 ? pdfSearchResults.length - 1 : currentPdfResultIndex - 1;
    setCurrentPdfResultIndex(prevIndex);
    setCurrentPage(pdfSearchResults[prevIndex].pageNum);
  };

  // Dibujar polígono - función separada para polígonos
  const drawPolygon = useCallback((points: { x: number; y: number }[], isClosed: boolean, mousePos?: { x: number; y: number }) => {
    if (!overlayRef.current || points.length === 0) return;
    const ctx = overlayRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    
    // Dibujar líneas entre puntos
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    // Si hay posición del mouse, dibujar línea temporal
    if (mousePos && !isClosed) {
      ctx.lineTo(mousePos.x, mousePos.y);
    }
    
    // Si está cerrado, completar el path
    if (isClosed) {
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      if (showBorder) {
        ctx.strokeStyle = colorBorder;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else {
      // Líneas mientras se dibuja
      ctx.strokeStyle = colorBorder;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Dibujar puntos
    points.forEach((point, index) => {
      const isFirst = index === 0;
      const isHoveringFirst = isFirst && hoveringFirstPoint && points.length > 2;
      
      ctx.beginPath();
      ctx.arc(point.x, point.y, isHoveringFirst ? 10 : 6, 0, 2 * Math.PI);
      
      if (isFirst && points.length > 2 && !isClosed) {
        // Primer punto resaltado para cerrar
        ctx.fillStyle = isHoveringFirst ? '#22c55e' : '#f97316';
      } else {
        ctx.fillStyle = colorBorder;
      }
      ctx.fill();
      
      // Número del punto
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${index + 1}`, point.x, point.y);
    });
  }, [color, colorBorder, showBorder, hoveringFirstPoint]);

  // Dibujar marcador - SIN BORDE por defecto (declarado antes de renderPage)
  const drawMarker = useCallback((marker: { x: number; y: number; width: number; height: number }) => {
    if (!overlayRef.current) return;
    const ctx = overlayRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

    // Solo relleno de color, sin borde (se ve mejor)
    ctx.fillStyle = color;

    if (forma === 'rectangulo') {
      ctx.fillRect(marker.x, marker.y, marker.width, marker.height);
      if (showBorder) {
        ctx.strokeStyle = colorBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(marker.x, marker.y, marker.width, marker.height);
      }
    } else if (forma === 'circulo') {
      const centerX = marker.x + marker.width / 2;
      const centerY = marker.y + marker.height / 2;
      const radiusX = Math.abs(marker.width) / 2;
      const radiusY = Math.abs(marker.height) / 2;

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.fill();
      if (showBorder) {
        ctx.strokeStyle = colorBorder;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [forma, color, colorBorder, showBorder]);

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

    if (overlayRef.current) {
      overlayRef.current.height = viewport.height;
      overlayRef.current.width = viewport.width;
    }

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Dibujar marcador o polígono según la forma
    if (forma === 'poligono' && polygonPoints.length > 0) {
      drawPolygon(polygonPoints, isPolygonClosed);
    } else if (currentMarker) {
      drawMarker(currentMarker);
    }
  }, [pdf, scale, currentMarker, drawMarker, forma, polygonPoints, isPolygonClosed, drawPolygon]);

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, renderPage]);

  // Cargar marcador existente cuando el PDF esté listo y convertir coordenadas normalizadas
  useEffect(() => {
    if (!pdf || !existingMarker?.coordenadas || !canvasRef.current) return;
    
    const loadExistingMarker = async () => {
      const page = await pdf.getPage(existingMarker.pagina);
      const viewport = page.getViewport({ scale });
      
      const { x, y, width, height } = existingMarker.coordenadas!;
      
      // Determinar si son coordenadas normalizadas (0-1) o absolutas
      const isNormalized = x <= 1 && y <= 1 && width <= 1 && height <= 1;
      
      if (isNormalized) {
        // Convertir de normalizado a píxeles
        setCurrentMarker({
          x: x * viewport.width,
          y: y * viewport.height,
          width: width * viewport.width,
          height: height * viewport.height
        });
      } else {
        // Coordenadas antiguas (píxeles) - escalar según zoom
        setCurrentMarker({
          x: x * scale,
          y: y * scale,
          width: width * scale,
          height: height * scale
        });
      }
    };
    
    loadExistingMarker();
  }, [pdf, scale, existingMarker]);

  // Calcular distancia entre dos puntos
  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Eventos de dibujo - para rectángulo y círculo
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (forma === 'poligono') {
      // Modo polígono: agregar punto
      if (isPolygonClosed) {
        // Si ya está cerrado, limpiar y empezar de nuevo
        setPolygonPoints([{ x, y }]);
        setIsPolygonClosed(false);
        return;
      }
      
      // Verificar si estamos cerca del primer punto para cerrar
      if (polygonPoints.length > 2) {
        const firstPoint = polygonPoints[0];
        if (getDistance({ x, y }, firstPoint) < POLYGON_CLOSE_DISTANCE) {
          // Cerrar polígono
          setIsPolygonClosed(true);
          drawPolygon(polygonPoints, true);
          return;
        }
      }
      
      // Agregar nuevo punto
      const newPoints = [...polygonPoints, { x, y }];
      setPolygonPoints(newPoints);
      drawPolygon(newPoints, false);
    } else {
      // Modo rectángulo/círculo
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentMarker(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (forma === 'poligono' && polygonPoints.length > 0 && !isPolygonClosed) {
      // Verificar si estamos cerca del primer punto
      const firstPoint = polygonPoints[0];
      const isNearFirst = polygonPoints.length > 2 && getDistance({ x, y }, firstPoint) < POLYGON_CLOSE_DISTANCE;
      setHoveringFirstPoint(isNearFirst);
      
      // Dibujar línea temporal al mouse
      drawPolygon(polygonPoints, false, { x, y });
    } else if (forma !== 'poligono' && isDrawing && startPoint && overlayRef.current) {
      const marker = {
        x: Math.min(startPoint.x, x),
        y: Math.min(startPoint.y, y),
        width: Math.abs(x - startPoint.x),
        height: Math.abs(y - startPoint.y)
      };
      setCurrentMarker(marker);
      drawMarker(marker);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setStartPoint(null);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (forma === 'poligono') {
      if (isPolygonClosed) {
        setPolygonPoints([{ x, y }]);
        setIsPolygonClosed(false);
        return;
      }
      
      if (polygonPoints.length > 2) {
        const firstPoint = polygonPoints[0];
        if (getDistance({ x, y }, firstPoint) < POLYGON_CLOSE_DISTANCE * 1.5) {
          setIsPolygonClosed(true);
          drawPolygon(polygonPoints, true);
          return;
        }
      }
      
      const newPoints = [...polygonPoints, { x, y }];
      setPolygonPoints(newPoints);
      drawPolygon(newPoints, false);
    } else {
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentMarker(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (forma === 'poligono') return; // No hacer nada en modo polígono
    
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

  // Deshacer último punto del polígono
  const undoLastPoint = () => {
    if (polygonPoints.length > 0) {
      const newPoints = polygonPoints.slice(0, -1);
      setPolygonPoints(newPoints);
      setIsPolygonClosed(false);
      if (newPoints.length > 0) {
        drawPolygon(newPoints, false);
      } else {
        // Limpiar canvas overlay
        const ctx = overlayRef.current?.getContext('2d');
        if (ctx && overlayRef.current) {
          ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
        }
      }
    }
  };

  // Zoom con rueda - ahora funciona sin Ctrl también
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
  };

  // Pinch zoom
  const lastTouchDistance = useRef<number | null>(null);
  const handleContainerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
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
    setRepuestoSearchTerm('');
    _setShowRepuestoSearch(false);
    setCurrentMarker(null);
    
    if (overlayRef.current) {
      const ctx = overlayRef.current.getContext('2d');
      ctx?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
    
    if (onSelectRepuesto) {
      onSelectRepuesto(repuesto);
    }
  };

  // Keyboard navigation
  const _handleRepuestoSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!repuestoSearchResults.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex(prev => prev < repuestoSearchResults.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter' && selectedSearchIndex >= 0) {
      e.preventDefault();
      handleSelectSearchResult(repuestoSearchResults[selectedSearchIndex]);
    } else if (e.key === 'Escape') {
      _setShowRepuestoSearch(false);
    }
  };

  // Guardar marcador con coordenadas NORMALIZADAS (0-1)
  const handleSave = () => {
    if (!canvasRef.current) return;
    
    // Obtener dimensiones del canvas actual
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
    
    if (forma === 'poligono') {
      // Guardar polígono
      if (!isPolygonClosed || polygonPoints.length < 3) {
        return; // No guardar si no está cerrado o no tiene suficientes puntos
      }
      
      // Normalizar puntos (0-1)
      const normalizedPoints = polygonPoints.map(point => ({
        x: point.x / canvasWidth,
        y: point.y / canvasHeight
      }));
      
      // Calcular bounding box para compatibilidad
      const xs = polygonPoints.map(p => p.x);
      const ys = polygonPoints.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      
      const normalizedCoords = {
        x: minX / canvasWidth,
        y: minY / canvasHeight,
        width: (maxX - minX) / canvasWidth,
        height: (maxY - minY) / canvasHeight
      };
      
      onSave({
        pagina: currentPage,
        coordenadas: normalizedCoords,
        puntos: normalizedPoints,
        forma: 'poligono',
        color,
        descripcion: `Marcador en página ${currentPage}`,
        sinBorde: !showBorder
      });
    } else {
      // Guardar rectángulo o círculo
      if (!currentMarker) return;
      
      // Convertir coordenadas de píxeles a coordenadas normalizadas (0-1)
      const normalizedCoords = {
        x: currentMarker.x / canvasWidth,
        y: currentMarker.y / canvasHeight,
        width: currentMarker.width / canvasWidth,
        height: currentMarker.height / canvasHeight
      };
      
      onSave({
        pagina: currentPage,
        coordenadas: normalizedCoords,
        forma,
        color,
        descripcion: `Marcador en página ${currentPage}`,
        sinBorde: !showBorder
      });
    }
  };

  // Verificar si se puede guardar
  const canSave = forma === 'poligono' 
    ? isPolygonClosed && polygonPoints.length >= 3
    : currentMarker !== null;

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
      <div className="px-4 py-2 bg-gray-900 text-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Marcar en Manual</h3>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Búsqueda en PDF - compacta */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={pdfSearchTerm}
              onChange={(e) => setPdfSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchInPDF(pdfSearchTerm);
                }
              }}
              placeholder="Buscar en PDF (ej: 200.1234, Baader)..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={() => searchInPDF(pdfSearchTerm)}
            disabled={pdfSearching || !pdfSearchTerm.trim()}
            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {pdfSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {/* Resultados de búsqueda en PDF - compactos */}
        {pdfSearchResults.length > 0 && (
          <div className="bg-gray-700 rounded-lg p-2 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">
                {pdfSearchResults.length} resultado(s) - Pág. {pdfSearchResults[currentPdfResultIndex]?.pageNum}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPrevPdfResult}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs">
                  {currentPdfResultIndex + 1}/{pdfSearchResults.length}
                </span>
                <button
                  onClick={goToNextPdfResult}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {pdfSearchTerm && !pdfSearching && pdfSearchResults.length === 0 && (
          <p className="text-xs text-amber-400 mb-2">
            No se encontró "{pdfSearchTerm}" en el PDF
          </p>
        )}
        
        {/* Repuesto actual */}
        <p className="text-xs text-gray-400 truncate">
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
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Forma */}
        <div className="flex items-center gap-1 bg-gray-600 rounded p-1">
          <button
            onClick={() => {
              setForma('rectangulo');
              setPolygonPoints([]);
              setIsPolygonClosed(false);
            }}
            className={`p-2 rounded ${forma === 'rectangulo' ? 'bg-primary-600' : 'hover:bg-gray-500'}`}
            title="Rectángulo"
          >
            <Square className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setForma('circulo');
              setPolygonPoints([]);
              setIsPolygonClosed(false);
            }}
            className={`p-2 rounded ${forma === 'circulo' ? 'bg-primary-600' : 'hover:bg-gray-500'}`}
            title="Círculo/Elipse"
          >
            <Circle className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setForma('poligono');
              setCurrentMarker(null);
              setPolygonPoints([]);
              setIsPolygonClosed(false);
            }}
            className={`p-2 rounded ${forma === 'poligono' ? 'bg-primary-600' : 'hover:bg-gray-500'}`}
            title="Polígono (puntos)"
          >
            <Hexagon className="w-5 h-5" />
          </button>
          
          {/* Botón deshacer para polígono */}
          {forma === 'poligono' && polygonPoints.length > 0 && (
            <button
              onClick={undoLastPoint}
              className="p-2 rounded bg-amber-600 hover:bg-amber-500 ml-1"
              title="Deshacer último punto"
            >
              <Undo2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Info polígono */}
        {forma === 'poligono' && (
          <div className="text-xs text-gray-300 flex items-center gap-2">
            <span className="bg-gray-600 px-2 py-1 rounded">
              {polygonPoints.length} punto{polygonPoints.length !== 1 ? 's' : ''}
            </span>
            {isPolygonClosed && (
              <span className="bg-green-600 px-2 py-1 rounded">✓ Cerrado</span>
            )}
          </div>
        )}

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

        {/* Toggle borde */}
        <button
          onClick={() => {
            const newShowBorder = !showBorder;
            setShowBorder(newShowBorder);
            // Refrescar dibujo
            if (forma === 'poligono' && polygonPoints.length > 0) {
              setTimeout(() => drawPolygon(polygonPoints, isPolygonClosed), 0);
            } else if (currentMarker) {
              setTimeout(() => drawMarker(currentMarker), 0);
            }
          }}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            showBorder 
              ? 'bg-gray-600 text-white hover:bg-gray-500' 
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
          title={showBorder ? 'Ocultar borde' : 'Sin borde (solo relleno)'}
        >
          {showBorder ? '⬜ Con borde' : '🟦 Sin borde'}
        </button>

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(prev => Math.max(MIN_SCALE, prev - SCALE_STEP))}
            className="p-2 rounded hover:bg-gray-600"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm w-14 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(prev => Math.min(MAX_SCALE, prev + SCALE_STEP))}
            className="p-2 rounded hover:bg-gray-600"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="px-4 py-2 bg-primary-600 text-white text-sm flex items-center justify-between flex-wrap gap-2">
        <span>
          {forma === 'poligono' 
            ? (isPolygonClosed 
                ? '✓ Polígono cerrado - Listo para guardar' 
                : `Haz clic para agregar puntos${polygonPoints.length > 2 ? ' (clic en punto 1 para cerrar)' : ''}`)
            : `Dibuja un ${forma === 'rectangulo' ? 'rectángulo' : 'círculo'} sobre el repuesto`
          }
        </span>
        <span className="text-primary-200 text-xs hidden sm:block">💡 Scroll para zoom</span>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex items-start justify-center p-4"
        onWheel={handleWheel}
        onTouchMove={handleContainerTouchMove}
        onTouchEnd={handleContainerTouchEnd}
      >
        <div className="relative inline-block">
          <canvas ref={canvasRef} className="bg-white shadow-lg" />
          <canvas
            ref={overlayRef}
            className="absolute top-0 left-0"
            style={{ cursor: forma === 'poligono' ? 'pointer' : 'crosshair' }}
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

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-900 flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-400">
          {canSave 
            ? '✓ Marcador listo - Puedes guardar' 
            : forma === 'poligono' 
              ? `Agrega al menos 3 puntos y cierra el polígono (${polygonPoints.length} puntos)`
              : 'Dibuja el marcador en el PDF'
          }
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
            disabled={!canSave}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-5 h-5" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
