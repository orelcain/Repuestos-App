import { useState, useEffect } from 'react';
import { X, Image, Loader2, Check } from 'lucide-react';
import { 
  QUALITY_OPTIONS, 
  ImageQualityOption, 
  convertToWebP, 
  formatFileSize 
} from '../../utils/imageUtils';

interface ImageQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onConfirm: (optimizedFile: File) => void;
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
        const webpFile = await convertToWebP(file, selectedQuality.value);
        setEstimatedSize(webpFile.size);
      } catch (err) {
        console.error('Error estimando tamaño:', err);
        setEstimatedSize(0);
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
      const optimizedFile = await convertToWebP(file, selectedQuality.value);
      onConfirm(optimizedFile);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Image className="w-5 h-5 text-primary-600" />
            Optimizar Imagen
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4 bg-gray-100 flex justify-center">
          {preview ? (
            <img 
              src={preview} 
              alt="Preview" 
              className="max-h-40 max-w-full object-contain rounded-lg shadow"
            />
          ) : (
            <div className="h-40 w-40 bg-gray-200 rounded-lg flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        {/* Info del archivo */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Archivo original:</span>
            <span className="font-medium text-gray-800">{file.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Tamaño original:</span>
            <span className="font-medium text-gray-800">{formatFileSize(originalSize)}</span>
          </div>
        </div>

        {/* Opciones de calidad */}
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Selecciona la calidad de compresión:
          </label>
          <div className="space-y-2">
            {QUALITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedQuality(option)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  selectedQuality.value === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedQuality.value === option.value
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedQuality.value === option.value && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800">{option.label}</span>
                      <span className="text-gray-500 ml-2">({Math.round(option.value * 100)}%)</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 ml-8 mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Resultado estimado */}
        <div className="px-5 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-600">Tamaño final (WebP):</span>
              {calculating ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Calculando...</span>
                </div>
              ) : (
                <p className="text-lg font-bold text-green-600">{formatFileSize(estimatedSize)}</p>
              )}
            </div>
            {!calculating && savingsPercent > 0 && (
              <div className="text-right">
                <span className="text-sm text-gray-600">Ahorro:</span>
                <p className="text-lg font-bold text-green-600">{savingsPercent}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
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
                Subir Optimizada
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
