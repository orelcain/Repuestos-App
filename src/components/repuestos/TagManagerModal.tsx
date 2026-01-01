import { useState, useMemo, useEffect } from 'react';
import { Repuesto, getTagNombre, TagGlobal } from '../../types';
import { useTags } from '../../hooks/useTags';
import { X, Tag, Edit2, Trash2, Check, AlertTriangle, Plus, ShoppingCart, Package } from 'lucide-react';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  machineId: string | null;
  repuestos: Repuesto[];
  onRenameTag: (oldName: string, newName: string) => Promise<number>;
  onDeleteTag: (tagName: string) => Promise<number>;
}

export function TagManagerModal({
  isOpen,
  onClose,
  machineId,
  repuestos,
  onRenameTag,
  onDeleteTag
}: TagManagerModalProps) {
  const { 
    tags: allTags,
    tagsGlobales,
    addTag, 
    removeTag, 
    renameTag: renameGlobalTag,
    changeTagTipo,
    loading: tagsLoading, 
    addMultipleTags 
  } = useTags(repuestos, machineId);
  
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Para agregar nuevo tag predefinido
  const [newTagName, setNewTagName] = useState('');
  const [newTagTipo, setNewTagTipo] = useState<'solicitud' | 'stock'>('solicitud');
  const [showAddForm, setShowAddForm] = useState(false);

  // Obtener todos los tags en uso con su conteo
  const tagsEnUso = useMemo(() => {
    const tagCounts = new Map<string, number>();
    
    repuestos.forEach(r => {
      r.tags?.forEach(tag => {
        const tagName = getTagNombre(tag);
        tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [repuestos]);

  // Sincronizar tags en uso con la lista global al abrir el modal
  useEffect(() => {
    if (isOpen && !tagsLoading && tagsEnUso.length > 0) {
      const tagsEnUsoNames = tagsEnUso.map(t => t.name);
      const tagsFaltantes = tagsEnUsoNames.filter(tagName => 
        !tagsGlobales.some(gt => gt.nombre === tagName)
      );
      
      if (tagsFaltantes.length > 0) {
        console.log('Sincronizando tags faltantes:', tagsFaltantes);
        // Inferir tipo basado en el nombre
        const tagsToAdd = tagsFaltantes.map(nombre => ({
          nombre,
          tipo: nombre.toLowerCase().includes('stock') ? 'stock' as const : 'solicitud' as const
        }));
        addMultipleTags(tagsToAdd);
      }
    }
  }, [isOpen, tagsLoading, tagsEnUso, tagsGlobales, addMultipleTags]);

  const handleStartEdit = (tagName: string) => {
    setEditingTag(tagName);
    setEditValue(tagName);
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    if (!editingTag || !editValue.trim()) return;

    if (!machineId) {
      setMessage({ type: 'error', text: 'Selecciona una máquina para gestionar tags' });
      return;
    }
    
    const newName = editValue.trim();
    
    if (newName === editingTag) {
      handleCancelEdit();
      return;
    }

    // Verificar duplicados
    const existsInUse = tagsEnUso.some(t => t.name.toLowerCase() === newName.toLowerCase() && t.name !== editingTag);
    const existsGlobal = allTags.some(t => t.nombre.toLowerCase() === newName.toLowerCase() && t.nombre !== editingTag);
    
    if (existsInUse || existsGlobal) {
      setMessage({ type: 'error', text: 'Ya existe un tag con ese nombre' });
      return;
    }

    setLoading(true);
    try {
      // Renombrar en lista global
      await renameGlobalTag(editingTag, newName);
      
      // Si el tag está en uso, también renombrar en todos los repuestos
      const tagInUse = tagsEnUso.find(t => t.name === editingTag);
      if (tagInUse && tagInUse.count > 0) {
        const count = await onRenameTag(editingTag, newName);
        setMessage({ type: 'success', text: `Tag renombrado en ${count} repuesto(s)` });
      } else {
        setMessage({ type: 'success', text: 'Tag actualizado' });
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

  const handleConfirmDelete = async () => {
    if (!deletingTag) return;

    if (!machineId) {
      setMessage({ type: 'error', text: 'Selecciona una máquina para gestionar tags' });
      return;
    }

    setLoading(true);
    try {
      // Eliminar de lista global
      await removeTag(deletingTag);
      
      // Si el tag está en uso, también eliminarlo de todos los repuestos
      const tagInUse = tagsEnUso.find(t => t.name === deletingTag);
      if (tagInUse && tagInUse.count > 0) {
        const count = await onDeleteTag(deletingTag);
        setMessage({ type: 'success', text: `Tag eliminado de ${count} repuesto(s)` });
      } else {
        setMessage({ type: 'success', text: 'Tag eliminado' });
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

    if (!machineId) {
      setMessage({ type: 'error', text: 'Selecciona una máquina para gestionar tags' });
      return;
    }

    const existsInUse = tagsEnUso.some(t => t.name.toLowerCase() === trimmed.toLowerCase());
    const existsGlobal = allTags.some(t => t.nombre.toLowerCase() === trimmed.toLowerCase());
    
    if (existsInUse || existsGlobal) {
      setMessage({ type: 'error', text: 'Ya existe un tag con ese nombre' });
      return;
    }

    setLoading(true);
    try {
      await addTag(trimmed, newTagTipo);
      setNewTagName('');
      setNewTagTipo('solicitud');
      setShowAddForm(false);
      setMessage({ type: 'success', text: `Tag "${trimmed}" agregado como ${newTagTipo === 'solicitud' ? 'Solicitud' : 'Stock'}` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al agregar el tag' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeTipo = async (tagNombre: string, nuevoTipo: 'solicitud' | 'stock') => {
    if (!machineId) {
      setMessage({ type: 'error', text: 'Selecciona una máquina para gestionar tags' });
      return;
    }

    setLoading(true);
    try {
      await changeTagTipo(tagNombre, nuevoTipo);
      setMessage({ type: 'success', text: `Tag "${tagNombre}" cambiado a ${nuevoTipo === 'solicitud' ? 'Solicitud' : 'Stock'}` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al cambiar el tipo' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderTagItem = (tag: TagGlobal, count: number | null) => {
    const { nombre, tipo } = tag;
    
    if (editingTag === nombre) {
      return (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-primary-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') handleCancelEdit();
            }}
          />
          <button
            onClick={() => handleSaveEdit()}
            disabled={loading}
            className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
            title="Guardar"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancelEdit}
            disabled={loading}
            className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }
    
    if (deletingTag === nombre) {
      return (
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span className="text-sm text-gray-700 dark:text-gray-200">¿Eliminar "{nombre}"?</span>
          {count !== null && count > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400">(se quitará de {count} repuesto{count !== 1 ? 's' : ''})</span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => handleConfirmDelete()}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Eliminar
            </button>
            <button
              onClick={handleCancelDelete}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center gap-3 flex-1">
          {/* Icono según tipo */}
          {tipo === 'solicitud' ? (
            <ShoppingCart className="w-4 h-4 text-blue-500" />
          ) : (
            <Package className="w-4 h-4 text-green-500" />
          )}
          
          <span className="font-medium text-gray-800 dark:text-gray-100">{nombre}</span>
          
          {/* Badge de tipo */}
          <button
            onClick={() => handleChangeTipo(nombre, tipo === 'solicitud' ? 'stock' : 'solicitud')}
            disabled={loading}
            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
              tipo === 'solicitud'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50'
                : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50'
            }`}
            title="Click para cambiar tipo"
          >
            {tipo === 'solicitud' ? '🛒 Solicitud' : '📦 Stock'}
          </button>
          
          {count !== null && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
              {count} repuesto{count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStartEdit(nombre)}
            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title="Editar nombre"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartDelete(nombre)}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </>
    );
  };

  // Separar tags por tipo para mejor visualización
  const tagsSolicitud = allTags.filter(t => t.tipo === 'solicitud');
  const tagsStock = allTags.filter(t => t.tipo === 'stock');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !window.getSelection()?.toString()) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
              <Tag className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Gestor de Tags/Eventos</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {allTags.length} tags ({tagsSolicitud.length} solicitudes, {tagsStock.length} stock) • {tagsEnUso.reduce((sum, t) => sum + t.count, 0)} asignaciones
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Mensaje */}
        {message && (
          <div className={`px-5 py-3 flex-shrink-0 ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
            {message.text}
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-6">
            {/* Formulario agregar nuevo */}
            {showAddForm ? (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-200 dark:border-primary-700">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nombre del nuevo tag/evento..."
                    className="flex-1 px-3 py-2 border border-primary-300 dark:border-primary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddNewTag();
                      if (e.key === 'Escape') {
                        setShowAddForm(false);
                        setNewTagName('');
                      }
                    }}
                  />
                </div>
                
                {/* Selector de tipo */}
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Tipo:</span>
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    newTagTipo === 'solicitud' ? 'bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-400 dark:border-blue-600' : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>
                    <input
                      type="radio"
                      name="newTagTipo"
                      value="solicitud"
                      checked={newTagTipo === 'solicitud'}
                      onChange={() => setNewTagTipo('solicitud')}
                      className="sr-only"
                    />
                    <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Solicitud</span>
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    newTagTipo === 'stock' ? 'bg-green-100 dark:bg-green-900/50 border-2 border-green-400 dark:border-green-600' : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>
                    <input
                      type="radio"
                      name="newTagTipo"
                      value="stock"
                      checked={newTagTipo === 'stock'}
                      onChange={() => setNewTagTipo('stock')}
                      className="sr-only"
                    />
                    <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Stock</span>
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddNewTag}
                    disabled={loading || !newTagName.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    Crear Tag
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewTagName('');
                      setNewTagTipo('solicitud');
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-400 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar nuevo tag/evento
              </button>
            )}

            {/* Lista de tags */}
            {tagsLoading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Cargando tags...
              </div>
            ) : allTags.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>No hay tags disponibles</p>
                <p className="text-sm">Crea tags de tipo Solicitud o Stock para organizar tus eventos</p>
              </div>
            ) : (
              <>
                {/* Tags de Solicitud */}
                {tagsSolicitud.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-gray-700 dark:text-gray-200">Solicitudes ({tagsSolicitud.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {tagsSolicitud.map((tag) => {
                        const usageInfo = tagsEnUso.find(t => t.name === tag.nombre);
                        return (
                          <div
                            key={tag.nombre}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              usageInfo 
                                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' 
                                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {renderTagItem(tag, usageInfo?.count ?? null)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tags de Stock */}
                {tagsStock.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold text-gray-700 dark:text-gray-200">Stock ({tagsStock.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {tagsStock.map((tag) => {
                        const usageInfo = tagsEnUso.find(t => t.name === tag.nombre);
                        return (
                          <div
                            key={tag.nombre}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              usageInfo 
                                ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' 
                                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {renderTagItem(tag, usageInfo?.count ?? null)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <ShoppingCart className="w-3 h-3 text-blue-500" />
              Solicitud = Cantidad a pedir
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3 text-green-500" />
              Stock = Inventario en bodega
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            💡 Click en el badge de tipo para cambiar entre Solicitud y Stock
          </p>
        </div>
      </div>
    </div>
  );
}
