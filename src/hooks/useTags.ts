import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

// Tags iniciales por defecto (se usan si no hay datos en Firestore)
const DEFAULT_TAGS = [
  'Overhaul temporada baja',
  'Urgentes este mes',
  'Críticos',
  'En espera proveedor',
  'Pedido realizado',
  'Stock mínimo',
  'Repuestos varios',
  'Preventivo mensual'
];

// Documento donde se guardan los tags globales
const SETTINGS_DOC = 'settings/tags';

interface TagsData {
  tags: string[];
  updatedAt: Date;
}

export function useTags() {
  const [tags, setTags] = useState<string[]>(DEFAULT_TAGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar cambios en tiempo real
  useEffect(() => {
    const docRef = doc(db, SETTINGS_DOC);
    
    const unsubscribe = onSnapshot(docRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as TagsData;
          setTags(data.tags || DEFAULT_TAGS);
        } else {
          // Si no existe el documento, crearlo con tags por defecto
          setDoc(docRef, { 
            tags: DEFAULT_TAGS, 
            updatedAt: new Date() 
          }).catch(console.error);
          setTags(DEFAULT_TAGS);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error al obtener tags:', err);
        setError(err.message);
        setLoading(false);
        // Usar tags por defecto si hay error
        setTags(DEFAULT_TAGS);
      }
    );

    return () => unsubscribe();
  }, []);

  // Guardar tags en Firestore
  const saveTags = useCallback(async (newTags: string[]) => {
    try {
      const docRef = doc(db, SETTINGS_DOC);
      await setDoc(docRef, { 
        tags: newTags, 
        updatedAt: new Date() 
      });
      return true;
    } catch (err) {
      console.error('Error al guardar tags:', err);
      setError((err as Error).message);
      return false;
    }
  }, []);

  // Agregar un tag nuevo si no existe
  const addTag = useCallback(async (newTag: string) => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag || tags.includes(trimmedTag)) {
      return false; // Tag vacío o ya existe
    }
    
    const updatedTags = [...tags, trimmedTag].sort((a, b) => 
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
    return await saveTags(updatedTags);
  }, [tags, saveTags]);

  // Eliminar un tag
  const removeTag = useCallback(async (tagToRemove: string) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    return await saveTags(updatedTags);
  }, [tags, saveTags]);

  // Renombrar un tag
  const renameTag = useCallback(async (oldTag: string, newTag: string) => {
    const trimmedNew = newTag.trim();
    if (!trimmedNew || (tags.includes(trimmedNew) && trimmedNew !== oldTag)) {
      return false; // Tag vacío o ya existe otro con ese nombre
    }
    
    const updatedTags = tags.map(t => t === oldTag ? trimmedNew : t)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    return await saveTags(updatedTags);
  }, [tags, saveTags]);

  // Agregar múltiples tags a la vez (útil para importación)
  const addMultipleTags = useCallback(async (newTags: string[]) => {
    const uniqueNewTags = newTags
      .map(t => t.trim())
      .filter(t => t && !tags.includes(t));
    
    if (uniqueNewTags.length === 0) return true;
    
    const updatedTags = [...tags, ...uniqueNewTags].sort((a, b) => 
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
    return await saveTags(updatedTags);
  }, [tags, saveTags]);

  return {
    tags,
    loading,
    error,
    addTag,
    removeTag,
    renameTag,
    addMultipleTags,
    saveTags,
    DEFAULT_TAGS
  };
}
