import { useState, useRef } from 'react';
import { ImagenRepuesto, Repuesto } from '../../types';
import { Modal, Button } from '../ui';
import type { OptimizeImageResult } from '../../utils/imageUtils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Star, 
  StarOff,
  ZoomIn,
  X,
  Upload,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { formatFileSize } from '../../utils/imageUtils';

interface ImageGalleryProps {
  repuesto: Repuesto | null;
  tipo: 'manual' | 'real';
  onUpload: (
    file: File,
    repuestoId: string,
    tipo: 'manual' | 'real',
    meta?: {
      originalSize?: number;
      optimizedSize?: number;
      chosen?: OptimizeImageResult['chosen'];
      skipOptimize?: boolean;
    }
  ) => Promise<ImagenRepuesto>;
  onDelete: (repuesto: Repuesto, imagen: ImagenRepuesto) => Promise<void>;
  onSetPrimary: (repuesto: Repuesto, imagen: ImagenRepuesto) => Promise<void>;
  onUpdateOrder: (repuesto: Repuesto, imagenes: ImagenRepuesto[]) => Promise<void>;
}

export function ImageGallery({ 
  repuesto, 
  tipo, 
  onUpload, 
  onDelete, 
  onSetPrimary,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomImage, setZoomImage] = useState<ImagenRepuesto | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const imagenes = tipo === 'manual' ? repuesto?.imagenesManual : repuesto?.fotosReales;
  const sortedImages = [...(imagenes || [])].sort((a, b) => a.orden - b.orden);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !repuesto || files.length === 0) return;

    // Optimización automática sin modal (WebP 95%)
    const fileArray = Array.from(files);
    setUploading(true);
    
    try {
      for (const file of fileArray) {
        // Optimizar con calidad automática (95%)
        const { optimizeImage } = await import('../../utils/imageUtils');
        const result = await optimizeImage(file, 0.95);
        
        await onUpload(result.file, repuesto.id, tipo, {
          originalSize: file.size,
          optimizedSize: result.file.size,
          chosen: result.chosen,
          skipOptimize: true // Ya optimizada
        });
      }
    } finally {
      setUploading(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const goToPrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : sortedImages.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < sortedImages.length - 1 ? prev + 1 : 0));
  };

  if (!repuesto) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-slideInRight">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              {tipo === 'manual' ? 'Imágenes del Manual' : 'Fotos Reales'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {repuesto.codigoBaader} - {repuesto.textoBreve.substring(0, 30)}...
            </p>
          </div>
          
          {/* Botones de agregar con opciones para móvil */}
          <div className="relative">
            <div className="flex items-center gap-1">
              {/* Botón Galería */}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
                icon={<ImageIcon className="w-4 h-4" />}
                title="Seleccionar de galería"
              >
                <span className="hidden sm:inline">Galería</span>
              </Button>
              
              {/* Botón Cámara - solo para fotos reales y en móvil */}
              {tipo === 'real' && (
                <Button
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  loading={uploading}
                  icon={<Camera className="w-4 h-4" />}
                  title="Tomar foto con cámara"
                >
                  <span className="hidden sm:inline">Cámara</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Input para galería */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Input para cámara - captura directa y optimizada */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Gallery Content */}
      <div className="flex-1 flex flex-col">
        {sortedImages.length === 0 ? (
          <div 
            className="flex-1 flex flex-col items-center justify-center p-8 missing-image-indicator"
          >
            <Upload className="w-12 h-12 text-amber-500 mb-3" />
            <p className="text-amber-700 dark:text-amber-400 font-medium mb-3">Sin imágenes</p>
            
            {/* Opciones de carga para móvil */}
            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
                <span>Galería</span>
              </button>
              {tipo === 'real' && (
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-100 dark:bg-primary-900/50 hover:bg-primary-200 dark:hover:bg-primary-900/70 rounded-xl text-primary-700 dark:text-primary-300 font-medium transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  <span>Cámara</span>
                </button>
              )}
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
              Las imágenes se optimizarán automáticamente (WebP/JPEG)
            </p>
          </div>
        ) : (
          <>
            {/* Main Image */}
            <div className="relative flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center min-h-[200px]">
              <img
                src={sortedImages[currentIndex]?.url}
                alt={sortedImages[currentIndex]?.descripcion || 'Imagen del repuesto'}
                className="max-w-full max-h-full object-contain cursor-zoom-in"
                onClick={() => setZoomImage(sortedImages[currentIndex])}
              />

              {/* Navigation Arrows */}
              {sortedImages.length > 1 && (
                <>
                  <button
                    onClick={goToPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                {currentIndex + 1} / {sortedImages.length}
              </div>

              {/* Zoom Button */}
              <button
                onClick={() => setZoomImage(sortedImages[currentIndex])}
                className="absolute top-2 right-2 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Primary Star */}
              {sortedImages[currentIndex]?.esPrincipal && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Principal
                </div>
              )}
            </div>

            {/* Thumbnails */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2 overflow-x-auto carousel-container pb-1">
                {sortedImages.map((img, index) => (
                  <div
                    key={img.id}
                    className={`
                      relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer
                      border-2 transition-all carousel-item
                      ${index === currentIndex ? 'border-primary-500' : 'border-transparent hover:border-gray-300'}
                    `}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />

                    {(img.sizeFinal || img.sizeOriginal) && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/55 px-1 py-0.5">
                        <p className="text-[9px] leading-tight text-white truncate">
                          {img.sizeOriginal
                            ? `${formatFileSize(img.sizeOriginal)} → ${formatFileSize(img.sizeFinal || 0)}`
                            : `${formatFileSize(img.sizeFinal || 0)}`}
                          {img.formatFinal && img.formatFinal !== 'original' ? ` · ${img.formatFinal.toUpperCase()}` : ''}
                        </p>
                      </div>
                    )}
                    {img.esPrincipal && (
                      <Star className="absolute top-1 right-1 w-3 h-3 text-yellow-400 fill-current" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-gray-200 flex items-center gap-2">
              <button
                onClick={() => repuesto && onSetPrimary(repuesto, sortedImages[currentIndex])}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  sortedImages[currentIndex]?.esPrincipal
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {sortedImages[currentIndex]?.esPrincipal ? (
                  <Star className="w-4 h-4 fill-current" />
                ) : (
                  <StarOff className="w-4 h-4" />
                )}
                Principal
              </button>

              <button
                onClick={() => repuesto && onDelete(repuesto, sortedImages[currentIndex])}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-red-100 text-red-600 hover:bg-red-200 transition-colors ml-auto"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>

      {/* Zoom Modal */}
      <Modal isOpen={!!zoomImage} onClose={() => setZoomImage(null)} size="full">
        <div className="relative w-full h-[70vh]">
          <button
            onClick={() => setZoomImage(null)}
            className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
          
          {zoomImage && (
            <TransformWrapper>
              <TransformComponent
                wrapperStyle={{ width: '100%', height: '100%' }}
                contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <img
                  src={zoomImage.url}
                  alt={zoomImage.descripcion}
                  className="max-w-full max-h-full object-contain"
                />
              </TransformComponent>
            </TransformWrapper>
          )}
          
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-gray-500 bg-white/80 px-3 py-1 rounded">
            Usa el scroll para hacer zoom
          </p>
        </div>
      </Modal>
    </div>
  );
}
