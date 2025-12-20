import { ReactNode, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({ isOpen, onClose, children, title, size = 'md' }: ModalProps) {
  const mouseDownTarget = useRef<EventTarget | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Manejar cierre del overlay solo si no hay texto seleccionado
  // y el clic inició y terminó en el overlay
  const handleOverlayMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownTarget.current = e.target;
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    // Verificar que el clic inició y terminó en el mismo elemento (el overlay)
    if (mouseDownTarget.current !== e.target) {
      return;
    }
    
    // Verificar si hay texto seleccionado
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      // Hay texto seleccionado, no cerrar el modal
      return;
    }
    
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4 md:mx-8'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn"
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      <div 
        className={`
          modal-content bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]}
          max-h-[90vh] overflow-hidden flex flex-col animate-slideIn
          md:rounded-lg md:max-h-[85vh]
        `}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
