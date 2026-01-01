import { useEffect, useMemo, useRef } from 'react';
import type { Machine } from '../types';

function isMobileLikeDevice() {
  if (typeof window === 'undefined') return false;
  const isSmall = window.matchMedia('(max-width: 1024px)').matches;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|iPhone|iPad|iPod/i.test(ua);
  // Evitar tratar PCs táctiles como móvil solo por tener touch.
  return isSmall || isMobileUA;
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

type QueueItem = { url: string };

const globalQueue = {
  queue: [] as QueueItem[],
  queued: new Set<string>(),
  done: new Set<string>(),
  running: false,
  currentRunToken: 0,
};

function scheduleIdle(fn: () => void) {
  const win = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void };
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(fn, { timeout: 2000 });
  } else {
    setTimeout(fn, 800);
  }
}

function enqueueUrls(urls: string[], priority: 'front' | 'back') {
  for (const url of urls) {
    if (!url) continue;
    if (globalQueue.done.has(url)) continue;
    if (globalQueue.queued.has(url)) continue;
    globalQueue.queued.add(url);
    const item = { url };
    if (priority === 'front') globalQueue.queue.unshift(item);
    else globalQueue.queue.push(item);
  }
}

async function runQueue(concurrency: number) {
  if (globalQueue.running) return;
  globalQueue.running = true;
  const token = ++globalQueue.currentRunToken;

  const worker = async () => {
    while (token === globalQueue.currentRunToken) {
      const item = globalQueue.queue.shift();
      if (!item) return;
      await prefetchUrl(item.url);
      globalQueue.done.add(item.url);
    }
  };

  try {
    await Promise.all(new Array(Math.max(1, concurrency)).fill(null).map(() => worker()));
  } finally {
    globalQueue.running = false;
  }
}

/**
 * Precarga liviana de manuales PDF:
 * - Primero manuales de la máquina actual
 * - Luego el resto (solo si el dispositivo/conexión lo permite)
 *
 * Nota: esto NO parsea PDF.js; solo calienta caché de red.
 */
export function useManualWarmup(currentMachine: Machine | null, machines: Machine[]) {
  const hasMountedRef = useRef(false);

  const machineManualUrls = useMemo(() => {
    const byMachine = new Map<string, string[]>();
    for (const m of machines) {
      const urls = (m.manuals || []).filter(Boolean);
      byMachine.set(m.id, urls);
    }
    return byMachine;
  }, [machines]);

  useEffect(() => {
    if (!currentMachine) return;

    const mobile = isMobileLikeDevice();
    const aggressive = canPrefetchAggressively();
    const concurrency = mobile ? 1 : 2;

    const currentUrls = machineManualUrls.get(currentMachine.id) || [];
    enqueueUrls(currentUrls, 'front');

    // En PC o conexión OK, también encolar el resto inmediatamente.
    // En móvil/datos limitados: solo la máquina actual.
    if (!mobile || aggressive) {
      const otherUrls: string[] = [];
      for (const [machineId, urls] of machineManualUrls.entries()) {
        if (machineId === currentMachine.id) continue;
        otherUrls.push(...urls);
      }
      enqueueUrls(otherUrls, 'back');
    }

    // Arrancar una sola vez (y luego se mantiene drenando la cola)
    const shouldStartNow = !hasMountedRef.current;
    hasMountedRef.current = true;

    scheduleIdle(() => {
      // En el primer arranque, dale prioridad fuerte a la máquina actual.
      // En cambios posteriores, la cola ya se actualiza por enqueueUrls.
      void runQueue(concurrency);
    });

    // Si cambia la máquina, no cancelamos: solo reajustamos prioridad via enqueue.
    // La cola se seguirá drenando.
    return () => {
      if (shouldStartNow) {
        // no-op
      }
    };
  }, [currentMachine?.id, machineManualUrls]);
}
