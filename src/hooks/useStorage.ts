import { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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

  // Obtener URL del manual
  const getManualURL = useCallback(async (manualName: string = 'manual_principal'): Promise<string | null> => {
    if (!machineId) {
      return null;
    }

    // Lista de rutas posibles para buscar el manual (en orden de prioridad)
    const possiblePaths = machineId === 'baader-200' 
      ? [
          `manual/${manualName}.pdf`,           // Ruta antigua singular
          `manuales/${manualName}.pdf`,         // Ruta antigua plural
          `manual/manual_principal.pdf`,        // Hardcoded nombre por defecto
          `manuales/manual_principal.pdf`,      // Plural con nombre por defecto
        ]
      : [
          `machines/${machineId}/manuales/${manualName}.pdf`,
          `machines/${machineId}/manual/${manualName}.pdf`,
        ];

    // Intentar cada ruta hasta encontrar el archivo
    for (const path of possiblePaths) {
      try {
        const storageRef = ref(storage, path);
        const url = await getDownloadURL(storageRef);
        console.log(`✅ Manual encontrado en: ${path}`);
        return url;
      } catch (err) {
        // Continuar con la siguiente ruta
        continue;
      }
    }

    console.warn(`⚠️ Manual no encontrado en ninguna de las rutas probadas para machineId: ${machineId}`);
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
