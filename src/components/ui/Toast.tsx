import { Toast as ToastType } from '../../types';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

function Toast({ toast, onRemove }: ToastProps) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />
  };

  const bgColors = {
    success: 'bg-gray-800 border-green-500',
    error: 'bg-gray-800 border-red-500',
    warning: 'bg-gray-800 border-yellow-500',
    info: 'bg-gray-800 border-blue-500'
  };

  return (
    <div 
      className={`
        toast flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        ${bgColors[toast.type]}
      `}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm text-white">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 rounded hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
