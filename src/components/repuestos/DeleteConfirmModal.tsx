import { Repuesto } from '../../types';
import { Modal, Button } from '../ui';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  repuesto: Repuesto | null;
  loading?: boolean;
}

export function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  repuesto,
  loading 
}: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          ¿Eliminar repuesto?
        </h3>
        
        <p className="text-gray-600 mb-2">
          Estás por eliminar el repuesto:
        </p>
        
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="font-mono text-sm text-primary-600">{repuesto?.codigoBaader}</p>
          <p className="text-sm text-gray-700 truncate">{repuesto?.textoBreve}</p>
        </div>
        
        <p className="text-sm text-gray-500 mb-6">
          Esta acción no se puede deshacer.
        </p>
        
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={onClose} 
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={onConfirm}
            loading={loading}
            icon={<Trash2 className="w-4 h-4" />}
            className="flex-1"
          >
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
