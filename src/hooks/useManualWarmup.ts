import { useEffect, useMemo, useRef, useState } from 'react';
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
    setUrlState(url, { status: 'fetching' });

    // cache: 'force-cache' ayuda a que el navegador reutilice la descarga
    const resp = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'force-cache',
      credentials: 'omit'
    });

    if (!resp.ok) {
      setUrlState(url, { status: 'error' });
      return;
    }

    const totalHeader = resp.headers.get('content-length');
    const totalBytes = totalHeader ? Number(totalHeader) : 0;

    // Consumir el body garantiza que se descargue completo.
    // Si hay content-length y streaming disponible, reportar progreso real.
    if (resp.body && totalBytes > 0 && typeof resp.body.getReader === 'function') {
      const reader = resp.body.getReader();
      let loadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          loadedBytes += value.byteLength;
          setUrlState(url, { loadedBytes, totalBytes, status: 'fetching' });
        }
      }

      setUrlState(url, { loadedBytes: totalBytes, totalBytes, status: 'done' });
      return;
    }

    // Fallback: sin streaming o sin content-length
    await resp.arrayBuffer();
    setUrlState(url, {
      loadedBytes: totalBytes > 0 ? totalBytes : undefined,
      totalBytes: totalBytes > 0 ? totalBytes : undefined,
      status: 'done'
    });
  } catch {
    // Silencioso: es solo optimización
    setUrlState(url, { status: 'error' });
  }
}

type WarmupStatus = 'queued' | 'fetching' | 'done' | 'error';

type UrlWarmupState = {
  url: string;
  status: WarmupStatus;
  loadedBytes?: number;
  totalBytes?: number;
  updatedAt: number;
};

type QueueItem = { url: string };

type WarmupSnapshot = {
  running: boolean;
  byUrl: Record<string, UrlWarmupState>;
};

const globalQueue = {
  queue: [] as QueueItem[],
  queued: new Set<string>(),
  done: new Set<string>(),
  running: false,
  currentRunToken: 0,
  byUrl: new Map<string, UrlWarmupState>(),
  listeners: new Set<(s: WarmupSnapshot) => void>(),
  notifyScheduled: false,
};

function toSnapshot(): WarmupSnapshot {
  const byUrl: Record<string, UrlWarmupState> = {};
  for (const [url, state] of globalQueue.byUrl.entries()) {
    byUrl[url] = state;
  }
  return {
    running: globalQueue.running,
    byUrl,
  };
}

function notify() {
  if (globalQueue.notifyScheduled) return;
  globalQueue.notifyScheduled = true;
  requestAnimationFrame(() => {
    globalQueue.notifyScheduled = false;
    const snap = toSnapshot();
    for (const l of globalQueue.listeners) l(snap);
  });
}

function setUrlState(url: string, patch: Partial<Omit<UrlWarmupState, 'url' | 'updatedAt'>>) {
  const prev = globalQueue.byUrl.get(url);
  const next: UrlWarmupState = {
    url,
    status: patch.status || prev?.status || 'queued',
    loadedBytes: patch.loadedBytes ?? prev?.loadedBytes,
    totalBytes: patch.totalBytes ?? prev?.totalBytes,
    updatedAt: Date.now(),
  };
  globalQueue.byUrl.set(url, next);
  notify();
}

export function subscribeManualWarmup(listener: (s: WarmupSnapshot) => void) {
  globalQueue.listeners.add(listener);
  listener(toSnapshot());
  return () => {
    globalQueue.listeners.delete(listener);
  };
}

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
    setUrlState(url, { status: 'queued' });
    const item = { url };
    if (priority === 'front') globalQueue.queue.unshift(item);
    else globalQueue.queue.push(item);
  }
}

async function runQueue(concurrency: number) {
  if (globalQueue.running) return;
  globalQueue.running = true;
  notify();
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
    notify();
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
  const [snapshot, setSnapshot] = useState<WarmupSnapshot>(() => toSnapshot());

  const machineManualUrls = useMemo(() => {
    const byMachine = new Map<string, string[]>();
    for (const m of machines) {
      const urls = (m.manuals || []).filter(Boolean);
      byMachine.set(m.id, urls);
    }
    return byMachine;
  }, [machines]);

  // Suscribirse a la cola global para mostrar progreso en UI
  useEffect(() => {
    return subscribeManualWarmup(setSnapshot);
  }, []);

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

  const currentMachineUrls = currentMachine ? (machineManualUrls.get(currentMachine.id) || []) : [];

  const currentMachineProgress = useMemo(() => {
    if (!currentMachine || currentMachineUrls.length === 0) {
      return { percent: 0, status: 'queued' as WarmupStatus, items: [] as UrlWarmupState[] };
    }

    const items = currentMachineUrls
      .map((u) => snapshot.byUrl[u])
      .filter(Boolean)
      .map((s) => s as UrlWarmupState);

    // Si aún no hay estados (primer render), marcar queued
    const effectiveItems: UrlWarmupState[] = items.length > 0
      ? items
      : currentMachineUrls.map((u) => ({
          url: u,
          status: 'queued' as WarmupStatus,
          loadedBytes: undefined,
          totalBytes: undefined,
          updatedAt: 0,
        }));

    // Percent ponderado por bytes cuando haya totalBytes, sino promedio simple.
    let weightedTotal = 0;
    let weightedLoaded = 0;
    let simpleSum = 0;
    let simpleCount = 0;

    for (const it of effectiveItems) {
      const total = it.totalBytes;
      const loaded = it.loadedBytes;
      if (total && total > 0 && typeof loaded === 'number') {
        weightedTotal += total;
        weightedLoaded += Math.min(loaded, total);
      } else {
        // Estimar: done=100, fetching=50, queued=0, error=0
        const est = it.status === 'done' ? 100 : it.status === 'fetching' ? 50 : 0;
        simpleSum += est;
        simpleCount += 1;
      }
    }

    const pctWeighted = weightedTotal > 0 ? Math.round((weightedLoaded / weightedTotal) * 100) : null;
    const pctSimple = simpleCount > 0 ? Math.round(simpleSum / simpleCount) : 0;
    const percent = pctWeighted ?? pctSimple;

    const anyError = effectiveItems.some((i) => i.status === 'error');
    const allDone = effectiveItems.every((i) => i.status === 'done');
    const anyFetching = effectiveItems.some((i) => i.status === 'fetching');
    const status: WarmupStatus = allDone ? 'done' : anyError ? 'error' : anyFetching ? 'fetching' : 'queued';

    return { percent, status, items: effectiveItems };
  }, [currentMachine, currentMachineUrls, snapshot.byUrl]);

  return {
    running: snapshot.running,
    currentMachineProgress,
    byUrl: snapshot.byUrl,
  };
}
