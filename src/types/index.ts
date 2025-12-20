// Tipo principal de Repuesto
export interface Repuesto {
  id: string;
  codigoSAP: string;
  textoBreve: string;
  descripcion: string;
  codigoBaader: string;
  cantidadSolicitada: number;
  valorUnitario: number;
  total: number;
  cantidadStockBodega: number;
  fechaUltimaActualizacionInventario: Date | null;
  vinculosManual: VinculoManual[];
  imagenesManual: ImagenRepuesto[];
  fotosReales: ImagenRepuesto[];
  createdAt: Date;
  updatedAt: Date;
}

// Vínculo a página/área del manual PDF con marcador visual
export interface VinculoManual {
  id: string;
  pagina: number;
  coordenadas?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  forma: 'circulo' | 'rectangulo';
  color: string;
  descripcion: string;
}

// Imagen asociada al repuesto
export interface ImagenRepuesto {
  id: string;
  url: string;
  descripcion: string;
  orden: number;
  esPrincipal: boolean;
  tipo: 'manual' | 'real';
  createdAt: Date;
}

// Historial de cambios
export interface HistorialCambio {
  id: string;
  repuestoId: string;
  campo: string;
  valorAnterior: string | number | null;
  valorNuevo: string | number | null;
  fecha: Date;
}

// Estado del usuario/sesión
export interface UserSession {
  uid: string;
  email: string;
  lastSelectedRepuestoId: string | null;
}

// Estado de la aplicación
export interface AppState {
  repuestos: Repuesto[];
  selectedRepuesto: Repuesto | null;
  isEditorMode: boolean;
  searchTerm: string;
  isLoading: boolean;
  pdfUrl: string | null;
}

// Props comunes
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  fullScreenOnMobile?: boolean;
}

// Formulario de repuesto
export interface RepuestoFormData {
  codigoSAP: string;
  textoBreve: string;
  codigoBaader: string;
  cantidadSolicitada: number;
  valorUnitario: number;
  cantidadStockBodega: number;
}

// Datos de exportación
export interface ExportData {
  repuestos: Repuesto[];
  includeImages: boolean;
  format: 'excel' | 'pdf';
}

// Toast/Notificación
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}
