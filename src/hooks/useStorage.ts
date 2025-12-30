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
      const path = `machines/${machineId}/repuestos/${repuestoId}/${tipo}/${fileName}`;
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
      const path = `machines/${machineId}/manuales/${manualName}.pdf`;
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

    try {
      const path = `machines/${machineId}/manuales/${manualName}.pdf`;
      const storageRef = ref(storage, path);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err) {
      console.error('Manual no encontrado:', err);
      return null;
    }
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
