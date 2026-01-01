import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Repuesto, HistorialCambio, RepuestoFormData, TagAsignado, getTagNombre, isTagAsignado } from '../types';

export interface ImportCantidadRow {
  codigoSAP: string;
  codigoBaader: string;
  textoBreve?: string;
  valorUnitario?: number;
  cantidad: number;
}

const computeTotalFromTags = (tags: unknown, valorUnitario: number) => {
  if (!Array.isArray(tags) || !Number.isFinite(valorUnitario)) return 0;
  return tags.reduce((sum, tag) => {
    if (isTagAsignado(tag)) return sum + (tag.cantidad || 0) * valorUnitario;
    return sum;
  }, 0);
};

const hasAnyStockFromTags = (tags: unknown) => {
  if (!Array.isArray(tags)) return false;
  return tags.some(tag => isTagAsignado(tag) && tag.tipo === 'stock' && (tag.cantidad || 0) > 0);
};

const normalizeKey = (value: string) => value.trim().toUpperCase();

const upsertTagAsignado = (
  tags: (string | TagAsignado)[] | undefined,
  tagName: string,
  tipo: 'solicitud' | 'stock',
  cantidad: number
) => {
  const safeTags: (string | TagAsignado)[] = Array.isArray(tags) ? tags : [];
  const found = safeTags.some(t => isTagAsignado(t) && t.nombre === tagName && t.tipo === tipo);

  if (found) {
    return safeTags.map((t) => {
      if (isTagAsignado(t) && t.nombre === tagName && t.tipo === tipo) {
        return { ...t, cantidad };
      }
      return t;
    });
  }

  return [
    ...safeTags,
    {
      nombre: tagName,
      tipo,
      cantidad,
      fecha: new Date()
    }
  ];
};

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(num) ? num : fallback;
};

const chunk = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// Construir ruta de colección dinámica por máquina
const getCollectionPath = (machineId: string) => {
  // ⚠️ COMPATIBILIDAD TEMPORAL: Para Baader 200, leer de la colección antigua
  // Esta máquina existía antes del sistema multi-máquina
  if (machineId === 'baader-200') {
    console.log('   ⚙️ [getCollectionPath] Usando colección legacy para baader-200');
    return 'repuestosBaader200';
  }
  
  // Para nuevas máquinas: usar subcolección dentro del documento de la máquina
  // Estructura: machines/{machineId}/repuestos
  console.log(`   ⚙️ [getCollectionPath] Usando subcolección para ${machineId}`);
  return `machines/${machineId}/repuestos`;
};

export function useRepuestos(machineId: string | null) {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar cambios en tiempo real
  useEffect(() => {
    console.log('\n🔍 [useRepuestos] useEffect triggered');
    console.log('   machineId:', machineId);
    
    if (!machineId) {
      console.log('   ❌ No machineId, limpiando repuestos');
      setRepuestos([]);
      setLoading(false);
      return;
    }

    const collectionPath = getCollectionPath(machineId);
    console.log(`   📂 Collection path: ${collectionPath}`);
    const q = query(collection(db, collectionPath), orderBy('codigoSAP'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log(`   ✅ Snapshot recibido: ${snapshot.docs.length} repuestos`);
        console.log('   📦 IDs de repuestos:', snapshot.docs.map(d => d.id));
        
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          fechaUltimaActualizacionInventario: doc.data().fechaUltimaActualizacionInventario?.toDate() || null
        })) as Repuesto[];
        
        console.log('   💾 Actualizando estado de repuestos');
        setRepuestos(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error al obtener repuestos:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [machineId]);

  // Agregar historial de cambios
  const addHistorial = async (
    repuestoId: string, 
    campo: string, 
    valorAnterior: string | number | null | undefined, 
    valorNuevo: string | number | null | undefined
  ) => {
    if (!machineId) return;
    
    try {
      // Firebase no acepta undefined, convertir a null
      const collectionPath = getCollectionPath(machineId);
      const safeValorAnterior = valorAnterior === undefined ? null : valorAnterior;
      const safeValorNuevo = valorNuevo === undefined ? null : valorNuevo;
      
      await addDoc(collection(db, `${collectionPath}/${repuestoId}/historial`), {
        campo,
        valorAnterior: safeValorAnterior,
        valorNuevo: safeValorNuevo,
        fecha: Timestamp.now()
      });
    } catch (err) {
      console.error('Error al agregar historial:', err);
    }
  };

  // Crear repuesto
  const createRepuesto = useCallback(async (data: RepuestoFormData): Promise<string> => {
    if (!machineId) throw new Error('Machine ID is required');
    
    console.log('\n🆕 [useRepuestos] createRepuesto llamado');
    console.log('   machineId:', machineId);
    
    try {
      const collectionPath = getCollectionPath(machineId);
      console.log('   📂 Guardando en collection:', collectionPath);
      console.log('   📦 Datos del repuesto:', { codigoSAP: data.codigoSAP, textoBreve: data.textoBreve });
      
      const totalFromTags = computeTotalFromTags(data.tags, data.valorUnitario);
      const totalLegacy = (data.cantidadSolicitada * data.valorUnitario) + (data.cantidadStockBodega * data.valorUnitario);
      const total = totalFromTags > 0 ? totalFromTags : totalLegacy;
      const hasStock = hasAnyStockFromTags(data.tags) || data.cantidadStockBodega > 0;

      const newRepuesto = {
        ...data,
        total,
        fechaUltimaActualizacionInventario: hasStock ? Timestamp.now() : null,
        vinculosManual: [],
        imagenesManual: [],
        fotosReales: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, collectionPath), newRepuesto);
      console.log('   ✅ Repuesto creado con ID:', docRef.id);
      
      // Registrar creación en historial
      await addHistorial(docRef.id, 'creacion', null, JSON.stringify(data));
      
      return docRef.id;
    } catch (err) {
      console.error('Error al crear repuesto:', err);
      throw err;
    }
  }, [machineId]);

  // Actualizar repuesto
  const updateRepuesto = useCallback(async (
    id: string, 
    data: Partial<Repuesto>,
    originalData?: Repuesto
  ) => {
    if (!machineId) throw new Error('Machine ID is required');
    
    try {
      const collectionPath = getCollectionPath(machineId);
      const updateData = {
        ...data,
        updatedAt: Timestamp.now()
      };

      // Si se modifica tags/cantidades/valor, actualizar total de forma compatible
      if (
        data.tags !== undefined ||
        data.cantidadSolicitada !== undefined ||
        data.cantidadStockBodega !== undefined ||
        data.valorUnitario !== undefined
      ) {
        const valor = data.valorUnitario ?? originalData?.valorUnitario ?? 0;
        const tags = data.tags ?? originalData?.tags;

        const totalFromTags = computeTotalFromTags(tags, valor);
        const cantidadSolicitada = data.cantidadSolicitada ?? originalData?.cantidadSolicitada ?? 0;
        const cantidadStock = data.cantidadStockBodega ?? originalData?.cantidadStockBodega ?? 0;
        const totalLegacy = (cantidadSolicitada * valor) + (cantidadStock * valor);

        (updateData as Record<string, unknown>).total = totalFromTags > 0 ? totalFromTags : totalLegacy;

        // Fecha inventario: si hay stock (por tags o legacy), actualizar
        if (data.tags !== undefined || data.cantidadStockBodega !== undefined) {
          const hasStock = hasAnyStockFromTags(tags) || cantidadStock > 0;
          (updateData as Record<string, unknown>).fechaUltimaActualizacionInventario = hasStock ? Timestamp.now() : null;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateDoc(doc(db, collectionPath, id), updateData as any);

      // Registrar cambios en historial
      if (originalData) {
        for (const key of Object.keys(data) as (keyof Repuesto)[]) {
          if (data[key] !== originalData[key]) {
            await addHistorial(
              id, 
              key, 
              originalData[key] as string | number | null, 
              data[key] as string | number | null
            );
          }
        }
      }
    } catch (err) {
      console.error('Error al actualizar repuesto:', err);
      throw err;
    }
  }, [machineId]);

  // Eliminar repuesto
  const deleteRepuesto = useCallback(async (id: string) => {
    if (!machineId) throw new Error('Machine ID is required');
    
    try {
      const collectionPath = getCollectionPath(machineId);
      // Primero eliminar el historial
      const historialRef = collection(db, `${collectionPath}/${id}/historial`);
      const historialSnapshot = await getDocs(historialRef);
      
      const batch = writeBatch(db);
      historialSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Luego eliminar el repuesto
      await deleteDoc(doc(db, collectionPath, id));
    } catch (err) {
      console.error('Error al eliminar repuesto:', err);
      throw err;
    }
  }, [machineId]);

  // Obtener historial de un repuesto
  const getHistorial = useCallback(async (repuestoId: string): Promise<HistorialCambio[]> => {
    if (!machineId) return [];
    
    try {
      const collectionPath = getCollectionPath(machineId);
      const q = query(
        collection(db, `${collectionPath}/${repuestoId}/historial`),
        orderBy('fecha', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        repuestoId,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate() || new Date()
      })) as HistorialCambio[];
    } catch (err) {
      console.error('Error al obtener historial:', err);
      return [];
    }
  }, [machineId]);

  // Importar repuestos masivamente (para carga inicial)
  const importRepuestos = useCallback(async (data: RepuestoFormData[]) => {
    if (!machineId) throw new Error('Machine ID is required');
    
    try {
      const collectionPath = getCollectionPath(machineId);
      const batch = writeBatch(db);
      
      for (const item of data) {
        const docRef = doc(collection(db, collectionPath));
        batch.set(docRef, {
          ...item,
          total: item.cantidadSolicitada * item.valorUnitario,
          fechaUltimaActualizacionInventario: item.cantidadStockBodega > 0 ? Timestamp.now() : null,
          vinculosManual: [],
          imagenesManual: [],
          fotosReales: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      await batch.commit();
    } catch (err) {
      console.error('Error al importar repuestos:', err);
      throw err;
    }
  }, [machineId]);

  // Importar cantidades por evento/tag (reemplaza cantidad del tag; crea repuesto si no existe)
  const importCantidadesPorTag = useCallback(async (args: {
    rows: ImportCantidadRow[];
    tagName: string;
    tipo: 'solicitud' | 'stock';
    placeholder?: string;
  }) => {
    if (!machineId) throw new Error('Machine ID is required');

    const { rows, tagName, tipo, placeholder = 'pendiente' } = args;
    if (!tagName) throw new Error('tagName is required');

    const collectionPath = getCollectionPath(machineId);

    // Índices para encontrar repuestos existentes (sin mezclar máquinas: este hook ya es por machineId)
    const bySAP = new Map<string, Repuesto>();
    const byBaader = new Map<string, Repuesto>();
    repuestos.forEach((r) => {
      if (r.codigoSAP) bySAP.set(normalizeKey(r.codigoSAP), r);
      if (r.codigoBaader) byBaader.set(normalizeKey(r.codigoBaader), r);
    });

    const ops = rows.map((row) => {
      const codigoSAP = (row.codigoSAP || '').trim() || placeholder;
      const codigoBaader = (row.codigoBaader || '').trim() || placeholder;
      const keySAP = codigoSAP !== placeholder ? normalizeKey(codigoSAP) : '';
      const keyBaader = codigoBaader !== placeholder ? normalizeKey(codigoBaader) : '';

      const existing = (keySAP && bySAP.get(keySAP)) || (keyBaader && byBaader.get(keyBaader)) || null;
      const cantidad = Math.max(0, toFiniteNumber(row.cantidad, 0));
      const valorUnitario = Math.max(0, toFiniteNumber(row.valorUnitario, 0));
      const textoBreve = (row.textoBreve || '').trim();

      return { existing, codigoSAP, codigoBaader, cantidad, valorUnitario, textoBreve };
    });

    // Limitar batch (500). Usamos 400 para margen.
    const chunks = chunk(ops, 400);
    for (const batchOps of chunks) {
      const batch = writeBatch(db);

      for (const op of batchOps) {
        if (op.existing) {
          const r = op.existing;

          const nextTags = upsertTagAsignado(r.tags, tagName, tipo, op.cantidad);

          const nextValorUnitario = r.valorUnitario === 0 && op.valorUnitario > 0 ? op.valorUnitario : r.valorUnitario;

          const nextCodigoSAP = r.codigoSAP === placeholder && op.codigoSAP !== placeholder ? op.codigoSAP : r.codigoSAP;
          const nextCodigoBaader = r.codigoBaader === placeholder && op.codigoBaader !== placeholder ? op.codigoBaader : r.codigoBaader;
          const nextTextoBreve = (!r.textoBreve || r.textoBreve.trim().length === 0) && op.textoBreve ? op.textoBreve : r.textoBreve;

          const totalFromTags = computeTotalFromTags(nextTags, nextValorUnitario);

          const updateData: Record<string, unknown> = {
            tags: nextTags,
            valorUnitario: nextValorUnitario,
            codigoSAP: nextCodigoSAP,
            codigoBaader: nextCodigoBaader,
            textoBreve: nextTextoBreve,
            total: totalFromTags,
            updatedAt: Timestamp.now()
          };

          if (tipo === 'stock') {
            (updateData as Record<string, unknown>).fechaUltimaActualizacionInventario = op.cantidad > 0 ? Timestamp.now() : null;
          }

          batch.update(doc(db, collectionPath, r.id), updateData);
        } else {
          const baseValor = op.valorUnitario;
          const tags: TagAsignado[] = [
            {
              nombre: tagName,
              tipo,
              cantidad: op.cantidad,
              fecha: new Date()
            }
          ];

          const totalFromTags = computeTotalFromTags(tags, baseValor);
          const hasStock = tipo === 'stock' ? op.cantidad > 0 : false;

          const docRef = doc(collection(db, collectionPath));
          batch.set(docRef, {
            codigoSAP: op.codigoSAP,
            codigoBaader: op.codigoBaader,
            textoBreve: op.textoBreve || '',
            descripcion: op.textoBreve || '',
            cantidadSolicitada: 0,
            cantidadStockBodega: 0,
            valorUnitario: baseValor,
            total: totalFromTags,
            fechaUltimaActualizacionInventario: hasStock ? Timestamp.now() : null,
            tags,
            vinculosManual: [],
            imagenesManual: [],
            fotosReales: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
      }

      await batch.commit();
    }
  }, [machineId, repuestos]);

  // Importar solo al catálogo (sin asignar a un contexto/tag). Crea repuesto si no existe.
  const importCatalogoDesdeExcel = useCallback(async (args: {
    rows: Omit<ImportCantidadRow, 'cantidad'>[];
    placeholder?: string;
  }) => {
    if (!machineId) throw new Error('Machine ID is required');

    const { rows, placeholder = 'pendiente' } = args;
    const collectionPath = getCollectionPath(machineId);

    const bySAP = new Map<string, Repuesto>();
    const byBaader = new Map<string, Repuesto>();
    repuestos.forEach((r) => {
      if (r.codigoSAP) bySAP.set(normalizeKey(r.codigoSAP), r);
      if (r.codigoBaader) byBaader.set(normalizeKey(r.codigoBaader), r);
    });

    const ops = rows.map((row) => {
      const codigoSAP = (row.codigoSAP || '').trim() || placeholder;
      const codigoBaader = (row.codigoBaader || '').trim() || placeholder;
      const keySAP = codigoSAP !== placeholder ? normalizeKey(codigoSAP) : '';
      const keyBaader = codigoBaader !== placeholder ? normalizeKey(codigoBaader) : '';
      const existing = (keySAP && bySAP.get(keySAP)) || (keyBaader && byBaader.get(keyBaader)) || null;
      const valorUnitario = Math.max(0, toFiniteNumber(row.valorUnitario, 0));
      const textoBreve = (row.textoBreve || '').trim();
      return { existing, codigoSAP, codigoBaader, valorUnitario, textoBreve };
    });

    const chunks = chunk(ops, 400);
    for (const batchOps of chunks) {
      const batch = writeBatch(db);

      for (const op of batchOps) {
        if (op.existing) {
          const r = op.existing;
          const nextValorUnitario = r.valorUnitario === 0 && op.valorUnitario > 0 ? op.valorUnitario : r.valorUnitario;
          const nextCodigoSAP = r.codigoSAP === placeholder && op.codigoSAP !== placeholder ? op.codigoSAP : r.codigoSAP;
          const nextCodigoBaader = r.codigoBaader === placeholder && op.codigoBaader !== placeholder ? op.codigoBaader : r.codigoBaader;
          const nextTextoBreve = (!r.textoBreve || r.textoBreve.trim().length === 0) && op.textoBreve ? op.textoBreve : r.textoBreve;

          const totalFromTags = computeTotalFromTags(r.tags, nextValorUnitario);

          batch.update(doc(db, collectionPath, r.id), {
            codigoSAP: nextCodigoSAP,
            codigoBaader: nextCodigoBaader,
            textoBreve: nextTextoBreve,
            descripcion: (!r.descripcion || r.descripcion.trim().length === 0) && op.textoBreve ? op.textoBreve : r.descripcion,
            valorUnitario: nextValorUnitario,
            total: totalFromTags,
            updatedAt: Timestamp.now()
          });
        } else {
          const baseValor = op.valorUnitario;
          const docRef = doc(collection(db, collectionPath));

          batch.set(docRef, {
            codigoSAP: op.codigoSAP,
            codigoBaader: op.codigoBaader,
            textoBreve: op.textoBreve || '',
            descripcion: op.textoBreve || '',
            cantidadSolicitada: 0,
            cantidadStockBodega: 0,
            valorUnitario: baseValor,
            total: 0,
            fechaUltimaActualizacionInventario: null,
            tags: [],
            vinculosManual: [],
            imagenesManual: [],
            fotosReales: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
      }

      await batch.commit();
    }
  }, [machineId, repuestos]);

  // Renombrar un tag en todos los repuestos
  const renameTag = useCallback(async (oldTagName: string, newTagName: string) => {
    if (!machineId) throw new Error('Machine ID is required');
    
    try {
      const collectionPath = getCollectionPath(machineId);
      const batch = writeBatch(db);
      let updatedCount = 0;

      for (const repuesto of repuestos) {
        const hasTag = repuesto.tags?.some(t => getTagNombre(t) === oldTagName);
        if (!hasTag) continue;

        const newTags = (repuesto.tags || []).map((t) => {
          if (isTagAsignado(t)) {
            return t.nombre === oldTagName ? { ...t, nombre: newTagName } : t;
          }
          return t === oldTagName ? newTagName : t;
        });

        batch.update(doc(db, collectionPath, repuesto.id), {
          tags: newTags,
          updatedAt: Timestamp.now()
        });
        updatedCount++;
      }

      if (updatedCount > 0) {
        await batch.commit();
      }

      return updatedCount;
    } catch (err) {
      console.error('Error al renombrar tag:', err);
      throw err;
    }
  }, [repuestos, machineId]);

  // Eliminar un tag de todos los repuestos
  const deleteTag = useCallback(async (tagName: string) => {
    if (!machineId) throw new Error('Machine ID is required');
    
    try {
      const collectionPath = getCollectionPath(machineId);
      const batch = writeBatch(db);
      let updatedCount = 0;

      for (const repuesto of repuestos) {
        const hasTag = repuesto.tags?.some(t => getTagNombre(t) === tagName);
        if (!hasTag) continue;

        const newTags = (repuesto.tags || []).filter((t) => {
          if (isTagAsignado(t)) return t.nombre !== tagName;
          return t !== tagName;
        });

        batch.update(doc(db, collectionPath, repuesto.id), {
          tags: newTags,
          updatedAt: Timestamp.now()
        });
        updatedCount++;
      }

      if (updatedCount > 0) {
        await batch.commit();
      }

      return updatedCount;
    } catch (err) {
      console.error('Error al eliminar tag:', err);
      throw err;
    }
  }, [repuestos, machineId]);

  // Migrar tags: sincronizar cantidades de tags con valores del repuesto
  // REGLA: Asigna tags basándose en las cantidades legacy del repuesto
  // - cantidadSolicitada > 0 → tag "Cantidad Solicitada Dic 2025"
  // - cantidadStockBodega > 0 → tag "Stock en bodega Dic 2025"
  // Si tiene ambas cantidades > 0, recibe AMBOS tags
  const migrateTagsToNewSystem = useCallback(async () => {
    if (!machineId) throw new Error('Machine ID is required');
    
    const TAG_SOLICITUD = 'Cantidad Solicitada Dic 2025';
    const TAG_STOCK = 'Stock en bodega Dic 2025';
    
    try {
      const collectionPath = getCollectionPath(machineId);
      const batch = writeBatch(db);
      let migratedCount = 0;
      let solicitudCount = 0;
      let stockCount = 0;
      const conAmbos: string[] = [];
      
      for (const repuesto of repuestos) {
        const newTags: Array<{ nombre: string; tipo: 'solicitud' | 'stock'; cantidad: number; fecha: Date }> = [];
        let needsUpdate = false;
        
        const cantSol = repuesto.cantidadSolicitada || 0;
        const cantStock = repuesto.cantidadStockBodega || 0;
        
        // Si tiene cantidadSolicitada > 0, agregar tag de solicitud
        if (cantSol > 0) {
          newTags.push({
            nombre: TAG_SOLICITUD,
            tipo: 'solicitud',
            cantidad: cantSol,
            fecha: new Date()
          });
          solicitudCount++;
          needsUpdate = true;
        }
        
        // Si tiene cantidadStockBodega > 0, agregar tag de stock
        if (cantStock > 0) {
          newTags.push({
            nombre: TAG_STOCK,
            tipo: 'stock',
            cantidad: cantStock,
            fecha: new Date()
          });
          stockCount++;
          needsUpdate = true;
        }
        
        // Debug: registrar los que tienen ambos
        if (cantSol > 0 && cantStock > 0) {
          conAmbos.push(`${repuesto.codigoSAP} (Sol:${cantSol}, Stock:${cantStock})`);
        }
        
        if (needsUpdate) {
          batch.update(doc(db, collectionPath, repuesto.id), {
            tags: newTags,
            updatedAt: Timestamp.now()
          });
          migratedCount++;
        } else {
          if (repuesto.tags && repuesto.tags.length > 0) {
            batch.update(doc(db, collectionPath, repuesto.id), {
              tags: [],
              updatedAt: Timestamp.now()
            });
          }
        }
      }
      
      await batch.commit();
      
      // Log para ver los problemáticos
      if (conAmbos.length > 0) {
        console.log('⚠️ Repuestos con AMBAS cantidades:', conAmbos);
        alert(`⚠️ Hay ${conAmbos.length} repuestos con AMBAS cantidades:\n${conAmbos.join('\n')}\n\nRevisa la consola para más detalles.`);
      }
      
      return { migratedCount, solicitudCount, stockCount, conAmbos };
    } catch (err) {
      console.error('Error al migrar tags:', err);
      throw err;
    }
  }, [repuestos, machineId]);

  // Restaurar tags desde historial de Firebase
  const restoreTagsFromHistory = useCallback(async () => {
    if (!machineId) throw new Error('Machine ID is required');
    
    try {
      const collectionPath = getCollectionPath(machineId);
      let restoredCount = 0;
      const errors: string[] = [];
      
      for (const repuesto of repuestos) {
        try {
          // Buscar en historial cambios de 'tags'
          const historialRef = collection(db, `${collectionPath}/${repuesto.id}/historial`);
          const q = query(historialRef, orderBy('fecha', 'desc'));
          const snapshot = await getDocs(q);
          
          // Buscar el último cambio de tags que tenga valorAnterior
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            if (data.campo === 'tags' && data.valorAnterior) {
              // Restaurar el valor anterior
              let tagsAnteriores = data.valorAnterior;
              if (typeof tagsAnteriores === 'string') {
                try {
                  tagsAnteriores = JSON.parse(tagsAnteriores);
                } catch {
                  continue;
                }
              }
              
              if (Array.isArray(tagsAnteriores)) {
                await updateDoc(doc(db, collectionPath, repuesto.id), {
                  tags: tagsAnteriores,
                  updatedAt: Timestamp.now()
                });
                restoredCount++;
                break;
              }
            }
          }
        } catch (err) {
          errors.push(repuesto.codigoSAP);
        }
      }
      
      return { restoredCount, errors };
    } catch (err) {
      console.error('Error al restaurar tags:', err);
      throw err;
    }
  }, [repuestos, machineId]);

  // Agregar un tag a múltiples repuestos por código SAP
  const addTagToRepuestosByCodigo = useCallback(async (
    codigosSAP: string[],
    tagName: string,
    tagTipo: 'solicitud' | 'stock',
    cantidades: Record<string, number> // { codigoSAP: cantidad }
  ) => {
    if (!machineId) throw new Error('Machine ID is required');
    
    try {
      const collectionPath = getCollectionPath(machineId);
      const batch = writeBatch(db);
      let addedCount = 0;
      const errors: string[] = [];

      for (const codigoSAP of codigosSAP) {
        const repuesto = repuestos.find(r => r.codigoSAP === codigoSAP);
        if (!repuesto) {
          errors.push(codigoSAP);
          continue;
        }

        // Verificar si ya tiene el tag
        const existingTags = repuesto.tags || [];
        const yaExiste = existingTags.some(t => {
          if (typeof t === 'string') return t === tagName;
          return t.nombre === tagName;
        });

        if (yaExiste) {
          continue; // Ya tiene el tag, saltar
        }

        // Crear nuevo tag
        const nuevoTag = {
          nombre: tagName,
          tipo: tagTipo,
          cantidad: cantidades[codigoSAP] || 0,
          fecha: Timestamp.now()
        };

        const newTags = [...existingTags, nuevoTag];
        
        batch.update(doc(db, collectionPath, repuesto.id), {
          tags: newTags,
          updatedAt: Timestamp.now()
        });
        addedCount++;
      }

      if (addedCount > 0) {
        await batch.commit();
      }

      return { addedCount, errors };
    } catch (err) {
      console.error('Error al agregar tag a repuestos:', err);
      throw err;
    }
  }, [repuestos, machineId]);

  return {
    repuestos,
    loading,
    error,
    createRepuesto,
    updateRepuesto,
    deleteRepuesto,
    getHistorial,
    importRepuestos,
    importCantidadesPorTag,
    importCatalogoDesdeExcel,
    renameTag,
    deleteTag,
    migrateTagsToNewSystem,
    restoreTagsFromHistory,
    addTagToRepuestosByCodigo
  };
}
