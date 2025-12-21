import { useState } from 'react';
import { useTags } from '../../hooks/useTags';
import { X, ShoppingCart, Package, Plus, AlertTriangle } from 'lucide-react';

interface CreateContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContextCreated: (tagName: string, tipo: 'solicitud' | 'stock') => void;
}

export function CreateContextModal({
  isOpen,
  onClose,
  onContextCreated
}: CreateContextModalProps) {
  const { tags: globalTags, addTag } = useTags();
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'solicitud' | 'stock'>('solicitud');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmedNombre = nombre.trim();
    
    if (!trimmedNombre) {
      setError('Ingresa un nombre para el contexto/evento');
      return;
    }

    // Verificar si ya existe
    if (globalTags.some(t => t.nombre.toLowerCase() === trimmedNombre.toLowerCase())) {
      setError('Ya existe un contexto/evento con ese nombre');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addTag(trimmedNombre, tipo);
      onContextCreated(trimmedNombre, tipo);
      handleClose();
    } catch (err) {
      setError('Error al crear el contexto');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNombre('');
    setTipo('solicitud');
    setError(null);
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Plus className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Crear nuevo contexto/evento</h2>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Nombre del contexto/evento
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setError(null);
              }}
              placeholder="Ej: Solicitud Enero 2026, Stock Bodega Dic 2025..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
          </div>

          {/* Tipo */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Tipo de contexto
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTipo('solicitud')}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                  tipo === 'solicitud'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`p-3 rounded-full ${
                  tipo === 'solicitud' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className={`font-semibold ${tipo === 'solicitud' ? 'text-blue-700' : 'text-gray-700'}`}>
                    🛒 Solicitud
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Para listas de pedidos y cantidades a solicitar
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipo('stock')}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                  tipo === 'stock'
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`p-3 rounded-full ${
                  tipo === 'stock' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  <Package className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className={`font-semibold ${tipo === 'stock' ? 'text-green-700' : 'text-gray-700'}`}>
                    📦 Stock Bodega
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Para inventario y stock en bodega
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Info */}
          <div className={`p-4 rounded-lg border ${
            tipo === 'solicitud' 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <p className={`text-sm ${tipo === 'solicitud' ? 'text-blue-700' : 'text-green-700'}`}>
              {tipo === 'solicitud' ? (
                <>
                  <strong>Contexto de Solicitud:</strong> Se creará una lista vacía donde podrás agregar repuestos 
                  y asignarles la cantidad a solicitar. Se mostrará la columna "Cantidad Solicitada".
                </>
              ) : (
                <>
                  <strong>Contexto de Stock:</strong> Se creará una lista vacía donde podrás agregar repuestos 
                  y registrar las cantidades en bodega. Se mostrará la columna "Stock en Bodega".
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !nombre.trim()}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              tipo === 'solicitud'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            Crear contexto
          </button>
        </div>
      </div>
    </div>
  );
}
