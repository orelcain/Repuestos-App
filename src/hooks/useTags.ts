import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TagGlobal } from '../types';

// Tags iniciales por defecto (se usan si no hay datos en Firestore)
const DEFAULT_TAGS: TagGlobal[] = [
  { nombre: 'Overhaul temporada baja', tipo: 'solicitud' },
  { nombre: 'Urgentes este mes', tipo: 'solicitud' },
  { nombre: 'Críticos', tipo: 'solicitud' },
  { nombre: 'En espera proveedor', tipo: 'solicitud' },
  { nombre: 'Pedido realizado', tipo: 'solicitud' },
  { nombre: 'Stock mínimo', tipo: 'stock' },
  { nombre: 'Stock actual', tipo: 'stock' },
  { nombre: 'Preventivo mensual', tipo: 'solicitud' }
];

// Documento donde se guardan los tags globales
const SETTINGS_DOC = 'settings/tags';

// Helper para migrar tags antiguos (strings) al nuevo formato
function migrateOldTags(tags: (string | TagGlobal)[]): TagGlobal[] {
  return tags.map(tag => {
    if (typeof tag === 'string') {
      // Inferir tipo basado en el nombre
      const tipo = tag.toLowerCase().includes('stock') ? 'stock' : 'solicitud';
      return { nombre: tag, tipo };
    }
    return tag;
  });
}

export function useTags() {
  const [tags, setTags] = useState<TagGlobal[]>(DEFAULT_TAGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Escuchar cambios en tiempo real
  useEffect(() => {
    const docRef = doc(db, SETTINGS_DOC);
    
    const unsubscribe = onSnapshot(docRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Migrar si es formato antiguo (array de strings)
          const rawTags = data.tags || DEFAULT_TAGS;
          const migratedTags = migrateOldTags(rawTags);
          setTags(migratedTags);
          
          // Si hubo migración, guardar el nuevo formato
          if (rawTags.some((t: unknown) => typeof t === 'string')) {
            setDoc(docRef, { 
              tags: migratedTags, 
              updatedAt: new Date() 
            }).catch(console.error);
          }
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
  const saveTags = useCallback(async (newTags: TagGlobal[]) => {
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
  const addTag = useCallback(async (nombre: string, tipo: 'solicitud' | 'stock' = 'solicitud') => {
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre || tags.some(t => t.nombre === trimmedNombre)) {
      return false; // Tag vacío o ya existe
    }
    
    const newTag: TagGlobal = { nombre: trimmedNombre, tipo, createdAt: new Date() };
    const updatedTags = [...tags, newTag].sort((a, b) => 
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );
    return await saveTags(updatedTags);
  }, [tags, saveTags]);

  // Eliminar un tag
  const removeTag = useCallback(async (tagNombre: string) => {
    const updatedTags = tags.filter(t => t.nombre !== tagNombre);
    return await saveTags(updatedTags);
  }, [tags, saveTags]);

  // Renombrar un tag
  const renameTag = useCallback(async (oldNombre: string, newNombre: string) => {
    const trimmedNew = newNombre.trim();
    if (!trimmedNew || (tags.some(t => t.nombre === trimmedNew) && trimmedNew !== oldNombre)) {
      return false; // Tag vacío o ya existe otro con ese nombre
    }
    
    const updatedTags = tags.map(t => 
      t.nombre === oldNombre ? { ...t, nombre: trimmedNew } : t
    ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    return await saveTags(updatedTags);
  }, [tags, saveTags]);

  // Cambiar el tipo de un tag
  const changeTagTipo = useCallback(async (tagNombre: string, nuevoTipo: 'solicitud' | 'stock') => {
    const updatedTags = tags.map(t => 
      t.nombre === tagNombre ? { ...t, tipo: nuevoTipo } : t
    );
    return await saveTags(updatedTags);
  }, [tags, saveTags]);

  // Obtener el tipo de un tag por su nombre
  const getTagTipo = useCallback((tagNombre: string): 'solicitud' | 'stock' | null => {
    const tag = tags.find(t => t.nombre === tagNombre);
    return tag ? tag.tipo : null;
  }, [tags]);

  // Agregar múltiples tags a la vez (útil para importación)
  const addMultipleTags = useCallback(async (newTags: { nombre: string; tipo: 'solicitud' | 'stock' }[]) => {
    const uniqueNewTags = newTags
      .filter(t => t.nombre.trim() && !tags.some(existing => existing.nombre === t.nombre.trim()))
      .map(t => ({ ...t, nombre: t.nombre.trim(), createdAt: new Date() }));
    
    if (uniqueNewTags.length === 0) return true;
    
    const updatedTags = [...tags, ...uniqueNewTags].sort((a, b) => 
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
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
    changeTagTipo,
    getTagTipo,
    addMultipleTags,
    saveTags,
    DEFAULT_TAGS
  };
}
