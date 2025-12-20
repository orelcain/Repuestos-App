import { useState, useRef, useCallback, DragEvent } from 'react';
import { Upload, Image, X, AlertCircle, Loader2 } from 'lucide-react';

interface ImageDropzoneProps {
  onImagesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  existingImages?: string[];
  onRemoveExisting?: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

export default function ImageDropzone({
  onImagesSelected,
  maxFiles = 10,
  maxSizeMB = 5,
  existingImages = [],
  onRemoveExisting,
  disabled = false,
  className = ''
}: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      return `${file.name} no es una imagen válida`;
    }
    // Validar tamaño
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `${file.name} excede el tamaño máximo de ${maxSizeMB}MB`;
    }
    return null;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    setIsProcessing(true);
    
    const fileArray = Array.from(files);
    const totalFiles = existingImages.length + previews.length + fileArray.length;
    
    if (totalFiles > maxFiles) {
      setError(`Máximo ${maxFiles} imágenes permitidas`);
      setIsProcessing(false);
      return;
    }
    
    const validFiles: File[] = [];
    const newPreviews: { file: File; url: string }[] = [];
    
    for (const file of fileArray) {
      const errorMsg = validateFile(file);
      if (errorMsg) {
        setError(errorMsg);
        continue;
      }
      
      validFiles.push(file);
      newPreviews.push({
        file,
        url: URL.createObjectURL(file)
      });
    }
    
    if (validFiles.length > 0) {
      setPreviews(prev => [...prev, ...newPreviews]);
      onImagesSelected(validFiles);
    }
    
    setIsProcessing(false);
  }, [existingImages.length, previews.length, maxFiles, maxSizeMB, onImagesSelected]);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [disabled, processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input para permitir seleccionar el mismo archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleRemovePreview = useCallback((index: number) => {
    setPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].url);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Zona de arrastre */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${disabled 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
            : isDragging 
              ? 'border-primary-500 bg-primary-50 scale-[1.02]' 
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-primary-500 dark:hover:bg-gray-800'
          }
          dark:bg-gray-800/50
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center gap-3">
          {isProcessing ? (
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
          ) : isDragging ? (
            <Upload className="w-12 h-12 text-primary-500 animate-bounce" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center dark:from-primary-900 dark:to-primary-800">
              <Image className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {isDragging ? 'Suelta las imágenes aquí' : 'Arrastra imágenes o haz clic'}
            </p>
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              PNG, JPG, GIF hasta {maxSizeMB}MB (máx. {maxFiles} imágenes)
            </p>
          </div>
        </div>
        
        {/* Indicador de arrastre overlay */}
        {isDragging && (
          <div className="absolute inset-0 border-2 border-primary-500 rounded-xl bg-primary-50/80 flex items-center justify-center dark:bg-primary-900/80">
            <div className="text-primary-600 font-semibold flex items-center gap-2 dark:text-primary-300">
              <Upload className="w-6 h-6" />
              Suelta para agregar
            </div>
          </div>
        )}
      </div>
      
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded dark:hover:bg-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Previsualización de imágenes existentes */}
      {existingImages.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 dark:text-gray-400">Imágenes actuales ({existingImages.length})</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {existingImages.map((url, index) => (
              <div key={`existing-${index}`} className="relative group aspect-square">
                <img
                  src={url}
                  alt={`Imagen ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
                {onRemoveExisting && (
                  <button
                    onClick={() => onRemoveExisting(index)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Previsualización de nuevas imágenes */}
      {previews.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 dark:text-gray-400">Nuevas imágenes ({previews.length})</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {previews.map((preview, index) => (
              <div key={`preview-${index}`} className="relative group aspect-square">
                <img
                  src={preview.url}
                  alt={`Nueva imagen ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border-2 border-primary-300 dark:border-primary-600"
                />
                <button
                  onClick={() => handleRemovePreview(index)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  type="button"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1 rounded-b-lg">
                  <p className="text-[10px] text-white truncate">
                    {(preview.file.size / 1024).toFixed(0)}KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
