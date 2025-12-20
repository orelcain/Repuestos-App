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
  tags: string[];
  vinculosManual: VinculoManual[];
  imagenesManual: ImagenRepuesto[];
  fotosReales: ImagenRepuesto[];
  createdAt: Date;
  updatedAt: Date;
}

// Tags predefinidos para filtrar repuestos
export const TAGS_PREDEFINIDOS = [
  'Overhaul temporada baja',
  'Urgentes este mes',
  'Críticos',
  'En espera proveedor',
  'Pedido realizado',
  'Stock mínimo'
] as const;

// Vínculo a página/área del manual PDF con marcador visual
export interface VinculoManual {
  id: string;
  pagina: number;
  // Coordenadas normalizadas (0-1) relativas al tamaño original de la página
  coordenadas?: {
    x: number;      // Porcentaje desde la izquierda (0-1)
    y: number;      // Porcentaje desde arriba (0-1)
    width: number;  // Porcentaje del ancho de la página (0-1)
    height: number; // Porcentaje del alto de la página (0-1)
  };
  forma: 'circulo' | 'rectangulo';
  color: string;
  descripcion: string;
  // Opción para mostrar sin borde
  sinBorde?: boolean;
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
  descripcion?: string;
  codigoBaader: string;
  cantidadSolicitada: number;
  valorUnitario: number;
  cantidadStockBodega: number;
  tags?: string[];
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
