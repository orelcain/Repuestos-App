import { useState } from 'react';
import { TagAsignado, isTagAsignado, getTagNombre } from '../../types';
import { useTags } from '../../hooks/useTags';
import { Tag, X, Plus, Package, ShoppingCart, Calendar } from 'lucide-react';

interface TagEventSelectorProps {
  tags: (string | TagAsignado)[];
  onTagsChange: (tags: TagAsignado[]) => void;
  valorUnitario: number;  // Para mostrar cálculo de total
}

export function TagEventSelector({ tags, onTagsChange, valorUnitario }: TagEventSelectorProps) {
  const { tags: globalTags, addTag: addGlobalTag } = useTags();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTagNombre, setNewTagNombre] = useState('');
  const [newTagTipo, setNewTagTipo] = useState<'solicitud' | 'stock'>('solicitud');
  const [newTagCantidad, setNewTagCantidad] = useState(0);
  const [selectedGlobalTag, setSelectedGlobalTag] = useState('');

  // Convertir tags actuales a formato TagAsignado para visualización
  const tagsAsignados: TagAsignado[] = tags.map(tag => {
    if (isTagAsignado(tag)) return tag;
    // Tag antiguo - mostrar con valores por defecto
    return {
      nombre: tag,
      tipo: 'solicitud' as const,
      cantidad: 0,
      fecha: new Date()
    };
  });

  // Tags globales disponibles (que no están asignados con el mismo tipo)
  const tagsDisponibles = globalTags.filter(tagNombre => {
    // Verificar si ya está asignado como el tipo seleccionado
    const yaAsignado = tagsAsignados.some(
      t => t.nombre === tagNombre && t.tipo === newTagTipo
    );
    return !yaAsignado;
  });

  const handleAddTag = () => {
    const nombre = selectedGlobalTag || newTagNombre.trim();
    if (!nombre || newTagCantidad < 0) return;

    const nuevoTag: TagAsignado = {
      nombre,
      tipo: newTagTipo,
      cantidad: newTagCantidad,
      fecha: new Date()
    };

    // Si es un tag nuevo, agregarlo a la lista global
    if (!globalTags.includes(nombre)) {
      addGlobalTag(nombre);
    }

    // Agregar al array (o actualizar si ya existe)
    const nuevosTagsAsignados = [...tagsAsignados];
    const existeIdx = nuevosTagsAsignados.findIndex(
      t => t.nombre === nombre && t.tipo === newTagTipo
    );

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

  const handleRemoveTag = (nombre: string, tipo: 'solicitud' | 'stock') => {
    const nuevosTagsAsignados = tagsAsignados.filter(
      t => !(t.nombre === nombre && t.tipo === tipo)
    );
    onTagsChange(nuevosTagsAsignados);
  };

  const handleUpdateCantidad = (nombre: string, tipo: 'solicitud' | 'stock', nuevaCantidad: number) => {
    const nuevosTagsAsignados = tagsAsignados.map(t => {
      if (t.nombre === nombre && t.tipo === tipo) {
        return { ...t, cantidad: nuevaCantidad };
      }
      return t;
    });
    onTagsChange(nuevosTagsAsignados);
  };

  // Agrupar tags por nombre para mostrarlos mejor
  const tagsPorNombre = tagsAsignados.reduce((acc, tag) => {
    if (!acc[tag.nombre]) {
      acc[tag.nombre] = [];
    }
    acc[tag.nombre].push(tag);
    return acc;
  }, {} as Record<string, TagAsignado[]>);

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
        {Object.keys(tagsPorNombre).length === 0 ? (
          <div className="text-sm text-gray-400 dark:text-gray-500 italic py-2">
            Sin tags asignados - Los valores no se mostrarán hasta seleccionar un filtro
          </div>
        ) : (
          Object.entries(tagsPorNombre).map(([nombre, tagsDelNombre]) => (
            <div
              key={nombre}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-primary-500" />
                <span className="font-medium text-gray-800 dark:text-gray-200">{nombre}</span>
                {tagsDelNombre[0]?.fecha && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(tagsDelNombre[0].fecha).toLocaleDateString('es-CL')}
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {tagsDelNombre.map((tag) => (
                  <div
                    key={`${tag.nombre}-${tag.tipo}`}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                      tag.tipo === 'solicitud'
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    }`}
                  >
                    {tag.tipo === 'solicitud' ? (
                      <ShoppingCart className="w-3.5 h-3.5" />
                    ) : (
                      <Package className="w-3.5 h-3.5" />
                    )}
                    <span className="font-medium">
                      {tag.tipo === 'solicitud' ? 'Solicitado' : 'Stock'}:
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={tag.cantidad}
                      onChange={(e) => handleUpdateCantidad(tag.nombre, tag.tipo, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-0.5 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary-500"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (${(tag.cantidad * valorUnitario).toLocaleString('en-US', { minimumFractionDigits: 0 })})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.nombre, tag.tipo)}
                      className="p-0.5 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
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
                  <option key={tag} value={tag}>{tag}</option>
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

          {/* Tipo y cantidad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Tipo:
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewTagTipo('solicitud')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    newTagTipo === 'solicitud'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Solicitado
                </button>
                <button
                  type="button"
                  onClick={() => setNewTagTipo('stock')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    newTagTipo === 'stock'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Stock
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Cantidad:
              </label>
              <input
                type="number"
                min="0"
                value={newTagCantidad}
                onChange={(e) => setNewTagCantidad(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500"
              />
              {newTagCantidad > 0 && (
                <p className="text-xs text-gray-500">
                  Total: ${(newTagCantidad * valorUnitario).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
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
          <ShoppingCart className="w-3 h-3 text-blue-500" /> Cantidad solicitada
        </span>
        <span className="flex items-center gap-1">
          <Package className="w-3 h-3 text-green-500" /> Stock en bodega
        </span>
      </div>
    </div>
  );
}
