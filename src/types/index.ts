// Tag global con su tipo definido (solicitud o stock)
export interface TagGlobal {
  nombre: string;
  tipo: 'solicitud' | 'stock';
  createdAt?: Date;
}

// Tag asignado a un repuesto con cantidad específica del evento
export interface TagAsignado {
  nombre: string;                    // Nombre del tag/evento
  tipo: 'solicitud' | 'stock';       // A qué columna aplica (heredado del TagGlobal)
  cantidad: number;                  // Cantidad en este evento
  fecha: Date;                       // Cuándo se asignó/creó el evento
}

// Helper para verificar si es un TagGlobal
export function isTagGlobal(tag: unknown): tag is TagGlobal {
  return typeof tag === 'object' && tag !== null && 'nombre' in tag && 'tipo' in tag && !('cantidad' in tag);
}

// Tipo principal de Repuesto
export interface Repuesto {
  id: string;
  codigoSAP: string;
  textoBreve: string;
  descripcion: string;
  nombreManual?: string;  // Nombre según el manual Baader
  codigoBaader: string;
  cantidadSolicitada: number;       // DEPRECATED: usar tags para cantidades por evento
  valorUnitario: number;
  total: number;                     // DEPRECATED: se calcula desde tags
  cantidadStockBodega: number;       // DEPRECATED: usar tags para cantidades por evento
  fechaUltimaActualizacionInventario: Date | null;
  tags: (string | TagAsignado)[];    // Soporta formato antiguo (string) y nuevo (TagAsignado)
  vinculosManual: VinculoManual[];
  imagenesManual: ImagenRepuesto[];
  fotosReales: ImagenRepuesto[];
  createdAt: Date;
  updatedAt: Date;
}

// Helper para verificar si un tag es del nuevo formato
export function isTagAsignado(tag: string | TagAsignado): tag is TagAsignado {
  return typeof tag === 'object' && 'nombre' in tag && 'tipo' in tag;
}

// Helper para obtener el nombre de un tag (compatible con ambos formatos)
export function getTagNombre(tag: string | TagAsignado): string {
  return isTagAsignado(tag) ? tag.nombre : tag;
}

// Tags disponibles para filtrar repuestos (gestionados desde TagManager)
export const TAGS_PREDEFINIDOS = [
  'Overhaul temporada baja',
  'Urgentes este mes',
  'Críticos',
  'En espera proveedor',
  'Pedido realizado',
  'Stock mínimo',
  'Repuestos varios',
  'Preventivo mensual'
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
  nombreManual?: string;
  codigoBaader: string;
  cantidadSolicitada: number;      // DEPRECATED: usar tags para cantidades por evento
  valorUnitario: number;
  cantidadStockBodega: number;     // DEPRECATED: usar tags para cantidades por evento
  tags?: (string | TagAsignado)[];  // Soporta formato antiguo y nuevo
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
