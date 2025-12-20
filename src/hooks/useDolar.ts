import { useState, useEffect, useCallback } from 'react';

interface DolarData {
  valor: number;
  fecha: string;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

interface MindicadorResponse {
  version: string;
  autor: string;
  fecha: string;
  dolar: {
    codigo: string;
    nombre: string;
    unidad_medida: string;
    fecha: string;
    valor: number;
  };
}

const CACHE_KEY = 'dolar_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora en milliseconds

interface CachedData {
  valor: number;
  fecha: string;
  timestamp: number;
}

export function useDolar() {
  const [data, setData] = useState<DolarData>({
    valor: 0,
    fecha: '',
    loading: true,
    error: null,
    lastUpdate: null
  });

  // Cargar desde cache local
  const loadFromCache = useCallback((): CachedData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as CachedData;
        const now = Date.now();
        // Verificar si el cache es válido (menos de 1 hora)
        if (now - parsed.timestamp < CACHE_DURATION) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading dolar cache:', e);
    }
    return null;
  }, []);

  // Guardar en cache local
  const saveToCache = useCallback((valor: number, fecha: string) => {
    try {
      const cacheData: CachedData = {
        valor,
        fecha,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.error('Error saving dolar cache:', e);
    }
  }, []);

  // Obtener tipo de cambio desde la API
  const fetchDolar = useCallback(async (forceRefresh = false) => {
    // Primero intentar cargar desde cache (si no es forzado)
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        setData({
          valor: cached.valor,
          fecha: cached.fecha,
          loading: false,
          error: null,
          lastUpdate: new Date(cached.timestamp)
        });
        return;
      }
    }

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // API de mindicador.cl - gratuita y sin autenticación
      const response = await fetch('https://mindicador.cl/api/dolar');
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result: MindicadorResponse = await response.json();
      
      if (result.dolar && result.dolar.valor) {
        const valor = result.dolar.valor;
        const fecha = result.dolar.fecha;
        
        // Guardar en cache
        saveToCache(valor, fecha);
        
        setData({
          valor,
          fecha,
          loading: false,
          error: null,
          lastUpdate: new Date()
        });
      } else {
        throw new Error('Respuesta inválida de la API');
      }
    } catch (error) {
      console.error('Error fetching dolar:', error);
      
      // Si falla, intentar usar cache aunque esté expirado
      const cached = loadFromCache();
      if (cached) {
        setData({
          valor: cached.valor,
          fecha: cached.fecha,
          loading: false,
          error: 'Usando valor en caché (sin conexión)',
          lastUpdate: new Date(cached.timestamp)
        });
      } else {
        setData({
          valor: 0,
          fecha: '',
          loading: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
          lastUpdate: null
        });
      }
    }
  }, [loadFromCache, saveToCache]);

  // Cargar al montar
  useEffect(() => {
    fetchDolar();
  }, [fetchDolar]);

  // Función para convertir USD a CLP
  const convertToClp = useCallback((usd: number): number => {
    if (!data.valor || data.valor === 0) return 0;
    return Math.round(usd * data.valor);
  }, [data.valor]);

  // Función para formatear CLP
  const formatClp = useCallback((clp: number): string => {
    return clp.toLocaleString('es-CL', { 
      style: 'currency', 
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }, []);

  return {
    ...data,
    refresh: () => fetchDolar(true),
    convertToClp,
    formatClp
  };
}
