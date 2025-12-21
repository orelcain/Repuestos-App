import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PDFPreloaderState {
  pdf: pdfjsLib.PDFDocumentProxy | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  totalPages: number;
  textContent: Map<number, { text: string; items: { str: string; transform: number[] }[] }>;
}

interface UsePDFPreloaderReturn extends PDFPreloaderState {
  preloadPDF: (url: string) => void;
  isReady: boolean;
}

/**
 * Hook para precargar el PDF del manual en segundo plano
 * después de un delay para no afectar la carga inicial de la app
 */
export function usePDFPreloader(pdfUrl: string | null, delayMs: number = 3000): UsePDFPreloaderReturn {
  const [state, setState] = useState<PDFPreloaderState>({
    pdf: null,
    loading: false,
    loaded: false,
    error: null,
    totalPages: 0,
    textContent: new Map()
  });
  
  const hasStartedLoading = useRef(false);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Precargar texto de todas las páginas
  const preloadAllPagesText = useCallback(async (pdfDoc: pdfjsLib.PDFDocumentProxy) => {
    const textMap = new Map<number, { text: string; items: { str: string; transform: number[] }[] }>();
    
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const items = textContent.items
          .filter((item): item is { str: string; transform: number[] } & typeof item => 
            'str' in item && 'transform' in item
          )
          .map(item => ({ str: item.str, transform: item.transform as number[] }));
        
        // Unir texto de forma inteligente
        let fullText = '';
        let lastX = -1;
        
        for (const item of items) {
          const x = item.transform[4];
          if (lastX !== -1 && x - lastX > 10) {
            fullText += ' ';
          }
          fullText += item.str;
          lastX = x + (item.str.length * 5);
        }
        
        textMap.set(pageNum, { text: fullText, items });
      } catch (err) {
        console.error(`Error precargando texto de página ${pageNum}:`, err);
      }
    }
    
    return textMap;
  }, []);

  // Función de precarga manual
  const preloadPDF = useCallback(async (url: string) => {
    if (state.loaded || state.loading) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('[PDFPreloader] Iniciando precarga del manual...');
      const startTime = performance.now();
      
      const pdfDoc = await pdfjsLib.getDocument(url).promise;
      
      const loadTime = performance.now() - startTime;
      console.log(`[PDFPreloader] PDF cargado en ${loadTime.toFixed(0)}ms (${pdfDoc.numPages} páginas)`);
      
      // Precargar texto para búsqueda rápida
      const textContent = await preloadAllPagesText(pdfDoc);
      console.log(`[PDFPreloader] Texto precargado para ${textContent.size} páginas`);
      
      setState({
        pdf: pdfDoc,
        loading: false,
        loaded: true,
        error: null,
        totalPages: pdfDoc.numPages,
        textContent
      });
      
    } catch (err) {
      console.error('[PDFPreloader] Error al precargar PDF:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error al precargar el manual PDF'
      }));
    }
  }, [state.loaded, state.loading, preloadAllPagesText]);

  // Iniciar precarga automática después del delay
  useEffect(() => {
    if (!pdfUrl || hasStartedLoading.current) return;
    
    preloadTimeoutRef.current = setTimeout(() => {
      hasStartedLoading.current = true;
      preloadPDF(pdfUrl);
    }, delayMs);
    
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [pdfUrl, delayMs, preloadPDF]);

  return {
    ...state,
    preloadPDF,
    isReady: state.loaded && !state.error
  };
}

// Singleton global para mantener el PDF cargado entre re-renders
let globalPDFCache: {
  url: string;
  pdf: pdfjsLib.PDFDocumentProxy;
  textContent: Map<number, { text: string; items: { str: string; transform: number[] }[] }>;
} | null = null;

export function getGlobalPDFCache() {
  return globalPDFCache;
}

export function setGlobalPDFCache(
  url: string,
  pdf: pdfjsLib.PDFDocumentProxy,
  textContent: Map<number, { text: string; items: { str: string; transform: number[] }[] }>
) {
  globalPDFCache = { url, pdf, textContent };
}

export function clearGlobalPDFCache() {
  globalPDFCache = null;
}
