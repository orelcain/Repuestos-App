import { useState, useEffect } from 'react';
import { X, Image, Loader2, Check } from 'lucide-react';
import { 
  QUALITY_OPTIONS, 
  ImageQualityOption, 
  optimizeImage,
  OptimizeImageResult,
  formatFileSize 
} from '../../utils/imageUtils';

interface ImageQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onConfirm: (result: OptimizeImageResult) => void;
}

export function ImageQualityModal({
  isOpen,
  onClose,
  file,
  onConfirm
}: ImageQualityModalProps) {
  const [selectedQuality, setSelectedQuality] = useState<ImageQualityOption>(QUALITY_OPTIONS[1]); // Alta por defecto
  const [preview, setPreview] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [estimatedSize, setEstimatedSize] = useState<number>(0);
  const [optimization, setOptimization] = useState<OptimizeImageResult['chosen'] | null>(null);
  const [computedResult, setComputedResult] = useState<OptimizeImageResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Generar preview y calcular tamaños cuando cambia el archivo o calidad
  useEffect(() => {
    if (!file || !isOpen) return;

    setOriginalSize(file.size);
    
    // Generar preview del archivo original
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [file, isOpen]);

  // Calcular tamaño estimado cuando cambia la calidad
  useEffect(() => {
    if (!file || !isOpen) return;

    const calculateSize = async () => {
      setCalculating(true);
      try {
        const result = await optimizeImage(file, selectedQuality.value);
        setEstimatedSize(result.file.size);
        setOptimization(result.chosen);
        setComputedResult(result);
      } catch (err) {
        console.error('Error estimando tamaño:', err);
        setEstimatedSize(0);
        setOptimization(null);
        setComputedResult(null);
      } finally {
        setCalculating(false);
      }
    };

    calculateSize();
  }, [file, selectedQuality, isOpen]);

  const handleConfirm = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      // Si ya calculamos un resultado para esta selección, reutilizarlo.
      // Esto evita discrepancias entre el “estimado” mostrado y el archivo que se sube.
      const result = computedResult ?? (await optimizeImage(file, selectedQuality.value));
      onConfirm(result);
      onClose();
    } catch (err) {
      console.error('Error optimizando imagen:', err);
    } finally {
      setProcessing(false);
    }
  };

  const savingsPercent = originalSize > 0 && estimatedSize > 0
    ? Math.round((1 - estimatedSize / originalSize) * 100)
    : 0;

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-2" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white dark:from-gray-900 dark:to-gray-900">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Image className="w-5 h-5 text-primary-600" />
            Optimizar Imagen
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Preview */}
          <div className="p-3 bg-gray-100 dark:bg-gray-800 flex justify-center">
            {preview ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="max-h-28 sm:max-h-40 max-w-full object-contain rounded-lg shadow"
              />
            ) : (
              <div className="h-28 w-28 sm:h-40 sm:w-40 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {/* Info del archivo */}
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-300">Archivo:</span>
              <span className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[65%]">{file.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-gray-600 dark:text-gray-300">Tamaño original:</span>
              <span className="font-medium text-gray-800 dark:text-gray-100">{formatFileSize(originalSize)}</span>
            </div>
          </div>

          {/* Opciones de calidad */}
          <div className="p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Calidad de compresión:
            </label>
            <div className="space-y-1.5">
            {QUALITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedQuality(option)}
                className={`w-full p-2.5 rounded-lg border-2 text-left transition-all ${
                  selectedQuality.value === option.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedQuality.value === option.value
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedQuality.value === option.value && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-100">{option.label}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">({Math.round(option.value * 100)}%)</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 ml-8 mt-0.5">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

          {/* Resultado estimado */}
          <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-900 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-gray-600 dark:text-gray-300">Tamaño final:</span>
                {calculating ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Calculando...</span>
                  </div>
                ) : (
                  <p className="text-base font-bold text-green-600">{formatFileSize(estimatedSize)}</p>
                )}
              </div>
              {!calculating && originalSize > 0 && estimatedSize > 0 && (
                <div className="text-right">
                  <span className="text-xs text-gray-600 dark:text-gray-300">Ahorro:</span>
                  <p className="text-base font-bold text-green-600">{Math.max(0, savingsPercent)}%</p>
                </div>
              )}
            </div>
            {!calculating && optimization?.format === 'original' && (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                No se logró reducir el tamaño sin empeorar demasiado. Se subirá el archivo original.
              </p>
            )}
            {!calculating && optimization && optimization.format !== 'original' && (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                Optimización: {optimization.format.toUpperCase()}{optimization.quality ? ` ${Math.round(optimization.quality * 100)}%` : ''}
                {optimization.maxWidth ? ` · max ${optimization.maxWidth}px` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex gap-3 bg-white dark:bg-gray-900">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing || calculating}
            className="flex-1 px-4 py-2.5 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Subir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
