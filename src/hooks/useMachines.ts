import { useState, useEffect } from 'react';
import { 
  collection, 
  doc,
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Machine } from '../types';

const COLLECTION_NAME = 'machines';

export function useMachines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar todas las máquinas
  const fetchMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const q = query(collection(db, COLLECTION_NAME), orderBy('orden', 'asc'));
      const snapshot = await getDocs(q);
      
      const machinesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nombre: data.nombre,
          marca: data.marca,
          modelo: data.modelo,
          descripcion: data.descripcion || '',
          activa: data.activa !== false, // Por defecto true
          color: data.color || '#3b82f6',
          orden: data.orden || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
        } as Machine;
      });
      
      // Si no hay máquinas, crear automáticamente "Baader 200"
      if (machinesData.length === 0) {
        console.log('🔧 No hay máquinas, creando Baader 200 por defecto...');
        const baaderMachine: Omit<Machine, 'id' | 'createdAt'> = {
          nombre: 'Baader 200',
          marca: 'Baader',
          modelo: '200',
          descripcion: 'Máquina principal - Datos migrados de repuestosBaader200',
          activa: true,
          color: '#3b82f6',
          orden: 0,
          updatedAt: new Date(),
        };
        
        const docRef = doc(db, COLLECTION_NAME, 'baader-200');
        await updateDoc(docRef, {
          ...baaderMachine,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }).catch(async () => {
          // Si no existe, crearlo
          const { id } = await addDoc(collection(db, COLLECTION_NAME), {
            ...baaderMachine,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          console.log('✅ Máquina Baader 200 creada:', id);
        });
        
        // Recargar después de crear
        const newSnapshot = await getDocs(q);
        const newMachinesData = newSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nombre: data.nombre,
            marca: data.marca,
            modelo: data.modelo,
            descripcion: data.descripcion || '',
            activa: data.activa !== false,
            color: data.color || '#3b82f6',
            orden: data.orden || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
          } as Machine;
        });
        setMachines(newMachinesData);
      } else {
        setMachines(machinesData);
      }
    } catch (err) {
      console.error('Error fetching machines:', err);
      setError('Error al cargar las máquinas');
    } finally {
      setLoading(false);
    }
  };

  // Obtener una máquina por ID
  const getMachine = async (machineId: string): Promise<Machine | null> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, machineId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      return {
        id: docSnap.id,
        nombre: data.nombre,
        marca: data.marca,
        modelo: data.modelo,
        descripcion: data.descripcion || '',
        activa: data.activa !== false,
        color: data.color || '#3b82f6',
        orden: data.orden || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
      } as Machine;
    } catch (err) {
      console.error('Error getting machine:', err);
      return null;
    }
  };

  // Crear nueva máquina
  const createMachine = async (
    machineData: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    try {
      // Calcular el siguiente orden
      const maxOrden = machines.length > 0 
        ? Math.max(...machines.map(m => m.orden)) 
        : -1;
      
      const newMachine = {
        ...machineData,
        orden: maxOrden + 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newMachine);
      
      // Actualizar estado local
      await fetchMachines();
      
      return docRef.id;
    } catch (err) {
      console.error('Error creating machine:', err);
      throw new Error('Error al crear la máquina');
    }
  };

  // Actualizar máquina existente
  const updateMachine = async (
    machineId: string,
    updates: Partial<Omit<Machine, 'id' | 'createdAt'>>
  ): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, machineId);
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
      
      // Actualizar estado local
      await fetchMachines();
    } catch (err) {
      console.error('Error updating machine:', err);
      throw new Error('Error al actualizar la máquina');
    }
  };

  // Eliminar máquina (físico)
  const deleteMachine = async (machineId: string): Promise<void> => {
    try {
      const docRef = doc(db, COLLECTION_NAME, machineId);
      await deleteDoc(docRef);
      
      // Actualizar estado local
      await fetchMachines();
    } catch (err) {
      console.error('Error deleting machine:', err);
      throw new Error('Error al eliminar la máquina');
    }
  };

  // Archivar máquina (lógico)
  const archiveMachine = async (machineId: string): Promise<void> => {
    await updateMachine(machineId, { activa: false });
  };

  // Reactivar máquina
  const reactivateMachine = async (machineId: string): Promise<void> => {
    await updateMachine(machineId, { activa: true });
  };

  // Reordenar máquinas (para drag & drop de tabs)
  const reorderMachines = async (newOrder: string[]): Promise<void> => {
    try {
      const batch = writeBatch(db);
      
      newOrder.forEach((machineId, index) => {
        const docRef = doc(db, COLLECTION_NAME, machineId);
        batch.update(docRef, {
          orden: index,
          updatedAt: Timestamp.now(),
        });
      });
      
      await batch.commit();
      
      // Actualizar estado local
      await fetchMachines();
    } catch (err) {
      console.error('Error reordering machines:', err);
      throw new Error('Error al reordenar las máquinas');
    }
  };

  // Obtener solo máquinas activas
  const getActiveMachines = (): Machine[] => {
    return machines.filter(m => m.activa);
  };

  // Verificar si existe una máquina
  const machineExists = async (machineId: string): Promise<boolean> => {
    const machine = await getMachine(machineId);
    return machine !== null;
  };

  // Cargar máquinas al montar el componente
  useEffect(() => {
    fetchMachines();
  }, []);

  return {
    machines,
    loading,
    error,
    fetchMachines,
    getMachine,
    createMachine,
    updateMachine,
    deleteMachine,
    archiveMachine,
    reactivateMachine,
    reorderMachines,
    getActiveMachines,
    machineExists,
  };
}
