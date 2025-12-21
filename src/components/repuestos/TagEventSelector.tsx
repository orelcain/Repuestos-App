import { useState } from 'react';
import { TagAsignado, isTagAsignado } from '../../types';
import { useTags } from '../../hooks/useTags';
import { Tag, X, Plus, Package, ShoppingCart, Calendar } from 'lucide-react';

interface TagEventSelectorProps {
  tags: (string | TagAsignado)[];
  onTagsChange: (tags: TagAsignado[]) => void;
  valorUnitario: number;  // Para mostrar cálculo de total
}

export function TagEventSelector({ tags, onTagsChange, valorUnitario }: TagEventSelectorProps) {
  const { tags: globalTags, addTag: addGlobalTag, getTagTipo } = useTags();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTagNombre, setNewTagNombre] = useState('');
  const [newTagCantidad, setNewTagCantidad] = useState(0);
  const [selectedGlobalTag, setSelectedGlobalTag] = useState('');

  // Convertir tags actuales a formato TagAsignado para visualización
  const tagsAsignados: TagAsignado[] = tags.map(tag => {
    if (isTagAsignado(tag)) return tag;
    // Tag antiguo - mostrar con valores por defecto, inferir tipo del tag global
    const tipo = getTagTipo(tag) || 'solicitud';
    return {
      nombre: tag,
      tipo,
      cantidad: 0,
      fecha: new Date()
    };
  });

  // Tags globales disponibles (que no están ya asignados)
  const tagsDisponibles = globalTags.filter(tag => {
    // Verificar si ya está asignado
    const yaAsignado = tagsAsignados.some(t => t.nombre === tag.nombre);
    return !yaAsignado;
  });

  // Obtener el tipo del tag seleccionado (del global)
  const selectedTagTipo = selectedGlobalTag 
    ? getTagTipo(selectedGlobalTag) 
    : newTagNombre.trim() 
      ? (newTagNombre.toLowerCase().includes('stock') ? 'stock' : 'solicitud')
      : null;

  const handleAddTag = () => {
    const nombre = selectedGlobalTag || newTagNombre.trim();
    if (!nombre || newTagCantidad < 0) return;

    // Obtener el tipo del tag global, o inferirlo si es nuevo
    const tipo = getTagTipo(nombre) || (nombre.toLowerCase().includes('stock') ? 'stock' : 'solicitud');

    const nuevoTag: TagAsignado = {
      nombre,
      tipo,
      cantidad: newTagCantidad,
      fecha: new Date()
    };

    // Si es un tag nuevo, agregarlo a la lista global con el tipo inferido
    if (!globalTags.some(t => t.nombre === nombre)) {
      addGlobalTag(nombre, tipo);
    }

    // Agregar al array (o actualizar si ya existe)
    const nuevosTagsAsignados = [...tagsAsignados];
    const existeIdx = nuevosTagsAsignados.findIndex(t => t.nombre === nombre);

    if (existeIdx >= 0) {
      nuevosTagsAsignados[existeIdx] = nuevoTag;
    } else {
      nuevosTagsAsignados.push(nuevoTag);
    }

    onTagsChange(nuevosTagsAsignados);
    
    // Limpiar formulario
    setNewTagNombre('');
    setNewTagCantidad(0);
    setSelectedGlobalTag('');
    setShowAddForm(false);
  };

  const handleRemoveTag = (nombre: string) => {
    const nuevosTagsAsignados = tagsAsignados.filter(t => t.nombre !== nombre);
    onTagsChange(nuevosTagsAsignados);
  };

  const handleUpdateCantidad = (nombre: string, nuevaCantidad: number) => {
    const nuevosTagsAsignados = tagsAsignados.map(t => {
      if (t.nombre === nombre) {
        return { ...t, cantidad: nuevaCantidad };
      }
      return t;
    });
    onTagsChange(nuevosTagsAsignados);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Tags / Eventos
        </label>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Asignar tag
        </button>
      </div>

      {/* Tags asignados */}
      <div className="space-y-2 min-h-[40px]">
        {tagsAsignados.length === 0 ? (
          <div className="text-sm text-gray-400 dark:text-gray-500 italic py-2">
            Sin tags asignados - Los valores no se mostrarán hasta seleccionar un contexto
          </div>
        ) : (
          tagsAsignados.map((tag) => (
            <div
              key={tag.nombre}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                tag.tipo === 'solicitud'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                  : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Icono según tipo */}
                {tag.tipo === 'solicitud' ? (
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                ) : (
                  <Package className="w-5 h-5 text-green-500" />
                )}
                
                {/* Nombre y tipo */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{tag.nombre}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      tag.tipo === 'solicitud'
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-green-200 text-green-800'
                    }`}>
                      {tag.tipo === 'solicitud' ? '🛒 Solicitud' : '📦 Stock'}
                    </span>
                  </div>
                  {tag.fecha && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {(() => {
                        try {
                          const fecha = tag.fecha instanceof Date ? tag.fecha : new Date(tag.fecha);
                          return isNaN(fecha.getTime()) ? '' : fecha.toLocaleDateString('es-CL');
                        } catch {
                          return '';
                        }
                      })()}
                    </span>
                  )}
                </div>
              </div>

              {/* Cantidad y controles */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {tag.tipo === 'solicitud' ? 'Cant:' : 'Stock:'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={tag.cantidad}
                    onChange={(e) => handleUpdateCantidad(tag.nombre, parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ${(tag.cantidad * valorUnitario).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.nombre)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 transition-colors"
                  title="Quitar tag"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Formulario para agregar tag */}
      {showAddForm && (
        <div className="border border-primary-200 dark:border-primary-800 rounded-lg p-4 bg-primary-50 dark:bg-primary-900/20 space-y-4">
          <h4 className="font-medium text-gray-800 dark:text-gray-200">Asignar evento/tag</h4>
          
          {/* Selector de tag existente o nuevo */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Tag/Evento:
            </label>
            <div className="flex gap-2">
              <select
                value={selectedGlobalTag}
                onChange={(e) => {
                  setSelectedGlobalTag(e.target.value);
                  setNewTagNombre('');
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- Seleccionar existente --</option>
                {tagsDisponibles.map(tag => (
                  <option key={tag.nombre} value={tag.nombre}>
                    {tag.tipo === 'solicitud' ? '🛒' : '📦'} {tag.nombre}
                  </option>
                ))}
              </select>
              <span className="text-gray-400 self-center">o</span>
              <input
                type="text"
                value={newTagNombre}
                onChange={(e) => {
                  setNewTagNombre(e.target.value);
                  setSelectedGlobalTag('');
                }}
                placeholder="Crear nuevo..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Indicador de tipo (determinado automáticamente) */}
          {selectedTagTipo && (
            <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
              selectedTagTipo === 'solicitud'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {selectedTagTipo === 'solicitud' ? (
                <ShoppingCart className="w-4 h-4" />
              ) : (
                <Package className="w-4 h-4" />
              )}
              <span>
                Este tag es de tipo <strong>{selectedTagTipo === 'solicitud' ? 'Solicitud' : 'Stock'}</strong>
                {newTagNombre.trim() && !globalTags.some(t => t.nombre === newTagNombre.trim()) && (
                  <span className="text-xs ml-2">(nuevo tag, tipo inferido del nombre)</span>
                )}
              </span>
            </div>
          )}

          {/* Cantidad */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {selectedTagTipo === 'stock' ? 'Cantidad en Stock:' : 'Cantidad Solicitada:'}
            </label>
            <input
              type="number"
              min="0"
              value={newTagCantidad}
              onChange={(e) => setNewTagCantidad(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500"
              placeholder={selectedTagTipo === 'stock' ? 'Cantidad en bodega' : 'Cantidad a solicitar'}
            />
            {newTagCantidad > 0 && (
              <p className="text-xs text-gray-500">
                Total: ${(newTagCantidad * valorUnitario).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewTagNombre('');
                setNewTagCantidad(0);
                setSelectedGlobalTag('');
              }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddTag}
              disabled={(!selectedGlobalTag && !newTagNombre.trim())}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Asignar
            </button>
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <ShoppingCart className="w-3 h-3 text-blue-500" /> Solicitud = cantidad a pedir
        </span>
        <span className="flex items-center gap-1">
          <Package className="w-3 h-3 text-green-500" /> Stock = inventario en bodega
        </span>
      </div>
    </div>
  );
}
