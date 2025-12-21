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
import { Repuesto, HistorialCambio, RepuestoFormData } from '../types';

// Colección específica para Baader 200 (separada de otras apps)
const COLLECTION_NAME = 'repuestosBaader200';

export function useRepuestos() {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar cambios en tiempo real
  useEffect(() => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('codigoSAP'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          fechaUltimaActualizacionInventario: doc.data().fechaUltimaActualizacionInventario?.toDate() || null
        })) as Repuesto[];
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
  }, []);

  // Agregar historial de cambios
  const addHistorial = async (
    repuestoId: string, 
    campo: string, 
    valorAnterior: string | number | null, 
    valorNuevo: string | number | null
  ) => {
    try {
      await addDoc(collection(db, COLLECTION_NAME, repuestoId, 'historial'), {
        campo,
        valorAnterior,
        valorNuevo,
        fecha: Timestamp.now()
      });
    } catch (err) {
      console.error('Error al agregar historial:', err);
    }
  };

  // Crear repuesto
  const createRepuesto = useCallback(async (data: RepuestoFormData): Promise<string> => {
    try {
      const newRepuesto = {
        ...data,
        total: (data.cantidadSolicitada * data.valorUnitario) + (data.cantidadStockBodega * data.valorUnitario),
        fechaUltimaActualizacionInventario: data.cantidadStockBodega > 0 ? Timestamp.now() : null,
        vinculosManual: [],
        imagenesManual: [],
        fotosReales: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newRepuesto);
      
      // Registrar creación en historial
      await addHistorial(docRef.id, 'creacion', null, JSON.stringify(data));
      
      return docRef.id;
    } catch (err) {
      console.error('Error al crear repuesto:', err);
      throw err;
    }
  }, []);

  // Actualizar repuesto
  const updateRepuesto = useCallback(async (
    id: string, 
    data: Partial<Repuesto>,
    originalData?: Repuesto
  ) => {
    try {
      const updateData = {
        ...data,
        updatedAt: Timestamp.now()
      };

      // Si se modifica la cantidad o stock, actualizar total
      if (data.cantidadSolicitada !== undefined || data.valorUnitario !== undefined || data.cantidadStockBodega !== undefined) {
        const cantidadSolicitada = data.cantidadSolicitada ?? originalData?.cantidadSolicitada ?? 0;
        const cantidadStock = data.cantidadStockBodega ?? originalData?.cantidadStockBodega ?? 0;
        const valor = data.valorUnitario ?? originalData?.valorUnitario ?? 0;
        // Total General = (Valor Unit. × Cant. Solicitada) + (Valor Unit. × Stock Bodega)
        (updateData as Record<string, unknown>).total = (cantidadSolicitada * valor) + (cantidadStock * valor);
      }

      // Si se modifica cantidadStockBodega, actualizar fecha
      if (data.cantidadStockBodega !== undefined) {
        (updateData as Record<string, unknown>).fechaUltimaActualizacionInventario = Timestamp.now();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateDoc(doc(db, COLLECTION_NAME, id), updateData as any);

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
  }, []);

  // Eliminar repuesto
  const deleteRepuesto = useCallback(async (id: string) => {
    try {
      // Primero eliminar el historial
      const historialRef = collection(db, COLLECTION_NAME, id, 'historial');
      const historialSnapshot = await getDocs(historialRef);
      
      const batch = writeBatch(db);
      historialSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Luego eliminar el repuesto
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (err) {
      console.error('Error al eliminar repuesto:', err);
      throw err;
    }
  }, []);

  // Obtener historial de un repuesto
  const getHistorial = useCallback(async (repuestoId: string): Promise<HistorialCambio[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME, repuestoId, 'historial'),
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
  }, []);

  // Importar repuestos masivamente (para carga inicial)
  const importRepuestos = useCallback(async (data: RepuestoFormData[]) => {
    try {
      const batch = writeBatch(db);
      
      for (const item of data) {
        const docRef = doc(collection(db, COLLECTION_NAME));
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
  }, []);

  // Renombrar un tag en todos los repuestos
  const renameTag = useCallback(async (oldTagName: string, newTagName: string) => {
    try {
      const batch = writeBatch(db);
      let updatedCount = 0;

      for (const repuesto of repuestos) {
        if (repuesto.tags?.includes(oldTagName)) {
          const newTags = repuesto.tags.map(t => t === oldTagName ? newTagName : t);
          batch.update(doc(db, COLLECTION_NAME, repuesto.id), { 
            tags: newTags,
            updatedAt: Timestamp.now()
          });
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
      }

      return updatedCount;
    } catch (err) {
      console.error('Error al renombrar tag:', err);
      throw err;
    }
  }, [repuestos]);

  // Eliminar un tag de todos los repuestos
  const deleteTag = useCallback(async (tagName: string) => {
    try {
      const batch = writeBatch(db);
      let updatedCount = 0;

      for (const repuesto of repuestos) {
        if (repuesto.tags?.includes(tagName)) {
          const newTags = repuesto.tags.filter(t => t !== tagName);
          batch.update(doc(db, COLLECTION_NAME, repuesto.id), { 
            tags: newTags,
            updatedAt: Timestamp.now()
          });
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
      }

      return updatedCount;
    } catch (err) {
      console.error('Error al eliminar tag:', err);
      throw err;
    }
  }, [repuestos]);

  // Migrar tags: sincronizar cantidades de tags con valores del repuesto
  // REGLA: Asigna tags basándose en las cantidades legacy del repuesto
  // - cantidadSolicitada > 0 → tag "Cantidad Solicitada Dic 2025"
  // - cantidadStockBodega > 0 → tag "Stock en bodega Dic 2025"
  // Si tiene ambas cantidades > 0, recibe AMBOS tags
  const migrateTagsToNewSystem = useCallback(async () => {
    const TAG_SOLICITUD = 'Cantidad Solicitada Dic 2025';
    const TAG_STOCK = 'Stock en bodega Dic 2025';
    
    try {
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
          batch.update(doc(db, COLLECTION_NAME, repuesto.id), {
            tags: newTags,
            updatedAt: Timestamp.now()
          });
          migratedCount++;
        } else {
          if (repuesto.tags && repuesto.tags.length > 0) {
            batch.update(doc(db, COLLECTION_NAME, repuesto.id), {
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
  }, [repuestos]);

  return {
    repuestos,
    loading,
    error,
    createRepuesto,
    updateRepuesto,
    deleteRepuesto,
    getHistorial,
    importRepuestos,
    renameTag,
    deleteTag,
    migrateTagsToNewSystem
  };
}
