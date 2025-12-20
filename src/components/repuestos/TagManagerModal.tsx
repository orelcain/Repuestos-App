import { useState, useMemo } from 'react';
import { Repuesto, TAGS_PREDEFINIDOS } from '../../types';
import { X, Tag, Edit2, Trash2, Check, AlertTriangle } from 'lucide-react';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  repuestos: Repuesto[];
  onRenameTag: (oldName: string, newName: string) => Promise<number>;
  onDeleteTag: (tagName: string) => Promise<number>;
}

export function TagManagerModal({
  isOpen,
  onClose,
  repuestos,
  onRenameTag,
  onDeleteTag
}: TagManagerModalProps) {
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Obtener todos los tags personalizados (no predefinidos) con su conteo
  const customTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    
    repuestos.forEach(r => {
      r.tags?.forEach(tag => {
        if (!TAGS_PREDEFINIDOS.includes(tag as any)) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
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

  const handleSaveEdit = async () => {
    if (!editingTag || !editValue.trim()) return;
    
    const newName = editValue.trim();
    
    // Validaciones
    if (newName === editingTag) {
      handleCancelEdit();
      return;
    }

    if (TAGS_PREDEFINIDOS.includes(newName as any)) {
      setMessage({ type: 'error', text: 'No se puede usar un nombre de tag predefinido' });
      return;
    }

    const existingTag = customTags.find(t => t.name.toLowerCase() === newName.toLowerCase() && t.name !== editingTag);
    if (existingTag) {
      setMessage({ type: 'error', text: 'Ya existe un tag con ese nombre' });
      return;
    }

    setLoading(true);
    try {
      const count = await onRenameTag(editingTag, newName);
      setMessage({ type: 'success', text: `Tag renombrado en ${count} repuesto(s)` });
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

    setLoading(true);
    try {
      const count = await onDeleteTag(deletingTag);
      setMessage({ type: 'success', text: `Tag eliminado de ${count} repuesto(s)` });
      setDeletingTag(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al eliminar el tag' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary-600" />
            Gestionar Tags Personalizados
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje */}
        {message && (
          <div className={`px-5 py-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Contenido */}
        <div className="p-5 max-h-96 overflow-y-auto">
          {customTags.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay tags personalizados</p>
              <p className="text-sm">Los tags se crean al asignarlos a los repuestos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customTags.map(({ name, count }) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {editingTag === name ? (
                    // Modo edición
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <button
                        onClick={handleSaveEdit}
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
                  ) : deletingTag === name ? (
                    // Confirmación de eliminación
                    <div className="flex items-center gap-3 flex-1">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">¿Eliminar "{name}"?</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={handleConfirmDelete}
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
                  ) : (
                    // Vista normal
                    <>
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-primary-500" />
                        <span className="font-medium text-gray-800">{name}</span>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                          {count} repuesto{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
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
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            Solo se muestran tags personalizados. Los tags predefinidos no se pueden editar ni eliminar.
          </p>
        </div>
      </div>
    </div>
  );
}
