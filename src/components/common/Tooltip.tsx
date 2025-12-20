import { useState, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  maxWidth?: number;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  className = '',
  maxWidth = 300
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    let x = 0;
    let y = 0;
    
    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2 + scrollX;
        y = rect.top + scrollY - 8;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2 + scrollX;
        y = rect.bottom + scrollY + 8;
        break;
      case 'left':
        x = rect.left + scrollX - 8;
        y = rect.top + rect.height / 2 + scrollY;
        break;
      case 'right':
        x = rect.right + scrollX + 8;
        y = rect.top + rect.height / 2 + scrollY;
        break;
    }
    
    setCoords({ x, y });
  }, [position]);

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, delay);
  }, [delay, calculatePosition]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-x-transparent border-b-transparent dark:border-t-gray-700',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-x-transparent border-t-transparent dark:border-b-gray-700',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-y-transparent border-r-transparent dark:border-l-gray-700',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-y-transparent border-l-transparent dark:border-r-gray-700'
  };

  const tooltipContent = isVisible && (
    <div 
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: coords.x,
        top: coords.y,
        transform: position === 'top' || position === 'bottom' 
          ? 'translateX(-50%)' 
          : position === 'top' ? 'translateY(-100%)' : ''
      }}
    >
      <div 
        className={`
          relative bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg
          dark:bg-gray-700
          animate-fadeIn
          ${className}
        `}
        style={{ maxWidth }}
      >
        {content}
        <span 
          className={`absolute border-4 ${arrowClasses[position]}`}
        />
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {typeof document !== 'undefined' && createPortal(tooltipContent, document.body)}
    </>
  );
}

// Tooltip para info de repuesto
interface RepuestoTooltipProps {
  repuesto: {
    codigoSAP: string;
    codigoBaader: string;
    descripcion?: string;
    valorUnitario: number;
    cantidadSolicitada: number;
    cantidadStockBodega?: number;
    ubicacion?: string;
  };
  children: ReactNode;
}

export function RepuestoTooltip({ repuesto, children }: RepuestoTooltipProps) {
  const content = (
    <div className="space-y-2 min-w-[200px]">
      <div className="font-semibold text-primary-300 border-b border-gray-700 pb-1">
        {repuesto.codigoSAP}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-gray-400">Baader:</span>
        <span className="font-mono">{repuesto.codigoBaader}</span>
        
        <span className="text-gray-400">V. Unit:</span>
        <span className="font-mono text-green-400">
          ${repuesto.valorUnitario.toLocaleString('es-CL', { minimumFractionDigits: 2 })}
        </span>
        
        <span className="text-gray-400">Solicitado:</span>
        <span>{repuesto.cantidadSolicitada} uds</span>
        
        <span className="text-gray-400">Stock:</span>
        <span className={repuesto.cantidadStockBodega === 0 ? 'text-red-400' : ''}>
          {repuesto.cantidadStockBodega ?? 0} uds
        </span>
        
        {repuesto.ubicacion && (
          <>
            <span className="text-gray-400">Ubicación:</span>
            <span>{repuesto.ubicacion}</span>
          </>
        )}
      </div>
      {repuesto.descripcion && (
        <div className="text-xs text-gray-300 pt-1 border-t border-gray-700">
          {repuesto.descripcion.length > 100 
            ? `${repuesto.descripcion.substring(0, 100)}...` 
            : repuesto.descripcion
          }
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={content} position="right" delay={500} maxWidth={280}>
      {children}
    </Tooltip>
  );
}
