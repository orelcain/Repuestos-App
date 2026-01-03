import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../config/firebase';

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]+/g, '_');

const newId = () => {
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function usePlantStorage() {
  const uploadPlantMapImage = async (file: File, mapId: string) => {
    const id = newId();
    const path = `plantMaps/${mapId}/${id}-${safeFileName(file.name)}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { url, path };
  };

  const uploadPlantAssetImage = async (file: File, assetId: string) => {
    const id = newId();
    const path = `plantAssets/${assetId}/imagenes/${id}-${safeFileName(file.name)}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { url, path };
  };

  const deleteByPath = async (path: string) => {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  };

  return { uploadPlantMapImage, uploadPlantAssetImage, deleteByPath };
}
