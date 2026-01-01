import { useState, useEffect } from 'react';
import { 
  collection, 
  doc,
  getDocs, 
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  onSnapshot
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
          manuals: data.manuals || [], // Array de URLs de manuales
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
        } as Machine;
      });
      
      // Si no hay máquinas, crear automáticamente "Baader 200"
      if (machinesData.length === 0) {
        console.log('🔧 No hay máquinas, creando Baader 200 por defecto...');
        const baaderMachine = {
          nombre: 'Baader 200',
          marca: 'Baader',
          modelo: '200',
          descripcion: 'Máquina principal - Datos de repuestosBaader200',
          activa: true,
          color: '#3b82f6',
          orden: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        // Crear con ID fijo "baader-200"
        const docRef = doc(db, COLLECTION_NAME, 'baader-200');
        await setDoc(docRef, baaderMachine);
        console.log('✅ Máquina Baader 200 creada con ID: baader-200');
        
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
            manuals: data.manuals || [],
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
        manuals: data.manuals || [],
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
      // Generar slug limpio: marca-modelo en minúsculas, sin espacios ni caracteres especiales
      const slug = `${machineData.marca}-${machineData.modelo}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^a-z0-9-]/g, '-')      // Reemplazar caracteres especiales por -
        .replace(/-+/g, '-')              // Múltiples - por uno solo
        .replace(/^-|-$/g, '');           // Quitar - al inicio y final
      
      // Calcular el siguiente orden
      const maxOrden = machines.length > 0 
        ? Math.max(...machines.map(m => m.orden)) 
        : -1;
      
      const newMachine = {
        ...machineData,
        activa: machineData.activa ?? true,
        orden: maxOrden + 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      // Usar setDoc con ID específico en lugar de addDoc
      const docRef = doc(db, COLLECTION_NAME, slug);
      
      // Verificar si ya existe (desde servidor, evitando caché)
      let existingDoc;
      try {
        existingDoc = await getDocFromServer(docRef);
      } catch {
        // Fallback (por ejemplo si está offline): usar caché/local
        existingDoc = await getDoc(docRef);
      }

      if (existingDoc.exists()) {
        throw new Error(`Ya existe una máquina con el ID "${slug}". Usa una marca/modelo diferente.`);
      }
      
      await setDoc(docRef, newMachine);
      
      // NO llamar fetchMachines - el listener onSnapshot actualizará automáticamente
      // await fetchMachines();
      
      return slug;
    } catch (err) {
      console.error('Error creating machine:', err);
      throw err instanceof Error ? err : new Error('Error al crear la máquina');
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

  // Listener en tiempo real para cambios en máquinas
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, COLLECTION_NAME), orderBy('orden', 'asc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const machinesData = snapshot.docs.map(doc => {
          const data = doc.data();
          const machine = {
            id: doc.id,
            nombre: data.nombre,
            marca: data.marca,
            modelo: data.modelo,
            descripcion: data.descripcion || '',
            activa: data.activa !== false,
            color: data.color || '#3b82f6',
            orden: data.orden || 0,
            manuals: data.manuals || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
          } as Machine;
          return machine;
        });
        
        setMachines(machinesData);
        setLoading(false);
        
        // Si no hay máquinas, crear Baader 200 por defecto
        if (machinesData.length === 0) {
          const baaderMachine = {
            nombre: 'Baader 200',
            marca: 'Baader',
            modelo: '200',
            descripcion: 'Máquina principal',
            activa: true,
            color: '#3b82f6',
            orden: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          
          const docRef = doc(db, COLLECTION_NAME, 'baader-200');
          setDoc(docRef, baaderMachine);
        }
      },
      (err) => {
        console.error('Error en listener de máquinas:', err);
        setError('Error al cargar las máquinas');
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
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
