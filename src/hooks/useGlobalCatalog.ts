import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Machine, Repuesto } from '../types';

export type GlobalRepuesto = Repuesto & {
  machineId: string;
  machineNombre: string;
};

const getCollectionPathForMachine = (machineId: string) => {
  // ⚠️ Compatibilidad legacy
  if (machineId === 'baader-200') return 'repuestosBaader200';
  return `machines/${machineId}/repuestos`;
};

export function useGlobalCatalog(args: { enabled: boolean; machines: Machine[] }) {
  const { enabled, machines } = args;

  const activeMachines = useMemo(() => machines.filter((m) => m.activa), [machines]);
  const machinesKey = useMemo(() => activeMachines.map((m) => m.id).sort().join('|'), [activeMachines]);

  const [items, setItems] = useState<GlobalRepuesto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedForKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!machinesKey) {
      setItems([]);
      setError(null);
      return;
    }

    // Cache: si ya cargamos para este set de máquinas, no recargar
    if (loadedForKeyRef.current === machinesKey && items.length > 0) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          activeMachines.map(async (machine) => {
            const path = getCollectionPathForMachine(machine.id);
            const snap = await getDocs(collection(db, path));
            return snap.docs.map((d) => {
              const data = d.data() as Record<string, unknown>;
              return {
                id: d.id,
                ...data,
                createdAt: (data.createdAt as any)?.toDate?.() || new Date(),
                updatedAt: (data.updatedAt as any)?.toDate?.() || new Date(),
                fechaUltimaActualizacionInventario: (data.fechaUltimaActualizacionInventario as any)?.toDate?.() || null,
                machineId: machine.id,
                machineNombre: machine.nombre
              } as GlobalRepuesto;
            });
          })
        );

        const flat = results.flat();
        if (cancelled) return;
        setItems(flat);
        loadedForKeyRef.current = machinesKey;
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Error cargando catálogo global');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, machinesKey]);

  return { items, loading, error };
}
