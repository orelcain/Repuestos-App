import { useState, useCallback } from 'react';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../config/firebase';
import { ImagenRepuesto } from '../types';
import { optimizeImage } from '../utils/imageUtils';

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
      // Optimización en cliente: reduce dimensiones/peso antes de subir.
      // Nota: no optimizamos GIF/SVG para no romper animaciones/vectores.
      const shouldOptimize = file.type.startsWith('image/') && !['image/gif', 'image/svg+xml'].includes(file.type);
      let fileToUpload = file;
      if (shouldOptimize) {
        try {
          fileToUpload = (await optimizeImage(file, 0.85)).file;
        } catch (err) {
          console.warn('[useStorage] No se pudo optimizar imagen; subiendo original', err);
          fileToUpload = file;
        }
      }

      const timestamp = Date.now();
      const fileName = `${timestamp}_${fileToUpload.name}`;
      
      // COMPATIBILIDAD: Para Baader 200, usar rutas antiguas
      const path = machineId === 'baader-200'
        ? `repuestos/${repuestoId}/${tipo}/${fileName}`
        : `machines/${machineId}/repuestos/${repuestoId}/${tipo}/${fileName}`;
      
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, fileToUpload);
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
      // Usar nombre único por archivo para evitar sobrescribir
      const timestamp = Date.now();
      const baseName = manualName || 'manual';
      const ext = file.name.split('.').pop() || 'pdf';
      const uniqueName = `${baseName}_${timestamp}.${ext}`;

      // Estructura unificada para todas las máquinas
      const path = `machines/${machineId}/manuales/${uniqueName}`;
      
      console.log('📁 [useStorage] Upload path for machine', machineId, ':', path);
      const storageRef = ref(storage, path);

      // Upload con progreso real
      const uploadTask = uploadBytesResumable(storageRef, file);

      const url = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = snapshot.totalBytes > 0
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              : 0;
            setProgress(pct);
          },
          (error) => {
            reject(error);
          },
          async () => {
            try {
              setProgress(100);
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      return url;
    } catch (err) {
      console.error('Error al subir PDF:', err);
      throw err;
    } finally {
      setUploading(false);
      // Mantener el progreso visible (p.ej. 100%) hasta el próximo upload
    }
  }, [machineId]);

  // Obtener URL del manual - busca cualquier PDF en las carpetas usando listAll()
  const getManualURL = useCallback(async (manualName: string = 'manual_principal'): Promise<string | null> => {
    if (!machineId) {
      return null;
    }

    // Estructura unificada (aislamiento total): machines/{machineId}/manuales
    const folder = `machines/${machineId}/manuales`;
    try {
      const folderRef = ref(storage, folder);
      const listResult = await listAll(folderRef);

      // Buscar el primer archivo PDF
      for (const item of listResult.items) {
        if (item.name.toLowerCase().endsWith('.pdf')) {
          const url = await getDownloadURL(item);
          console.log(`✅ Manual encontrado: ${folder}/${item.name}`);
          return url;
        }
      }
    } catch {
      // Silenciosamente retornar null (normal para máquinas nuevas sin manual)
      return null;
    }

    // Silenciosamente retornar null (normal para máquinas nuevas sin manual)
    return null;
  }, [machineId]);

  // Subir infografía/diagrama (imagen, PDF, modelo 3D)
  const uploadInfografia = useCallback(async (file: File, fileName?: string): Promise<string> => {
    if (!machineId) {
      throw new Error('Machine ID is required');
    }

    setUploading(true);
    setProgress(0);

    try {
      const timestamp = Date.now();
      const baseName = fileName || file.name.replace(/\.[^/.]+$/, '') || 'infografia';
      const ext = file.name.split('.').pop() || 'png';
      const uniqueName = `${baseName}_${timestamp}.${ext}`;

      const path = `machines/${machineId}/infografias/${uniqueName}`;
      
      console.log('📊 [useStorage] Upload infografia path for machine', machineId, ':', path);
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file);
      setProgress(100);

      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err) {
      console.error('Error al subir infografía:', err);
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [machineId]);

  return {
    uploading,
    progress,
    uploadImage,
    deleteImage,
    uploadManualPDF,
    getManualURL,
    uploadInfografia
  };
}
