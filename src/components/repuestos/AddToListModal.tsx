import { useState, useMemo } from 'react';
import { Repuesto, getTagNombre } from '../../types';
import { X, Search, Plus, Check, ShoppingCart, Package } from 'lucide-react';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  allRepuestos: Repuesto[]; // Todos los repuestos disponibles
  currentContextTag: string; // Tag del contexto actual
  currentContextTipo: 'solicitud' | 'stock'; // Tipo del contexto
  onAddToList: (repuestoId: string, cantidad: number) => void; // Callback para agregar
}

export function AddToListModal({
  isOpen,
  onClose,
  allRepuestos,
  currentContextTag,
  currentContextTipo,
  onAddToList
}: AddToListModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Repuestos que NO están ya en la lista actual
  const repuestosDisponibles = useMemo(() => {
    return allRepuestos.filter(r => {
      // Verificar si ya tiene el tag del contexto actual
      const tieneTag = r.tags?.some(tag => {
        const tagNombre = getTagNombre(tag);
        return tagNombre === currentContextTag;
      });
      return !tieneTag;
    });
  }, [allRepuestos, currentContextTag]);

  // Filtrar por búsqueda
  const repuestosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return repuestosDisponibles.slice(0, 50); // Limitar inicial
    
    const term = searchTerm.toLowerCase();
    return repuestosDisponibles.filter(r => 
      r.codigoSAP.toLowerCase().includes(term) ||
      r.codigoBaader?.toLowerCase().includes(term) ||
      r.textoBreve.toLowerCase().includes(term) ||
      r.descripcion?.toLowerCase().includes(term)
    ).slice(0, 100);
  }, [repuestosDisponibles, searchTerm]);

  const handleCantidadChange = (id: string, value: number) => {
    setCantidades(prev => ({ ...prev, [id]: Math.max(0, value) }));
  };

  const handleAddRepuesto = (repuesto: Repuesto) => {
    const cantidad = cantidades[repuesto.id] || 1;
    onAddToList(repuesto.id, cantidad);
    setAddedIds(prev => new Set(prev).add(repuesto.id));
  };

  const handleClose = () => {
    setSearchTerm('');
    setCantidades({});
    setAddedIds(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              currentContextTipo === 'solicitud' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {currentContextTipo === 'solicitud' ? (
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              ) : (
                <Package className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Agregar repuestos a la lista</h2>
              <p className="text-sm text-gray-500">
                Contexto: <span className="font-medium">{currentContextTag}</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  currentContextTipo === 'solicitud' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {currentContextTipo === 'solicitud' ? '🛒 Solicitud' : '📦 Stock'}
                </span>
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Buscador */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código SAP, número parte, descripción..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {repuestosDisponibles.length} repuestos disponibles para agregar • 
            Mostrando {repuestosFiltrados.length}
          </p>
        </div>

        {/* Lista de repuestos */}
        <div className="flex-1 overflow-y-auto p-5">
          {repuestosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No se encontraron repuestos disponibles</p>
              <p className="text-sm">Todos los repuestos ya están en esta lista o prueba otra búsqueda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {repuestosFiltrados.map((repuesto) => {
                const isAdded = addedIds.has(repuesto.id);
                const cantidad = cantidades[repuesto.id] ?? 1;
                
                return (
                  <div
                    key={repuesto.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      isAdded 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm bg-white px-2 py-1 rounded border border-gray-200 font-semibold">
                          {repuesto.codigoSAP}
                        </span>
                        {repuesto.codigoBaader && (
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                            {repuesto.codigoBaader}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-1 truncate">
                        {repuesto.textoBreve}
                      </p>
                      <p className="text-xs text-gray-500">
                        Valor: ${repuesto.valorUnitario.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                      {!isAdded ? (
                        <>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500">
                              {currentContextTipo === 'solicitud' ? 'Cant:' : 'Stock:'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={cantidad}
                              onChange={(e) => handleCantidadChange(repuesto.id, parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1.5 text-center border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500"
                            />
                          </div>
                          <button
                            onClick={() => handleAddRepuesto(repuesto)}
                            disabled={cantidad <= 0}
                            className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentContextTipo === 'solicitud'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300'
                                : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            Agregar
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="w-5 h-5" />
                          <span className="text-sm font-medium">Agregado</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {addedIds.size > 0 && (
              <span className="text-green-600 font-medium">
                ✓ {addedIds.size} repuesto{addedIds.size !== 1 ? 's' : ''} agregado{addedIds.size !== 1 ? 's' : ''}
              </span>
            )}
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
