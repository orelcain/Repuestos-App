import { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../config/firebase';
import { ImagenRepuesto } from '../types';

export function useStorage(machineId: string | null) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Subir imagen de repuesto
  const uploadImage = useCallback(async (
    file: File,
    repuestoId: string,
    tipo: 'manual' | 'real'
  ): Promise<ImagenRepuesto> => {
    if (!machineId) {
      throw new Error('Machine ID is required');
    }

    setUploading(true);
    setProgress(0);

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      
      // COMPATIBILIDAD: Para Baader 200, usar rutas antiguas
      const path = machineId === 'baader-200'
        ? `repuestos/${repuestoId}/${tipo}/${fileName}`
        : `machines/${machineId}/repuestos/${repuestoId}/${tipo}/${fileName}`;
      
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file);
      setProgress(100);

      const url = await getDownloadURL(storageRef);

      const imagen: ImagenRepuesto = {
        id: `${timestamp}`,
        url,
        descripcion: '',
        orden: 0,
        esPrincipal: false,
        tipo,
        createdAt: new Date()
      };

      return imagen;
    } catch (err) {
      console.error('Error al subir imagen:', err);
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [machineId]);

  // Eliminar imagen
  const deleteImage = useCallback(async (url: string) => {
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (err) {
      console.error('Error al eliminar imagen:', err);
      // Si el archivo no existe, no es un error crítico
    }
  }, []);

  // Subir PDF del manual
  const uploadManualPDF = useCallback(async (file: File, manualName: string = 'manual_principal'): Promise<string> => {
    if (!machineId) {
      throw new Error('Machine ID is required');
    }

    setUploading(true);
    setProgress(0);

    try {
      // COMPATIBILIDAD: Para Baader 200, usar ruta antigua
      const path = machineId === 'baader-200'
        ? `manual/${manualName}.pdf`
        : `machines/${machineId}/manuales/${manualName}.pdf`;
      
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file);
      setProgress(100);

      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err) {
      console.error('Error al subir PDF:', err);
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [machineId]);

  // Obtener URL del manual - busca cualquier PDF en las carpetas
  const getManualURL = useCallback(async (manualName: string = 'manual_principal'): Promise<string | null> => {
    if (!machineId) {
      return null;
    }

    // Determinar carpetas donde buscar según la máquina
    const folders = machineId === 'baader-200' 
      ? ['manual', 'manuales']  // Rutas antiguas para Baader 200
      : [`machines/${machineId}/manuales`, `machines/${machineId}/manual`];

    // 1. Intentar primero con nombres específicos
    const specificPaths = folders.flatMap(folder => [
      `${folder}/${manualName}.pdf`,
      `${folder}/manual_principal.pdf`,
    ]);

    for (const path of specificPaths) {
      try {
        const storageRef = ref(storage, path);
        const url = await getDownloadURL(storageRef);
        console.log(`✅ Manual encontrado en: ${path}`);
        return url;
      } catch (err) {
        continue;
      }
    }

    // 2. Si no encuentra con nombres específicos, listar TODOS los PDFs en las carpetas
    for (const folder of folders) {
      try {
        const folderRef = ref(storage, folder);
        const listResult = await listAll(folderRef);
        
        // Buscar el primer archivo PDF
        for (const item of listResult.items) {
          if (item.name.toLowerCase().endsWith('.pdf')) {
            const url = await getDownloadURL(item);
            console.log(`✅ Manual encontrado (listado): ${folder}/${item.name}`);
            return url;
          }
        }
      } catch (err) {
        continue;
      }
    }

    console.warn(`⚠️ No se encontró ningún PDF en las carpetas: ${folders.join(', ')}`);
    return null;
  }, [machineId]);

  return {
    uploading,
    progress,
    uploadImage,
    deleteImage,
    uploadManualPDF,
    getManualURL
  };
}
