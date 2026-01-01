import { useEffect, useRef } from 'react';
import type { Machine } from '../types';

function isMobileLikeDevice() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(max-width: 1024px)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

function canPrefetchAggressively() {
  // Ser conservadores en móvil / datos limitados
  const nav = navigator as unknown as {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const connection = nav.connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  const effectiveType = connection.effectiveType;
  if (!effectiveType) return true;
  return !['slow-2g', '2g'].includes(effectiveType);
}

async function prefetchUrl(url: string): Promise<void> {
  try {
    // cache: 'force-cache' ayuda a que el navegador reutilice la descarga
    const resp = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'force-cache',
      credentials: 'omit'
    });

    // Consumir el body garantiza que se descargue completo (mejor para cambios rápidos)
    // Si falla por tamaño/memoria, el catch lo ignora.
    if (resp.ok) {
      await resp.arrayBuffer();
    }
  } catch {
    // Silencioso: es solo optimización
  }
}

async function runPool(urls: string[], concurrency: number, shouldContinue: () => boolean) {
  let idx = 0;

  const workers = new Array(Math.max(1, concurrency)).fill(null).map(async () => {
    while (shouldContinue()) {
      const currentIndex = idx++;
      if (currentIndex >= urls.length) return;
      await prefetchUrl(urls[currentIndex]);
    }
  });

  await Promise.all(workers);
}

/**
 * Precarga liviana de manuales PDF:
 * - Primero manuales de la máquina actual
 * - Luego el resto (solo si el dispositivo/conexión lo permite)
 *
 * Nota: esto NO parsea PDF.js; solo calienta caché de red.
 */
export function useManualWarmup(currentMachine: Machine | null, machines: Machine[]) {
  const prefetchedRef = useRef<Set<string>>(new Set());
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!currentMachine) return;

    const runId = ++runIdRef.current;
    const shouldContinue = () => runIdRef.current === runId;

    const currentUrls = (currentMachine.manuals || []).filter(Boolean);
    const otherUrls = machines
      .filter((m) => m.id !== currentMachine.id)
      .flatMap((m) => m.manuals || [])
      .filter(Boolean);

    const mobile = isMobileLikeDevice();
    const aggressive = canPrefetchAggressively();

    const urlsOrdered = mobile && !aggressive
      ? currentUrls
      : [...currentUrls, ...otherUrls];

    const urls = urlsOrdered.filter((u) => {
      if (!u) return false;
      if (prefetchedRef.current.has(u)) return false;
      prefetchedRef.current.add(u);
      return true;
    });

    if (urls.length === 0) return;

    const concurrency = mobile ? 1 : 2;

    const schedule = (fn: () => void) => {
      const win = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void };
      if (typeof win.requestIdleCallback === 'function') {
        win.requestIdleCallback(fn, { timeout: 2000 });
      } else {
        setTimeout(fn, 800);
      }
    };

    schedule(() => {
      void runPool(urls, concurrency, shouldContinue);
    });

    return () => {
      // invalidar corrida
      runIdRef.current = runId;
    };
  }, [currentMachine?.id, currentMachine?.manuals, machines]);
}
