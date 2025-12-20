import { useState, useMemo } from 'react';
import { Repuesto } from '../../types';
import { useTags } from '../../hooks/useTags';
import { X, Tag, Edit2, Trash2, Check, AlertTriangle, Plus, Settings, List } from 'lucide-react';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  repuestos: Repuesto[];
  onRenameTag: (oldName: string, newName: string) => Promise<number>;
  onDeleteTag: (tagName: string) => Promise<number>;
}

type TabType = 'en-uso' | 'predefinidos';

export function TagManagerModal({
  isOpen,
  onClose,
  repuestos,
  onRenameTag,
  onDeleteTag
}: TagManagerModalProps) {
  const { tags: globalTags, addTag, removeTag, renameTag: renameGlobalTag, loading: tagsLoading } = useTags();
  
  const [activeTab, setActiveTab] = useState<TabType>('en-uso');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Para agregar nuevo tag predefinido
  const [newTagName, setNewTagName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Obtener todos los tags en uso con su conteo
  const tagsEnUso = useMemo(() => {
    const tagCounts = new Map<string, number>();
    
    repuestos.forEach(r => {
      r.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [repuestos]);

  const handleStartEdit = (tagName: string) => {
    setEditingTag(tagName);
    setEditValue(tagName);
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditValue('');
  };

  const handleSaveEdit = async (isGlobalOnly: boolean = false) => {
    if (!editingTag || !editValue.trim()) return;
    
    const newName = editValue.trim();
    
    if (newName === editingTag) {
      handleCancelEdit();
      return;
    }

    // Verificar duplicados
    const existsInUse = tagsEnUso.some(t => t.name.toLowerCase() === newName.toLowerCase() && t.name !== editingTag);
    const existsGlobal = globalTags.some(t => t.toLowerCase() === newName.toLowerCase() && t !== editingTag);
    
    if (existsInUse || existsGlobal) {
      setMessage({ type: 'error', text: 'Ya existe un tag con ese nombre' });
      return;
    }

    setLoading(true);
    try {
      if (isGlobalOnly) {
        // Solo renombrar en lista global (no afecta repuestos)
        await renameGlobalTag(editingTag, newName);
        setMessage({ type: 'success', text: 'Tag predefinido actualizado' });
      } else {
        // Renombrar en repuestos Y en lista global
        const count = await onRenameTag(editingTag, newName);
        await renameGlobalTag(editingTag, newName);
        setMessage({ type: 'success', text: `Tag renombrado en ${count} repuesto(s)` });
      }
      handleCancelEdit();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al renombrar el tag' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartDelete = (tagName: string) => {
    setDeletingTag(tagName);
    setMessage(null);
  };

  const handleCancelDelete = () => {
    setDeletingTag(null);
  };

  const handleConfirmDelete = async (isGlobalOnly: boolean = false) => {
    if (!deletingTag) return;

    setLoading(true);
    try {
      if (isGlobalOnly) {
        // Solo quitar de la lista global
        await removeTag(deletingTag);
        setMessage({ type: 'success', text: 'Tag eliminado de la lista predefinida' });
      } else {
        // Eliminar de repuestos Y de lista global
        const count = await onDeleteTag(deletingTag);
        await removeTag(deletingTag);
        setMessage({ type: 'success', text: `Tag eliminado de ${count} repuesto(s)` });
      }
      setDeletingTag(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al eliminar el tag' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    const existsInUse = tagsEnUso.some(t => t.name.toLowerCase() === trimmed.toLowerCase());
    const existsGlobal = globalTags.some(t => t.toLowerCase() === trimmed.toLowerCase());
    
    if (existsInUse || existsGlobal) {
      setMessage({ type: 'error', text: 'Ya existe un tag con ese nombre' });
      return;
    }

    setLoading(true);
    try {
      await addTag(trimmed);
      setNewTagName('');
      setShowAddForm(false);
      setMessage({ type: 'success', text: 'Tag agregado a la lista predefinida' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al agregar el tag' });
    } finally {
      setLoading(false);
    }
  };

  // Agregar tag en uso a la lista de predefinidos
  const handleAddToPredefinidos = async (tagName: string) => {
    if (globalTags.includes(tagName)) {
      setMessage({ type: 'error', text: 'Este tag ya está en la lista predefinida' });
      return;
    }
    
    setLoading(true);
    try {
      await addTag(tagName);
      setMessage({ type: 'success', text: 'Tag agregado a la lista predefinida' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al agregar el tag' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderTagItem = (
    name: string, 
    count: number | null, 
    isGlobalOnly: boolean,
    isInPredefinidos: boolean
  ) => {
    if (editingTag === name) {
      return (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit(isGlobalOnly);
              if (e.key === 'Escape') handleCancelEdit();
            }}
          />
          <button
            onClick={() => handleSaveEdit(isGlobalOnly)}
            disabled={loading}
            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
            title="Guardar"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancelEdit}
            disabled={loading}
            className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
            title="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }
    
    if (deletingTag === name) {
      return (
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span className="text-sm text-gray-700">¿Eliminar "{name}"?</span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => handleConfirmDelete(isGlobalOnly)}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Eliminar
            </button>
            <button
              onClick={handleCancelDelete}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center gap-3">
          <Tag className="w-4 h-4 text-primary-500" />
          <span className="font-medium text-gray-800">{name}</span>
          {count !== null && (
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
              {count} repuesto{count !== 1 ? 's' : ''}
            </span>
          )}
          {isInPredefinidos && count !== null && (
            <span className="text-xs text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
              predefinido
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Botón agregar a predefinidos (solo si está en uso y no está en la lista global) */}
          {count !== null && !isInPredefinidos && (
            <button
              onClick={() => handleAddToPredefinidos(name)}
              disabled={loading}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
              title="Agregar a predefinidos"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleStartEdit(name)}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartDelete(name)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
      onMouseDown={(e) => {
        // Solo cerrar si el click fue directamente en el overlay, no si fue arrastrado
        if (e.target === e.currentTarget && !window.getSelection()?.toString()) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary-600" />
            Gestionar Tags
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('en-uso')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'en-uso'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <List className="w-4 h-4" />
            En Uso ({tagsEnUso.length})
          </button>
          <button
            onClick={() => setActiveTab('predefinidos')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'predefinidos'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Predefinidos ({globalTags.length})
          </button>
        </div>

        {/* Mensaje */}
        {message && (
          <div className={`px-5 py-3 flex-shrink-0 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'en-uso' ? (
            // Tab: Tags en uso
            tagsEnUso.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No hay tags en uso</p>
                <p className="text-sm">Los tags se crean al asignarlos a los repuestos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tagsEnUso.map(({ name, count }) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {renderTagItem(name, count, false, globalTags.includes(name))}
                  </div>
                ))}
              </div>
            )
          ) : (
            // Tab: Tags predefinidos
            <div className="space-y-4">
              {/* Botón agregar nuevo */}
              {showAddForm ? (
                <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-lg border border-primary-200">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nombre del nuevo tag..."
                    className="flex-1 px-3 py-1.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddNewTag();
                      if (e.key === 'Escape') {
                        setShowAddForm(false);
                        setNewTagName('');
                      }
                    }}
                  />
                  <button
                    onClick={handleAddNewTag}
                    disabled={loading || !newTagName.trim()}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Guardar"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewTagName('');
                    }}
                    className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Agregar nuevo tag predefinido
                </button>
              )}

              {/* Lista de tags predefinidos */}
              {tagsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Cargando tags...
                </div>
              ) : globalTags.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay tags predefinidos</p>
                  <p className="text-sm">Agrega tags para usarlos rápidamente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {globalTags.map((name) => {
                    const usageInfo = tagsEnUso.find(t => t.name === name);
                    return (
                      <div
                        key={name}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          usageInfo 
                            ? 'bg-primary-50 border-primary-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        {renderTagItem(name, usageInfo?.count ?? null, !usageInfo, true)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-500">
            {activeTab === 'en-uso' 
              ? 'Edita o elimina tags de los repuestos. Usa + para agregar a predefinidos.'
              : 'Administra los tags predefinidos que aparecerán para selección rápida.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
