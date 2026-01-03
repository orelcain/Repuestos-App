import { useState, useEffect, useCallback, lazy, Suspense, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRepuestos } from '../hooks/useRepuestos';
import { useStorage } from '../hooks/useStorage';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../hooks/useTheme';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { usePDFPreloader, setGlobalPDFCache } from '../hooks/usePDFPreloader';
import { useMachineContext } from '../contexts/MachineContext';
import { Repuesto, RepuestoFormData, ImagenRepuesto, VinculoManual, Machine } from '../types';
import { APP_VERSION } from '../version';
import { useGlobalCatalog } from '../hooks/useGlobalCatalog';

// Script de importación - exponer globalmente para uso desde consola
import { importarRepuestosInformeV2 } from '../scripts/importInformeV2';
// @ts-expect-error - Exponer función globalmente para uso desde consola del navegador
window.importarRepuestosInformeV2 = importarRepuestosInformeV2;

import { RepuestosTable } from './repuestos/RepuestosTable';
import { RepuestoForm } from './repuestos/RepuestoForm';
import { HistorialModal } from './repuestos/HistorialModal';
import { DeleteConfirmModal } from './repuestos/DeleteConfirmModal';
import { TagManagerModal } from './repuestos/TagManagerModal';
import { ImageGallery } from './gallery/ImageGallery';
import { ActivityLogModal } from './ActivityLogModal';
import { ContextComparator } from './ContextComparator';

// Lazy load PDF components para optimizar carga inicial
const PDFViewer = lazy(() => import('./pdf/PDFViewer').then(module => ({ default: module.PDFViewer })));
const PDFMarkerEditor = lazy(() => import('./pdf/PDFMarkerEditor').then(module => ({ default: module.PDFMarkerEditor })));

// Función para precargar el módulo del editor de marcadores
let editorPreloaded = false;
let editorPreloading = false;
const preloadMarkerEditor = () => {
  if (editorPreloaded || editorPreloading) return Promise.resolve();
  editorPreloading = true;
  console.log('[Dashboard] Precargando módulo PDFMarkerEditor...');
  const startTime = performance.now();
  return import('./pdf/PDFMarkerEditor').then(() => {
    editorPreloaded = true;
    editorPreloading = false;
    console.log(`[Dashboard] PDFMarkerEditor precargado en ${(performance.now() - startTime).toFixed(0)}ms ✅`);
  }).catch(err => {
    editorPreloading = false;
    console.error('[Dashboard] Error precargando PDFMarkerEditor:', err);
  });
};

import { ImportModal } from './ImportModal';
import { StatsPanel } from './stats/StatsPanel';
import { ToastContainer, Button } from './ui';
import ReportsModal from './reports/ReportsModal';
import { BackupModal } from './backup/BackupModal';
import { useBackupSystem } from '../hooks/useBackupSystem';
import { MachineSelector } from './machines/MachineSelector';
import { MachineFormModal } from './machines/MachineFormModal';

import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { formatFileSize } from '../utils/imageUtils';

import { 
  LogOut, 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Menu,
  X,
  Image,
  BookOpen,
  Upload,
  BarChart3,
  Package,
  Loader2,
  Database,
  Undo2,
  Redo2,
  History,
  Sun,
  Moon,
  GitCompare
} from 'lucide-react';

// Componente de loading para los PDF viewers
const PDFLoadingFallback = () => (
  <div className="flex items-center justify-center h-full bg-gray-100">
    <div className="text-center">
      <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-3" />
      <p className="text-gray-600">Cargando visor de PDF...</p>
    </div>
  </div>
);

type RightPanelMode = 'gallery' | 'pdf' | 'marker-editor' | 'hidden';
type GalleryType = 'manual' | 'real';
type MainView = 'catalogo' | 'manual' | 'reportes' | 'admin';

// Eliminar propiedades undefined para no romper Firestore
const sanitizeImagen = (img: ImagenRepuesto): ImagenRepuesto => {
  const cleaned = Object.fromEntries(
    Object.entries(img).filter(([, v]) => v !== undefined)
  ) as ImagenRepuesto;
  return cleaned;
};

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { currentMachine, machines, setCurrentMachine } = useMachineContext();
  
  const machineId = currentMachine?.id || null;
  
  // LOG DE DEBUG: Rastrear cambios de máquina (solo cuando currentMachine cambia realmente)
  useEffect(() => {
    console.log('\n🏭 [Dashboard] Machine changed');
    console.log('   currentMachine:', currentMachine?.id, currentMachine?.nombre);
    console.log('   machineId:', machineId);
    console.log('   manuals:', currentMachine?.manuals?.length || 0);
  }, [currentMachine]); // ✅ Solo currentMachine, machineId se deriva de él
  
  const { 
    repuestos, 
    loading, 
    createRepuesto, 
    updateRepuesto, 
    deleteRepuesto, 
    getHistorial,
    importRepuestos,
    importCantidadesPorTag,
    importCatalogoDesdeExcel,
    renameTag,
    deleteTag
  } = useRepuestos(machineId);
  const { uploadImage } = useStorage(machineId);
  const { lastSelectedRepuestoId, setLastSelectedRepuesto } = useLocalStorage();
  const { toasts, removeToast, success, error } = useToast();
  const { toggleTheme, isDark } = useTheme();

  // Estado de selección y modales
  const [selectedRepuesto, setSelectedRepuesto] = useState<Repuesto | null>(null);
  const [editRepuesto, setEditRepuesto] = useState<Repuesto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Repuesto | null>(null);
  const [historialTarget, setHistorialTarget] = useState<Repuesto | null>(null);
  
  // Estado del formulario
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  
  // Estado del panel derecho
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('hidden');
  const [galleryType, setGalleryType] = useState<GalleryType>('real');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [selectedManualIndex, setSelectedManualIndex] = useState(0); // Para seleccionar entre múltiples manuales
  const [targetPage, setTargetPage] = useState<number | undefined>();
  const [currentMarker, setCurrentMarker] = useState<VinculoManual | undefined>();
  const [markerRepuesto, setMarkerRepuesto] = useState<Repuesto | null>(null);
  
  // Precarga del PDF del manual (carga automática después de 3 segundos)
  const pdfPreloader = usePDFPreloader(pdfUrl, 3000);

  // Nota: la precarga del editor de marcadores se hace en background (sin UI dedicada)

  // Estado móvil
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  
  // Vista principal activa
  const [mainView, setMainView] = useState<MainView>('catalogo');

  // Alcance del buscador (tabla): máquina actual vs catálogo completo
  const [catalogScope, setCatalogScope] = useState<'machine' | 'selected' | 'global'>('machine');
  const [selectedCatalogMachineIds, setSelectedCatalogMachineIds] = useState<string[]>([]);
  const [focusRepuestoId, setFocusRepuestoId] = useState<string | null>(null);

  // Si activan "seleccionadas" y no hay selección, usar la máquina actual como default
  useEffect(() => {
    if (catalogScope !== 'selected') return;
    if (selectedCatalogMachineIds.length > 0) return;
    if (!currentMachine?.id) return;
    setSelectedCatalogMachineIds([currentMachine.id]);
  }, [catalogScope, selectedCatalogMachineIds.length, currentMachine?.id]);

  // Mantener selección válida si cambian máquinas
  useEffect(() => {
    if (selectedCatalogMachineIds.length === 0) return;
    const activeIds = new Set(machines.filter(m => m.activa).map(m => m.id));
    const next = selectedCatalogMachineIds.filter(id => activeIds.has(id));
    if (next.length !== selectedCatalogMachineIds.length) setSelectedCatalogMachineIds(next);
  }, [machines, selectedCatalogMachineIds]);

  const catalogMachines = useMemo(() => {
    if (catalogScope === 'global') return machines;
    if (catalogScope === 'selected') return machines.filter(m => selectedCatalogMachineIds.includes(m.id));
    return [];
  }, [catalogScope, machines, selectedCatalogMachineIds]);

  const globalCatalog = useGlobalCatalog({ enabled: catalogScope !== 'machine', machines: catalogMachines });

  const catalogScopeBadge = useMemo(() => {
    if (catalogScope === 'global') return 'Catálogo completo';
    if (catalogScope === 'selected') {
      const count = selectedCatalogMachineIds.length;
      return count > 0 ? `Máquinas seleccionadas (${count})` : 'Máquinas seleccionadas';
    }
    return null;
  }, [catalogScope, selectedCatalogMachineIds.length]);

  const isManualPanelOpen = rightPanelMode === 'pdf' || rightPanelMode === 'marker-editor';
  
  // Repuestos filtrados (para exportación)
  const [filteredRepuestos, setFilteredRepuestos] = useState<Repuesto[]>([]);
  
  // Contextos duales activos (para pre-asignar al crear repuesto)
  const [activeContexts, setActiveContexts] = useState<{ solicitud: string | null; stock: string | null }>({
    solicitud: null,
    stock: null
  });
  
  // Modal de exportación PDF
  const [showPDFExportModal, setShowPDFExportModal] = useState(false);
  const [pdfIncludeCharts, setPdfIncludeCharts] = useState(true);
  
  // Modal de exportación Excel
  const [showExcelExportModal, setShowExcelExportModal] = useState(false);
  const [excelFormato, setExcelFormato] = useState<'simple' | 'completo'>('completo');
  const [excelIncluirResumen, setExcelIncluirResumen] = useState(true);
  const [excelIncluirSinStock, setExcelIncluirSinStock] = useState(true);
  const [excelIncluirPorTags, setExcelIncluirPorTags] = useState(true);
  const [excelIncluirEstilos, setExcelIncluirEstilos] = useState(true);
  
  // Modal de backup
  const [showBackupModal, setShowBackupModal] = useState(false);
  
  // Sistema de backup automático
  const backupSystem = useBackupSystem(repuestos, machineId);
  
  // Wrapper de updateRepuesto con backup automático
  const updateRepuestoWithBackup = useCallback(async (
    id: string, 
    data: Partial<Repuesto>,
    originalData?: Repuesto
  ) => {
    await updateRepuesto(id, data, originalData);
    
    // Registrar cambios en el sistema de backup
    if (originalData && backupSystem.autoBackupEnabled) {
      for (const key of Object.keys(data) as (keyof Repuesto)[]) {
        if (data[key] !== originalData[key]) {
          backupSystem.recordChange(
            originalData,
            key,
            originalData[key],
            data[key]
          );
        }
      }
    }
  }, [updateRepuesto, backupSystem]);
  
  // Modal de reportes
  const [showReportsModal, setShowReportsModal] = useState(false);
  
  // Modal de logs de actividad
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  
  // Modal de comparador de contextos
  const [showContextComparator, setShowContextComparator] = useState(false);

  // Menú de módulos (desktop)
  const [modulesMenuOpen, setModulesMenuOpen] = useState(false);
  const modulesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modulesMenuRef.current && !modulesMenuRef.current.contains(event.target as Node)) {
        setModulesMenuOpen(false);
      }
    };

    if (modulesMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modulesMenuOpen]);
  
  // Modal para editar máquina (abrir desde "Agregar Manual")
  const [editingMachineModal, setEditingMachineModal] = useState<Machine | null>(null);
  
  // Hook de deshacer/rehacer
  const {
    canUndo,
    canRedo,
    recordAction,
    popUndo,
    popRedo,
    startRestoring,
    endRestoring,
    getActionDescription,
    peekUndo
  } = useUndoRedo();

  // Limpiar PDF y resetear índice al cambiar de máquina
  useEffect(() => {
    console.log('🗑️ [Dashboard] Machine changed, clearing PDF and resetting index');
    setPdfUrl(null);
    setSelectedManualIndex(0);
    setCurrentMarker(undefined);
    setTargetPage(undefined);
  }, [currentMachine?.id]); // Solo el ID, no el objeto completo

  // Cargar URL del manual cuando cambia la máquina o el índice seleccionado
  useEffect(() => {
    const loadManual = async () => {
      if (!currentMachine) {
        setPdfUrl(null);
        return;
      }

      console.log('📚 [Dashboard] Loading manual for', currentMachine.nombre, 'index:', selectedManualIndex);

      // Usar manuals[] de la máquina (aislamiento total por máquina)
      if (currentMachine.manuals && currentMachine.manuals.length > 0) {
        const manualUrl = currentMachine.manuals[selectedManualIndex] || currentMachine.manuals[0];
        console.log('✅ [Dashboard] Using manual from Firestore:', manualUrl);
        setPdfUrl(manualUrl);
        return;
      }

      console.log('🚫 [Dashboard] No manual available for', currentMachine.nombre);
      setPdfUrl(null);
    };

    loadManual();
  }, [currentMachine, selectedManualIndex]);

  // Guardar PDF en cache global cuando el preloader termine
  useEffect(() => {
    if (pdfPreloader.isReady && pdfPreloader.pdf && pdfUrl) {
      setGlobalPDFCache(pdfUrl, pdfPreloader.pdf, pdfPreloader.textContent);
      console.log('[Dashboard] PDF manual guardado en cache global ✅');
      
      // Precargar el editor de marcadores después de que el PDF esté listo
      if (!editorPreloaded && !editorPreloading) {
        preloadMarkerEditor();
      }
    }
  }, [pdfPreloader.isReady, pdfPreloader.pdf, pdfPreloader.textContent, pdfUrl]);

  // Restaurar último repuesto seleccionado
  useEffect(() => {
    if (lastSelectedRepuestoId && repuestos.length > 0 && !selectedRepuesto) {
      const found = repuestos.find(r => r.id === lastSelectedRepuestoId);
      if (found) {
        setSelectedRepuesto(found);
        setRightPanelMode('gallery');
      }
    }
  }, [lastSelectedRepuestoId, repuestos, selectedRepuesto]);

  // Guardar selección actual
  useEffect(() => {
    setLastSelectedRepuesto(selectedRepuesto?.id || null);
  }, [selectedRepuesto, setLastSelectedRepuesto]);

  const handleJumpToMachineRepuesto = useCallback(
    async (targetMachineId: string, repuestoId: string) => {
      setMainView('catalogo');
      setRightPanelMode('hidden');
      setSelectedRepuesto(null);
      setLastSelectedRepuesto(repuestoId);
      setFocusRepuestoId(repuestoId);
      await setCurrentMachine(targetMachineId);
    },
    [setCurrentMachine, setLastSelectedRepuesto]
  );

  // Atajos de teclado globales
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // No activar si hay un modal abierto o focus en input
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
      
      if (isInputFocused) return;
      
      // Ctrl/Cmd + N: Nuevo repuesto
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleAddNew();
      }
      
      // Ctrl/Cmd + E: Exportar Excel
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExportExcel();
      }
      
      // Ctrl/Cmd + P: Exportar PDF
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handleExportPDF();
      }
      
      // Ctrl/Cmd + M: Ver manual
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        if (rightPanelMode === 'pdf') {
          setRightPanelMode('hidden');
        } else {
          setMainView('catalogo');
          setRightPanelMode('pdf');
        }
      }
      
      // Escape: Cerrar modal/panel
      if (e.key === 'Escape') {
        if (showForm) setShowForm(false);
        else if (showExcelExportModal) setShowExcelExportModal(false);
        else if (showPDFExportModal) setShowPDFExportModal(false);
        else if (showBackupModal) setShowBackupModal(false);
        else if (rightPanelMode !== 'hidden') setRightPanelMode('hidden');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rightPanelMode, showForm, showExcelExportModal, showPDFExportModal, showBackupModal]);

  // Handlers de selección
  const handleSelectRepuesto = (repuesto: Repuesto | null) => {
    setSelectedRepuesto(repuesto);
    if (repuesto) {
      setRightPanelMode('gallery');
      setGalleryType('manual');
    } else {
      setRightPanelMode('hidden');
    }
  };

  // Handlers de CRUD
  const handleAddNew = () => {
    setEditRepuesto(null);
    setFormMode('create');
    setShowForm(true);
  };

  const handleEdit = (repuesto: Repuesto) => {
    setEditRepuesto(repuesto);
    setFormMode('edit');
    setShowForm(true);
  };

  const handleSave = async (data: RepuestoFormData) => {
    try {
      if (formMode === 'edit' && editRepuesto) {
        // Registrar cambios para undo/redo (solo si no estamos restaurando)
        for (const key of Object.keys(data) as (keyof RepuestoFormData)[]) {
          const oldValue = editRepuesto[key as keyof Repuesto];
          const newValue = data[key];
          if (oldValue !== newValue) {
            recordAction({
              type: 'update',
              description: `Actualizar ${key} en ${editRepuesto.codigoSAP}`,
              repuestoId: editRepuesto.id,
              repuestoCode: editRepuesto.codigoSAP,
              campo: key,
              valorAnterior: oldValue as string | number | null,
              valorNuevo: newValue as string | number | null
            });
          }
        }
        
        await updateRepuestoWithBackup(editRepuesto.id, data, editRepuesto);
        success('Repuesto actualizado correctamente');
      } else {
        await createRepuesto(data);
        success('Repuesto creado correctamente');
      }
      setShowForm(false);
    } catch (err) {
      error('Error al guardar el repuesto');
      throw err;
    }
  };

  const handleDelete = (repuesto: Repuesto) => {
    setDeleteTarget(repuesto);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleteLoading(true);
    try {
      await deleteRepuesto(deleteTarget.id);
      success('Repuesto eliminado');
      if (selectedRepuesto?.id === deleteTarget.id) {
        setSelectedRepuesto(null);
        setRightPanelMode('hidden');
      }
    } catch (err) {
      error('Error al eliminar el repuesto');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  // Handlers de visualización
  const handleViewManual = (repuesto: Repuesto) => {
    setSelectedRepuesto(repuesto);
    setRightPanelMode('pdf');
    // Si tiene vínculo a página específica, navegar y mostrar marcador
    if (repuesto.vinculosManual && repuesto.vinculosManual.length > 0) {
      const marker = repuesto.vinculosManual[0];
      
      // Si el marcador tiene machineId, verificar que estamos en la máquina correcta
      if (marker.machineId && marker.machineId !== currentMachine?.id) {
        console.warn('⚠️ [Dashboard] Marcador pertenece a otra máquina:', marker.machineId, 'actual:', currentMachine?.id);
        error(`Este marcador pertenece a ${marker.machineId}. Cambia a esa máquina primero.`);
        return;
      }

      // Si el marcador apunta a un manual específico, solo cambiar si pertenece a la máquina actual
      if (marker.manualUrl && currentMachine?.manuals && currentMachine.manuals.length > 0) {
        const manualIndex = currentMachine.manuals.findIndex((u) => u === marker.manualUrl);
        if (manualIndex >= 0 && manualIndex !== selectedManualIndex) {
          console.log('🔄 [Dashboard] Selecting manual index from marker:', manualIndex);
          setSelectedManualIndex(manualIndex);
        } else if (manualIndex === -1) {
          console.warn('⚠️ [Dashboard] marker.manualUrl no pertenece a los manuales de esta máquina; se mantiene el manual actual');
        }
      }
      
      setTargetPage(marker.pagina);
      setCurrentMarker(marker);
    } else {
      setTargetPage(undefined);
      setCurrentMarker(undefined);
    }
  };

  const handleGoToMarker = (marker: VinculoManual) => {
    // Si el marcador tiene machineId, verificar que estamos en la máquina correcta
    if (marker.machineId && marker.machineId !== currentMachine?.id) {
      console.warn('⚠️ [Dashboard] Marcador pertenece a otra máquina:', marker.machineId, 'actual:', currentMachine?.id);
      error(`Este marcador pertenece a ${marker.machineId}. Cambia a esa máquina primero.`);
      return;
    }

    // Si el marcador apunta a un manual específico, solo cambiar si pertenece a la máquina actual
    if (marker.manualUrl && currentMachine?.manuals && currentMachine.manuals.length > 0) {
      const manualIndex = currentMachine.manuals.findIndex((u) => u === marker.manualUrl);
      if (manualIndex >= 0 && manualIndex !== selectedManualIndex) {
        console.log('🔄 [Dashboard] Selecting manual index from marker:', manualIndex);
        setSelectedManualIndex(manualIndex);
      } else if (manualIndex === -1) {
        console.warn('⚠️ [Dashboard] marker.manualUrl no pertenece a los manuales de esta máquina; se mantiene el manual actual');
      }
    }

    setRightPanelMode('pdf');
    setTargetPage(marker.pagina);
    setCurrentMarker(marker);
  };

  // Esta función se usa internamente
  const _handleViewImages = (repuesto: Repuesto) => {
    setSelectedRepuesto(repuesto);
    setRightPanelMode('gallery');
    setGalleryType('manual');
  };
  void _handleViewImages; // Suprimir warning de variable no usada

  const handleViewPhotos = (repuesto: Repuesto) => {
    setSelectedRepuesto(repuesto);
    setRightPanelMode('gallery');
    setGalleryType('real');
  };

  // Esta función se usa internamente
  const _handleAddManualImage = (repuesto: Repuesto) => {
    setSelectedRepuesto(repuesto);
    setRightPanelMode('pdf');
  };
  void _handleAddManualImage; // Suprimir warning de variable no usada

  // Handler para marcar en el manual
  const handleMarkInManual = (repuesto: Repuesto, existingMarker?: VinculoManual) => {
    console.log('📍 [Dashboard] Opening marker editor for repuesto:', repuesto.codigoSAP, 'in machine:', currentMachine?.nombre);
    setMarkerRepuesto(repuesto);
    setSelectedRepuesto(repuesto);
    setEditingMarker(existingMarker || null);
    setMainView('catalogo');
    setRightPanelMode('marker-editor');
  };

  // Estado para edición de marcador existente
  const [editingMarker, setEditingMarker] = useState<VinculoManual | null>(null);

  // Guardar marcador (nuevo o editado)
  const handleSaveMarker = async (marker: Omit<VinculoManual, 'id'>) => {
    if (!markerRepuesto || !currentMachine) return;
    
    const vinculosActuales = markerRepuesto.vinculosManual || [];
    
    // Agregar contexto de máquina y manual actual al marcador
    const currentManualUrl = (currentMachine.manuals && currentMachine.manuals.length > 0)
      ? (currentMachine.manuals[selectedManualIndex] || currentMachine.manuals[0])
      : (pdfUrl || undefined);

    const markerWithContext = {
      ...marker,
      machineId: currentMachine.id,
      manualUrl: currentManualUrl
    };
    
    if (editingMarker) {
      // Editar marcador existente
      const updatedVinculos = vinculosActuales.map(v => 
        v.id === editingMarker.id ? { ...markerWithContext, id: editingMarker.id } : v
      );
      await updateRepuestoWithBackup(markerRepuesto.id, {
        vinculosManual: updatedVinculos
      }, markerRepuesto);
      success('Marcador actualizado correctamente');
      setCurrentMarker({ ...markerWithContext, id: editingMarker.id });
    } else {
      // Crear nuevo marcador
      const newMarker: VinculoManual = {
        ...markerWithContext,
        id: Date.now().toString()
      };
      await updateRepuestoWithBackup(markerRepuesto.id, {
        vinculosManual: [...vinculosActuales, newMarker]
      }, markerRepuesto);
      success(`Marcador guardado en ${currentMachine.nombre}`);
      setCurrentMarker(newMarker);
    }
    
    setRightPanelMode('pdf');
    setMarkerRepuesto(null);
    setEditingMarker(null);
    setTargetPage(markerWithContext.pagina);
  };

  // Eliminar marcador
  const handleDeleteMarker = async (repuesto: Repuesto, markerId: string) => {
    const vinculosActuales = repuesto.vinculosManual || [];
    const updatedVinculos = vinculosActuales.filter(v => v.id !== markerId);
    
    await updateRepuestoWithBackup(repuesto.id, {
      vinculosManual: updatedVinculos
    }, repuesto);
    
    success('Marcador eliminado');
    setCurrentMarker(undefined);
  };

  const handleViewHistory = (repuesto: Repuesto) => {
    setHistorialTarget(repuesto);
  };

  // Handlers de imágenes
  const handleUploadImage = async (
    file: File,
    repuestoId: string,
    tipo: 'manual' | 'real',
    meta?: {
      originalSize?: number;
      optimizedSize?: number;
      chosen?: { format: 'webp' | 'jpeg' | 'original'; quality?: number; maxWidth?: number; maxHeight?: number };
      skipOptimize?: boolean;
      log?: string[];
    }
  ) => {
    // Log para debug
    if (meta?.log) {
      console.log('[Dashboard] Upload meta:', { originalSize: meta.originalSize, optimizedSize: meta.optimizedSize, chosen: meta.chosen });
    }
    
    const imagen = await uploadImage(file, repuestoId, tipo, {
      quality: meta?.chosen?.quality,
      skipOptimize: meta?.skipOptimize,
      meta: {
        sizeOriginal: meta?.originalSize,
        chosen: meta?.chosen
      }
    });
    
    // Log del resultado real
    console.log('[Dashboard] Imagen subida:', { 
      fileSize: file.size, 
      imagenSizeOriginal: imagen.sizeOriginal, 
      imagenSizeFinal: imagen.sizeFinal,
      imagenFormatFinal: imagen.formatFinal
    });
    
    const repuesto = repuestos.find(r => r.id === repuestoId);
    if (repuesto) {
      const imagenes = tipo === 'manual' ? repuesto.imagenesManual : repuesto.fotosReales;
      const newImagen = sanitizeImagen({ ...imagen, orden: imagenes.length });
      const updatedImages = [...imagenes, newImagen];

      // Optimista: actualizar selección local de inmediato
      setSelectedRepuesto({
        ...repuesto,
        [tipo === 'manual' ? 'imagenesManual' : 'fotosReales']: updatedImages
      });

      await updateRepuestoWithBackup(repuestoId, {
        [tipo === 'manual' ? 'imagenesManual' : 'fotosReales']: updatedImages
      }, repuesto);
      
      // Mostrar resultado real de lo subido
      const finalBytes = imagen.sizeFinal || file.size;
      const format = imagen.formatFinal || meta?.chosen?.format || 'original';
      const qualityPct = imagen.qualityFinal ? Math.round(imagen.qualityFinal * 100) : meta?.chosen?.quality ? Math.round(meta.chosen.quality * 100) : null;
      const formatLabel = format !== 'original' ? `${format.toUpperCase()}${qualityPct ? ` ${qualityPct}%` : ''}` : 'ORIGINAL';
      
      if (finalBytes && format !== 'original') {
        success(`✓ ${formatFileSize(finalBytes)} (${formatLabel})`);
      } else if (format === 'original') {
        success(`⚠ Subida sin optimizar: ${formatFileSize(finalBytes)}`);
      } else {
        success('Imagen agregada');
      }
    }
    
    return imagen;
  };

  const handleDeleteImage = async (repuesto: Repuesto, imagen: ImagenRepuesto) => {
    const tipo = imagen.tipo;
    const imagenes = tipo === 'manual' ? repuesto.imagenesManual : repuesto.fotosReales;
    const updatedImages = imagenes.filter(img => img.id !== imagen.id);
    
    // Optimista: actualizar selección local de inmediato
    setSelectedRepuesto({
      ...repuesto,
      [tipo === 'manual' ? 'imagenesManual' : 'fotosReales']: updatedImages
    });

    await updateRepuestoWithBackup(repuesto.id, {
      [tipo === 'manual' ? 'imagenesManual' : 'fotosReales']: updatedImages
    }, repuesto);

    success('Imagen eliminada');
  };

  const handleSetPrimaryImage = async (repuesto: Repuesto, imagen: ImagenRepuesto) => {
    const tipo = imagen.tipo;
    const imagenes = tipo === 'manual' ? repuesto.imagenesManual : repuesto.fotosReales;
    const updatedImages = imagenes.map(img => ({
      ...img,
      esPrincipal: img.id === imagen.id
    }));
    
    await updateRepuestoWithBackup(repuesto.id, {
      [tipo === 'manual' ? 'imagenesManual' : 'fotosReales']: updatedImages
    }, repuesto);
  };

  const handleUpdateImageOrder = async (repuesto: Repuesto, imagenes: ImagenRepuesto[]) => {
    const tipo = imagenes[0]?.tipo || 'manual';
    await updateRepuestoWithBackup(repuesto.id, {
      [tipo === 'manual' ? 'imagenesManual' : 'fotosReales']: imagenes
    }, repuesto);
  };

  // Captura desde PDF
  const handlePDFCapture = useCallback(async (imageData: string, pageNumber: number) => {
    if (!selectedRepuesto) return;

    // Convertir base64 a blob
    const response = await fetch(imageData);
    const blob = await response.blob();
    const file = new File([blob], `manual_page_${pageNumber}.png`, { type: 'image/png' });

    await handleUploadImage(file, selectedRepuesto.id, 'manual');
    
    // Guardar referencia a la página
    const vinculosActuales = selectedRepuesto.vinculosManual || [];
    await updateRepuestoWithBackup(selectedRepuesto.id, {
      vinculosManual: [...vinculosActuales, {
        id: Date.now().toString(),
        pagina: pageNumber,
        forma: 'rectangulo' as const,
        color: 'rgba(239, 68, 68, 0.4)',
        descripcion: `Página ${pageNumber}`
      }]
    }, selectedRepuesto);

    success(`Captura de página ${pageNumber} guardada`);
  }, [selectedRepuesto, updateRepuestoWithBackup, success, handleUploadImage]);

  // Callback para recibir cambios de contextos duales
  const handleContextsChange = (contexts: { solicitud: string | null; stock: string | null }) => {
    setActiveContexts(contexts);
  };

  // Exportaciones - usan repuestos filtrados Y contexto activo
  const handleExportExcel = () => {
    setShowExcelExportModal(true);
  };

  const buildExportViewLabel = () => {
    const shownCount = filteredRepuestos.length > 0 ? filteredRepuestos.length : repuestos.length;
    const totalCount = repuestos.length;

    const hasSolicitud = !!activeContexts.solicitud;
    const hasStock = !!activeContexts.stock;

    if (!hasSolicitud && !hasStock) {
      return `Catalogo de repuestos ${shownCount}/${totalCount}`;
    }

    const parts: string[] = [];
    if (hasSolicitud) parts.push(`Solicitud ${activeContexts.solicitud}`);
    if (hasStock) parts.push(`Stock ${activeContexts.stock}`);

    return `${parts.join(' + ')} ${shownCount}/${totalCount}`;
  };

  const buildExportFilename = (extBase: 'excel' | 'pdf') => {
    const machineName = currentMachine?.nombre || 'maquina';
    const viewLabel = buildExportViewLabel();
    const raw = `${machineName}_${viewLabel}_${extBase}`;

    return raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  };
  
  const confirmExportExcel = () => {
    const toExport = filteredRepuestos.length > 0 ? filteredRepuestos : repuestos;
    const hasSolicitud = !!activeContexts.solicitud;
    const hasStock = !!activeContexts.stock;
    const onlySolicitud = hasSolicitud && !hasStock;
    const onlyStock = hasStock && !hasSolicitud;

    // Solo pasamos contextTag/tipoContexto cuando hay un único contexto activo.
    const contextName = onlySolicitud
      ? activeContexts.solicitud || undefined
      : onlyStock
        ? activeContexts.stock || undefined
        : undefined;
    const tipoContexto = onlySolicitud ? 'solicitud' : onlyStock ? 'stock' : null;
    
    exportToExcel(toExport, {
      formato: excelFormato,
      incluirResumen: excelIncluirResumen,
      incluirSinStock: excelIncluirSinStock,
      incluirPorTags: excelIncluirPorTags,
      incluirEstilos: excelIncluirEstilos,
      contextTag: contextName, // Pasar el contexto activo
      tipoContexto // Pasar el tipo de contexto (solicitud/stock) si aplica
    }, buildExportFilename('excel'));
    
    success(`Excel exportado: ${buildExportViewLabel()}`);
    setShowExcelExportModal(false);
  };

  const handleExportPDF = () => {
    setShowPDFExportModal(true);
  };
  
  const confirmExportPDF = () => {
    const toExport = filteredRepuestos.length > 0 ? filteredRepuestos : repuestos;
    const hasSolicitud = !!activeContexts.solicitud;
    const hasStock = !!activeContexts.stock;
    const onlySolicitud = hasSolicitud && !hasStock;
    const onlyStock = hasStock && !hasSolicitud;

    const contextName = onlySolicitud
      ? activeContexts.solicitud || undefined
      : onlyStock
        ? activeContexts.stock || undefined
        : undefined;
    
    exportToPDF(toExport, { 
      includeCharts: pdfIncludeCharts,
      contextTag: contextName, // Pasar el contexto activo si aplica
      filename: buildExportFilename('pdf')
    });

    success(`PDF exportado: ${buildExportViewLabel()}`);
    setShowPDFExportModal(false);
  };

  // Deshacer última acción
  const handleUndo = async () => {
    const action = popUndo();
    if (!action) return;

    startRestoring();
    try {
      // Restaurar el valor anterior
      const repuesto = repuestos.find(r => r.id === action.repuestoId);
      if (repuesto && action.campo) {
        await updateRepuestoWithBackup(action.repuestoId, {
          [action.campo]: action.valorAnterior
        }, repuesto);
        success(`Deshecho: ${getActionDescription(action)}`);
      }
    } catch (err) {
      error('Error al deshacer');
    } finally {
      endRestoring();
    }
  };

  // Rehacer acción deshecha
  const handleRedo = async () => {
    const action = popRedo();
    if (!action) return;

    startRestoring();
    try {
      const repuesto = repuestos.find(r => r.id === action.repuestoId);
      if (repuesto && action.campo) {
        await updateRepuestoWithBackup(action.repuestoId, {
          [action.campo]: action.valorNuevo
        }, repuesto);
        success(`Rehecho: ${getActionDescription(action)}`);
      }
    } catch (err) {
      error('Error al rehacer');
    } finally {
      endRestoring();
    }
  };

  // Restaurar desde el log de actividad
  const handleRestoreFromLog = async (entry: { repuestoId: string; campo: string; valorAnterior: unknown }) => {
    const repuesto = repuestos.find(r => r.id === entry.repuestoId);
    if (!repuesto) {
      error('Repuesto no encontrado');
      return;
    }

    try {
      // Registrar la acción actual antes de restaurar
      recordAction({
        type: 'update',
        description: `Restaurado ${entry.campo}`,
        repuestoId: entry.repuestoId,
        repuestoCode: repuesto.codigoSAP,
        campo: entry.campo,
        valorAnterior: repuesto[entry.campo as keyof Repuesto],
        valorNuevo: entry.valorAnterior
      });

      await updateRepuestoWithBackup(entry.repuestoId, {
        [entry.campo]: entry.valorAnterior
      }, repuesto);
      
      success(`Restaurado: ${entry.campo} de ${repuesto.codigoSAP}`);
    } catch (err) {
      error('Error al restaurar');
    }
  };

  // Importar repuestos desde Excel
  const handleImport = async (data: RepuestoFormData[]) => {
    try {
      await importRepuestos(data);
      success(`${data.length} repuestos importados correctamente`);
    } catch (err) {
      error('Error al importar repuestos');
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-600">Cargando repuestos...</p>
        </div>
      </div>
    );
  }

  const desktopCoreActions = (
    <>
      {/* Menú por módulos (desktop) */}
      <div className="relative" ref={modulesMenuRef}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setModulesMenuOpen(v => !v)}
          icon={<Menu className="w-4 h-4" />}
          className="relative"
        >
          Módulos
          {/* Indicador de manual precargado */}
          {pdfPreloader.isReady ? (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" title="Manual precargado" />
          ) : pdfPreloader.loading ? (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Precargando manual..." />
          ) : null}
        </Button>

        {modulesMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            <button
              onClick={() => {
                setMainView('catalogo');
                setRightPanelMode('pdf');
                setModulesMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              <span className="flex-1 text-left">
                {currentMachine ? `Manuales ${currentMachine.nombre}` : 'Manuales'}
              </span>
              {currentMachine?.manuals?.length ? (
                <span className="px-1.5 py-0.5 text-xs font-semibold bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                  {currentMachine.manuals.length}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => {
                handleExportExcel();
                setModulesMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              <FileSpreadsheet className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={() => {
                handleExportPDF();
                setModulesMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              <Download className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              <span>Exportar PDF</span>
            </button>

            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

            <button
              onClick={() => {
                setShowBackupModal(true);
                setModulesMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              <Database className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              <span>Backup</span>
            </button>

            <button
              onClick={() => {
                setShowReportsModal(true);
                setModulesMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              <BarChart3 className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              <span>Reportes</span>
            </button>

            <button
              onClick={() => {
                setShowContextComparator(true);
                setModulesMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              <GitCompare className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              <span>Comparar</span>
            </button>
          </div>
        )}
      </div>

      {/* Botones Undo/Redo */}
      <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-3 ml-1">
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={`p-2 rounded-lg transition-colors ${
            canUndo 
              ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' 
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          }`}
          title={canUndo ? `Deshacer: ${getActionDescription(peekUndo()!)}` : 'Nada que deshacer'}
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className={`p-2 rounded-lg transition-colors ${
            canRedo 
              ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' 
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          }`}
          title="Rehacer"
        >
          <Redo2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowActivityLogModal(true)}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Ver registro de actividad"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {repuestos.length === 0 && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowImportModal(true)}
          icon={<Upload className="w-4 h-4" />}
        >
          Importar
        </Button>
      )}

      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />

      {/* Toggle tema */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </>
  );

  const desktopUserActions = (
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <span>{user?.email}</span>
      <button
        onClick={signOut}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        title="Cerrar sesión"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );

  const mainNavigation = (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4">
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            setMainView('catalogo');
            setRightPanelMode('hidden');
          }}
          className={`flex items-center gap-2 px-4 ${isManualPanelOpen ? 'py-2' : 'py-3'} text-sm font-medium border-b-2 transition-colors ${
            mainView === 'catalogo'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <Package className="w-4 h-4" />
          Catálogo
        </button>
        <button
          onClick={() => {
            setMainView('reportes');
            setRightPanelMode('hidden');
          }}
          className={`flex items-center gap-2 px-4 ${isManualPanelOpen ? 'py-2' : 'py-3'} text-sm font-medium border-b-2 transition-colors ${
            mainView === 'reportes'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Reportes
        </button>
        <button
          onClick={() => {
            setMainView('admin');
            setRightPanelMode('hidden');
          }}
          className={`flex items-center gap-2 px-4 ${isManualPanelOpen ? 'py-2' : 'py-3'} text-sm font-medium border-b-2 transition-colors ${
            mainView === 'admin'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <Database className="w-4 h-4" />
          Admin
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className={`px-4 ${isManualPanelOpen ? 'py-2' : 'py-3'} flex items-center justify-between flex-nowrap`}>
          {/* Selector de Máquina y versión */}
          <div className="flex items-center gap-4">
            <MachineSelector
              onEditMachine={(machine) => setEditingMachineModal(machine)}
              displayLabel={catalogScopeBadge}
              displaySubLabel={catalogScopeBadge ? (currentMachine?.nombre || null) : null}
            />
            <span className="text-xs font-normal bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
              v{APP_VERSION}
            </span>

            {/* Cuando el manual está abierto, mover acciones al lado izquierdo */}
            {isManualPanelOpen && (
              <div className="hidden md:flex items-center gap-3">
                {desktopCoreActions}

                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />

                {desktopUserActions}
              </div>
            )}
          </div>

          {/* Acciones desktop */}
          <div className="hidden md:flex items-center gap-3">
            {!isManualPanelOpen && desktopCoreActions}

            {!isManualPanelOpen && desktopUserActions}
          </div>

          {/* Menú móvil */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-xl animate-slideInRight">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <span className="font-semibold">Menú</span>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  setMainView('catalogo');
                  setRightPanelMode('hidden');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100"
              >
                <Package className="w-5 h-5 text-gray-500" />
                <span>Catálogo</span>
              </button>
              <button
                onClick={() => {
                  setMainView('catalogo');
                  setRightPanelMode('pdf');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100"
              >
                <BookOpen className="w-5 h-5 text-gray-500" />
                <span>Ver Manual</span>
              </button>
              <button
                onClick={() => {
                  setMainView('reportes');
                  setRightPanelMode('hidden');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Reportes</span>
              </button>
              <button
                onClick={() => {
                  setMainView('admin');
                  setRightPanelMode('hidden');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Database className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Admin</span>
              </button>
              <button
                onClick={() => {
                  handleExportExcel();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100"
              >
                <FileSpreadsheet className="w-5 h-5 text-gray-500" />
                <span>Exportar Excel</span>
              </button>
              <button
                onClick={() => {
                  handleExportPDF();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100"
              >
                <Download className="w-5 h-5 text-gray-500" />
                <span>Exportar PDF</span>
              </button>
              <button
                onClick={() => {
                  setShowBackupModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Database className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Backup/Restore</span>
              </button>
              <button
                onClick={() => {
                  setShowReportsModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Reportes y Análisis</span>
              </button>
              <button
                onClick={() => {
                  toggleTheme();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-500" />}
                <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
              </button>
              <hr className="my-4 dark:border-gray-700" />
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{user?.email}</div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {mainView === 'catalogo' && rightPanelMode !== 'hidden' ? (
          <>
            {/* En móvil mantenemos la navegación a ancho completo */}
            <div className="md:hidden">{mainNavigation}</div>

            {/* En desktop, la navegación queda solo en la columna izquierda para que el panel derecho suba hasta el header */}
            <div className="flex-1 flex overflow-hidden">
              {/* Panel Izquierdo - Tabla + contexto */}
              <div className="hidden md:flex flex-1 min-w-0 overflow-hidden flex-col md:w-1/2 lg:w-3/5">
                <div className="hidden md:block">{mainNavigation}</div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <RepuestosTable
                  machineId={machineId}
                  repuestos={repuestos}
                  catalogScope={catalogScope}
                  onCatalogScopeChange={setCatalogScope}
                  machines={machines}
                  selectedCatalogMachineIds={selectedCatalogMachineIds}
                  onSelectedCatalogMachineIdsChange={setSelectedCatalogMachineIds}
                  globalRepuestos={globalCatalog.items}
                  globalLoading={globalCatalog.loading}
                  onJumpToMachineRepuesto={handleJumpToMachineRepuesto}
                  focusRepuestoId={focusRepuestoId}
                  onFocusHandled={() => setFocusRepuestoId(null)}
                  selectedRepuesto={selectedRepuesto}
                  onSelect={handleSelectRepuesto}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewManual={handleViewManual}
                  onViewPhotos={handleViewPhotos}
                  onViewHistory={handleViewHistory}
                  onAddNew={handleAddNew}
                  onMarkInManual={handleMarkInManual}
                  getHistorial={getHistorial}
                  onManageTags={() => setShowTagManager(true)}
                  onFilteredChange={setFilteredRepuestos}
                  onContextsChange={handleContextsChange}
                  onImportCantidadesPorTag={importCantidadesPorTag}
                  onImportCatalogoDesdeExcel={importCatalogoDesdeExcel}
                  compactMode={true}
                  />
                </div>
              </div>

              {/* Panel Derecho - Imágenes / Manual (40% en lg) */}
              <div className="w-full md:w-1/2 lg:w-2/5 border-l border-gray-200 flex flex-col">
                  {/* Tabs del panel derecho (en desktop se oculta en modo Manual para ganar altura) */}
                  <div className={`flex border-b border-gray-200 bg-white ${isManualPanelOpen ? 'md:hidden' : ''}`}>
                    <button
                      onClick={() => setRightPanelMode('gallery')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 ${isManualPanelOpen ? 'py-2' : 'py-3'} text-sm font-medium border-b-2 transition-colors ${
                        rightPanelMode === 'gallery'
                          ? 'text-primary-600 border-primary-600'
                          : 'text-gray-500 border-transparent hover:text-gray-700'
                      }`}
                    >
                      <Image className="w-4 h-4" />
                      Imágenes
                    </button>
                    <button
                      onClick={() => setRightPanelMode('pdf')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 ${isManualPanelOpen ? 'py-2' : 'py-3'} text-sm font-medium border-b-2 transition-colors ${
                        rightPanelMode === 'pdf' || rightPanelMode === 'marker-editor'
                          ? 'text-primary-600 border-primary-600'
                          : 'text-gray-500 border-transparent hover:text-gray-700'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Manual
                    </button>

                    {/* Botón cerrar en móvil */}
                    <button
                      onClick={() => setRightPanelMode('hidden')}
                      className="md:hidden px-3 text-gray-400 hover:text-gray-600"
                      title="Cerrar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Contenido del panel derecho */}
                  <div className="flex-1 overflow-hidden">
                    {rightPanelMode === 'gallery' ? (
                      <div className="flex flex-col h-full">
                        {/* Selector Manual/Fotos reales */}
                        {selectedRepuesto && (
                          <div className="flex gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                            <button
                              onClick={() => setGalleryType('manual')}
                              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                                galleryType === 'manual'
                                  ? 'bg-white border-primary-300 text-primary-700'
                                  : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                              }`}
                              title="Imágenes del manual"
                            >
                              Manual ({selectedRepuesto.imagenesManual?.length || 0})
                            </button>
                            <button
                              onClick={() => setGalleryType('real')}
                              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                                galleryType === 'real'
                                  ? 'bg-white border-primary-300 text-primary-700'
                                  : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                              }`}
                              title="Fotos reales"
                            >
                              Fotos ({selectedRepuesto.fotosReales?.length || 0})
                            </button>
                          </div>
                        )}

                        <div className="flex-1 overflow-hidden">
                          <ImageGallery
                            repuesto={selectedRepuesto}
                            tipo={galleryType}
                            onUpload={handleUploadImage}
                            onDelete={handleDeleteImage}
                            onSetPrimary={handleSetPrimaryImage}
                            onUpdateOrder={handleUpdateImageOrder}
                          />
                        </div>
                      </div>
                    ) : rightPanelMode === 'marker-editor' && markerRepuesto && pdfUrl ? (
                      <Suspense fallback={<PDFLoadingFallback />}>
                        <PDFMarkerEditor
                          pdfUrl={pdfUrl}
                          repuestoId={markerRepuesto.id}
                          repuestoDescripcion={markerRepuesto.descripcion || markerRepuesto.textoBreve}
                          existingMarker={editingMarker || undefined}
                          onSave={handleSaveMarker}
                          onCancel={() => {
                            setRightPanelMode('pdf');
                            setMarkerRepuesto(null);
                            setEditingMarker(null);
                          }}
                          repuestos={repuestos}
                          onSelectRepuesto={(r: Repuesto) => {
                            setMarkerRepuesto(r);
                            setSelectedRepuesto(r);
                          }}
                        />
                      </Suspense>
                    ) : rightPanelMode === 'pdf' ? (
                      <div className="flex flex-col h-full">
                        {/* Selector de manuales cuando hay múltiples */}
                        {currentMachine && currentMachine.manuals && currentMachine.manuals.length > 1 && (
                          <div className="flex border-b border-gray-100 bg-gray-50 px-3 py-2">
                            <select
                              value={selectedManualIndex}
                              onChange={(e) => setSelectedManualIndex(Number(e.target.value))}
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              {currentMachine.manuals.map((manual, index) => {
                                const fileName = manual.split('/').pop()?.split('?')[0] || `Manual ${index + 1}`;
                                const decodedName = decodeURIComponent(fileName);
                                return (
                                  <option key={index} value={index}>
                                    {decodedName}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}

                        {/* En móvil, el contexto queda arriba (en desktop se movió a la izquierda) */}
                        {selectedRepuesto && (
                          <div className="md:hidden border-b border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs text-gray-500">Ubicaciones en manual</div>
                                <div className="text-sm font-medium text-gray-800 truncate">
                                  {selectedRepuesto.codigoSAP} — {selectedRepuesto.textoBreve}
                                </div>
                              </div>
                              {selectedRepuesto.vinculosManual?.length > 0 ? (
                                <div className="text-xs text-gray-500 whitespace-nowrap">
                                  {selectedRepuesto.vinculosManual.length} marcador(es)
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleMarkInManual(selectedRepuesto)}
                                  title="Agregar marcador"
                                >
                                  Marcar
                                </Button>
                              )}
                            </div>

                            {selectedRepuesto.vinculosManual?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {selectedRepuesto.vinculosManual
                                  .slice()
                                  .sort((a, b) => a.pagina - b.pagina)
                                  .map((m) => (
                                    <button
                                      key={m.id}
                                      onClick={() => handleGoToMarker(m)}
                                      className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                                        currentMarker?.id === m.id
                                          ? 'bg-white border-primary-300 text-primary-700'
                                          : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                                      }`}
                                      title={m.descripcion || `Página ${m.pagina}`}
                                    >
                                      p.{m.pagina}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}

                        {pdfUrl ? (
                          <div className="flex-1 overflow-hidden">
                            <Suspense fallback={<PDFLoadingFallback />}>
                              <PDFViewer
                                pdfUrl={pdfUrl}
                                targetPage={targetPage}
                                marker={currentMarker}
                                onCapture={selectedRepuesto ? handlePDFCapture : undefined}
                                onEditMarker={selectedRepuesto ? (marker) => handleMarkInManual(selectedRepuesto, marker) : undefined}
                                onDeleteMarker={selectedRepuesto ? (marker) => handleDeleteMarker(selectedRepuesto, marker.id) : undefined}
                                onAddMarker={selectedRepuesto ? () => handleMarkInManual(selectedRepuesto) : undefined}
                                preloadedPDF={pdfPreloader.url === pdfUrl ? pdfPreloader.pdf : null}
                                preloadedText={pdfPreloader.url === pdfUrl ? pdfPreloader.textContent : undefined}
                              />
                            </Suspense>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
                            <div className="text-center max-w-md">
                              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                No hay manual disponible
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Esta máquina aún no tiene manuales cargados.
                                {currentMachine ? ` Puedes agregar manuales desde la configuración de "${currentMachine.nombre}".` : ''}
                              </p>
                              <Button
                                variant="primary"
                                onClick={() => {
                                  if (currentMachine) {
                                    setEditingMachineModal(currentMachine);
                                  }
                                }}
                                icon={<Upload className="w-4 h-4" />}
                              >
                                Agregar Manual
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Barra de navegación principal */}
            {mainNavigation}

            {/* Contenido basado en la vista activa */}
            <div className="flex-1 flex overflow-hidden">
              {mainView === 'reportes' ? (
            <div className="flex-1 overflow-hidden">
              <StatsPanel repuestos={repuestos} />
            </div>
          ) : mainView === 'admin' ? (
            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
              <div className="max-w-4xl mx-auto p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Administración</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowImportModal(true)}
                    icon={<Upload className="w-4 h-4" />}
                  >
                    Importar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowBackupModal(true)}
                    icon={<Database className="w-4 h-4" />}
                  >
                    Backup/Restore
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowReportsModal(true)}
                    icon={<BarChart3 className="w-4 h-4" />}
                  >
                    Reportes y Análisis
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowActivityLogModal(true)}
                    icon={<History className="w-4 h-4" />}
                  >
                    Activity Log
                  </Button>
                </div>
              </div>
            </div>
          ) : mainView === 'manual' ? (
            <>
              {/* Manual: en pantallas anchas usa layout 60/40 (izq info, der visor) */}
              <div className="w-full flex flex-col h-full">
                {/* Tabs del panel (solo Manual) */}
                <div className="flex border-b border-gray-200 bg-white">
                  <button
                    onClick={() => setRightPanelMode('pdf')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors text-primary-600 border-b-2 border-primary-600"
                  >
                    <FileText className="w-4 h-4" />
                    Manual
                  </button>
                  {/* Botón cerrar en móvil: vuelve a Catálogo */}
                  <button
                    onClick={() => {
                      setMainView('catalogo');
                      setRightPanelMode('hidden');
                    }}
                    className="md:hidden px-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Selector de manuales cuando hay múltiples */}
                {currentMachine && currentMachine.manuals && currentMachine.manuals.length > 1 && (
                  <div className="flex border-b border-gray-100 bg-gray-50 px-3 py-2">
                    <select
                      value={selectedManualIndex}
                      onChange={(e) => setSelectedManualIndex(Number(e.target.value))}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {currentMachine.manuals.map((manual, index) => {
                        const fileName = manual.split('/').pop()?.split('?')[0] || `Manual ${index + 1}`;
                        const decodedName = decodeURIComponent(fileName);
                        return (
                          <option key={index} value={index}>
                            {decodedName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div className="flex-1 flex overflow-hidden">
                  {/* Panel izquierdo (solo en lg+): info/ubicaciones */}
                  <div className="hidden lg:flex lg:w-3/5 flex-col border-r border-gray-200 overflow-hidden">
                    {selectedRepuesto ? (
                      <div className="h-full flex flex-col">
                        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs text-gray-500">Ubicaciones en manual</div>
                              <div className="text-sm font-medium text-gray-800 truncate">
                                {selectedRepuesto.codigoSAP} — {selectedRepuesto.textoBreve}
                              </div>
                            </div>
                            {selectedRepuesto.vinculosManual?.length > 0 ? (
                              <div className="text-xs text-gray-500 whitespace-nowrap">
                                {selectedRepuesto.vinculosManual.length} marcador(es)
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleMarkInManual(selectedRepuesto)}
                                title="Agregar marcador"
                              >
                                Marcar
                              </Button>
                            )}
                          </div>

                          {selectedRepuesto.vinculosManual?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedRepuesto.vinculosManual
                                .slice()
                                .sort((a, b) => a.pagina - b.pagina)
                                .map((m) => (
                                  <button
                                    key={m.id}
                                    onClick={() => handleGoToMarker(m)}
                                    className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                                      currentMarker?.id === m.id
                                        ? 'bg-white border-primary-300 text-primary-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                                    }`}
                                    title={m.descripcion || `Página ${m.pagina}`}
                                  >
                                    p.{m.pagina}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 overflow-auto bg-white" />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center bg-gray-50 p-8">
                        <div className="text-center max-w-md">
                          <h3 className="text-base font-semibold text-gray-700 mb-2">Sin repuesto seleccionado</h3>
                          <p className="text-sm text-gray-500">Selecciona un repuesto en Catálogo para ver sus ubicaciones en el manual.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Panel derecho: visor (40% en lg+) */}
                  <div className="w-full lg:w-2/5 flex flex-col overflow-hidden">
                    {rightPanelMode === 'marker-editor' && markerRepuesto && pdfUrl ? (
                      <Suspense fallback={<PDFLoadingFallback />}>
                        <PDFMarkerEditor
                          pdfUrl={pdfUrl}
                          repuestoId={markerRepuesto.id}
                          repuestoDescripcion={markerRepuesto.descripcion || markerRepuesto.textoBreve}
                          existingMarker={editingMarker || undefined}
                          onSave={handleSaveMarker}
                          onCancel={() => {
                            setRightPanelMode('pdf');
                            setMarkerRepuesto(null);
                            setEditingMarker(null);
                          }}
                          repuestos={repuestos}
                          onSelectRepuesto={(r: Repuesto) => {
                            setMarkerRepuesto(r);
                            setSelectedRepuesto(r);
                          }}
                        />
                      </Suspense>
                    ) : pdfUrl ? (
                      <div className="flex flex-col h-full">
                        {/* En móvil: mostrar ubicaciones arriba del visor. En lg+ ya están a la izquierda */}
                        {selectedRepuesto && (
                          <div className="lg:hidden border-b border-gray-100 bg-gray-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs text-gray-500">Ubicaciones en manual</div>
                                <div className="text-sm font-medium text-gray-800 truncate">
                                  {selectedRepuesto.codigoSAP} — {selectedRepuesto.textoBreve}
                                </div>
                              </div>
                              {selectedRepuesto.vinculosManual?.length > 0 ? (
                                <div className="text-xs text-gray-500 whitespace-nowrap">
                                  {selectedRepuesto.vinculosManual.length} marcador(es)
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleMarkInManual(selectedRepuesto)}
                                  title="Agregar marcador"
                                >
                                  Marcar
                                </Button>
                              )}
                            </div>

                            {selectedRepuesto.vinculosManual?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {selectedRepuesto.vinculosManual
                                  .slice()
                                  .sort((a, b) => a.pagina - b.pagina)
                                  .map((m) => (
                                    <button
                                      key={m.id}
                                      onClick={() => handleGoToMarker(m)}
                                      className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                                        currentMarker?.id === m.id
                                          ? 'bg-white border-primary-300 text-primary-700'
                                          : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                                      }`}
                                      title={m.descripcion || `Página ${m.pagina}`}
                                    >
                                      p.{m.pagina}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex-1 overflow-hidden">
                          <Suspense fallback={<PDFLoadingFallback />}>
                            <PDFViewer
                              pdfUrl={pdfUrl}
                              targetPage={targetPage}
                              marker={currentMarker}
                              onCapture={selectedRepuesto ? handlePDFCapture : undefined}
                              onEditMarker={selectedRepuesto ? (marker) => handleMarkInManual(selectedRepuesto, marker) : undefined}
                              onDeleteMarker={selectedRepuesto ? (marker) => handleDeleteMarker(selectedRepuesto, marker.id) : undefined}
                              onAddMarker={selectedRepuesto ? () => handleMarkInManual(selectedRepuesto) : undefined}
                              preloadedPDF={pdfPreloader.url === pdfUrl ? pdfPreloader.pdf : null}
                              preloadedText={pdfPreloader.url === pdfUrl ? pdfPreloader.textContent : undefined}
                            />
                          </Suspense>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
                        <div className="text-center max-w-md">
                          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            No hay manual disponible
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Esta máquina aún no tiene manuales cargados.
                            {currentMachine ? ` Puedes agregar manuales desde la configuración de "${currentMachine.nombre}".` : ''}
                          </p>
                          <Button
                            variant="primary"
                            onClick={() => {
                              if (currentMachine) {
                                setEditingMachineModal(currentMachine);
                              }
                            }}
                            icon={<Upload className="w-4 h-4" />}
                          >
                            Agregar Manual
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Panel Izquierdo - Tabla + contexto (las ubicaciones se mueven aquí) */}
              <div className={`
                flex-1 min-w-0 overflow-hidden flex flex-col
                ${rightPanelMode !== 'hidden' ? 'hidden md:flex md:w-1/2 lg:w-3/5' : 'w-full'}
              `}>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <RepuestosTable
                  machineId={machineId}
                  repuestos={repuestos}
                  catalogScope={catalogScope}
                  onCatalogScopeChange={setCatalogScope}
                  machines={machines}
                  selectedCatalogMachineIds={selectedCatalogMachineIds}
                  onSelectedCatalogMachineIdsChange={setSelectedCatalogMachineIds}
                  globalRepuestos={globalCatalog.items}
                  globalLoading={globalCatalog.loading}
                  onJumpToMachineRepuesto={handleJumpToMachineRepuesto}
                  focusRepuestoId={focusRepuestoId}
                  onFocusHandled={() => setFocusRepuestoId(null)}
                  selectedRepuesto={selectedRepuesto}
                  onSelect={handleSelectRepuesto}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewManual={handleViewManual}
                  onViewPhotos={handleViewPhotos}
                  onViewHistory={handleViewHistory}
                  onAddNew={handleAddNew}
                  onMarkInManual={handleMarkInManual}
                  getHistorial={getHistorial}
                  onManageTags={() => setShowTagManager(true)}
                  onFilteredChange={setFilteredRepuestos}
                  onContextsChange={handleContextsChange}
                  onImportCantidadesPorTag={importCantidadesPorTag}
                  onImportCatalogoDesdeExcel={importCatalogoDesdeExcel}
                  compactMode={rightPanelMode !== 'hidden'}
                  />
                </div>
              </div>

        {/* Panel Derecho - Imágenes / Manual (40% en lg) */}
        {rightPanelMode !== 'hidden' && (
          <div className="w-full md:w-1/2 lg:w-2/5 border-l border-gray-200 flex flex-col">
            {/* Tabs del panel derecho (en desktop se oculta en modo Manual para ganar altura) */}
            <div className={`flex border-b border-gray-200 bg-white ${isManualPanelOpen ? 'md:hidden' : ''}`}>
              <button
                onClick={() => setRightPanelMode('gallery')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 ${isManualPanelOpen ? 'py-2' : 'py-3'} text-sm font-medium border-b-2 transition-colors ${
                  rightPanelMode === 'gallery'
                    ? 'text-primary-600 border-primary-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <Image className="w-4 h-4" />
                Imágenes
              </button>
              <button
                onClick={() => setRightPanelMode('pdf')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 ${isManualPanelOpen ? 'py-2' : 'py-3'} text-sm font-medium border-b-2 transition-colors ${
                  rightPanelMode === 'pdf' || rightPanelMode === 'marker-editor'
                    ? 'text-primary-600 border-primary-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Manual
              </button>

              {/* Botón cerrar en móvil */}
              <button
                onClick={() => setRightPanelMode('hidden')}
                className="md:hidden px-3 text-gray-400 hover:text-gray-600"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del panel derecho */}
            <div className="flex-1 overflow-hidden">
              {rightPanelMode === 'gallery' ? (
                <div className="flex flex-col h-full">
                  {/* Selector Manual/Fotos reales */}
                  {selectedRepuesto && (
                    <div className="flex gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                      <button
                        onClick={() => setGalleryType('manual')}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                          galleryType === 'manual'
                            ? 'bg-white border-primary-300 text-primary-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                        }`}
                        title="Imágenes del manual"
                      >
                        Manual ({selectedRepuesto.imagenesManual?.length || 0})
                      </button>
                      <button
                        onClick={() => setGalleryType('real')}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                          galleryType === 'real'
                            ? 'bg-white border-primary-300 text-primary-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                        }`}
                        title="Fotos reales"
                      >
                        Fotos ({selectedRepuesto.fotosReales?.length || 0})
                      </button>
                    </div>
                  )}

                  <div className="flex-1 overflow-hidden">
                    <ImageGallery
                      repuesto={selectedRepuesto}
                      tipo={galleryType}
                      onUpload={handleUploadImage}
                      onDelete={handleDeleteImage}
                      onSetPrimary={handleSetPrimaryImage}
                      onUpdateOrder={handleUpdateImageOrder}
                    />
                  </div>
                </div>
              ) : rightPanelMode === 'marker-editor' && markerRepuesto && pdfUrl ? (
                <Suspense fallback={<PDFLoadingFallback />}>
                  <PDFMarkerEditor
                    pdfUrl={pdfUrl}
                    repuestoId={markerRepuesto.id}
                    repuestoDescripcion={markerRepuesto.descripcion || markerRepuesto.textoBreve}
                    existingMarker={editingMarker || undefined}
                    onSave={handleSaveMarker}
                    onCancel={() => {
                      setRightPanelMode('pdf');
                      setMarkerRepuesto(null);
                      setEditingMarker(null);
                    }}
                    repuestos={repuestos}
                    onSelectRepuesto={(r: Repuesto) => {
                      setMarkerRepuesto(r);
                      setSelectedRepuesto(r);
                    }}
                  />
                </Suspense>
              ) : rightPanelMode === 'pdf' ? (
                <div className="flex flex-col h-full">
                  {/* Selector de manuales cuando hay múltiples */}
                  {currentMachine && currentMachine.manuals && currentMachine.manuals.length > 1 && (
                    <div className="flex border-b border-gray-100 bg-gray-50 px-3 py-2">
                      <select
                        value={selectedManualIndex}
                        onChange={(e) => setSelectedManualIndex(Number(e.target.value))}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {currentMachine.manuals.map((manual, index) => {
                          const fileName = manual.split('/').pop()?.split('?')[0] || `Manual ${index + 1}`;
                          const decodedName = decodeURIComponent(fileName);
                          return (
                            <option key={index} value={index}>
                              {decodedName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* En móvil, el contexto queda arriba (en desktop se movió a la izquierda) */}
                  {selectedRepuesto && (
                    <div className="md:hidden border-b border-gray-100 bg-gray-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500">Ubicaciones en manual</div>
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {selectedRepuesto.codigoSAP} — {selectedRepuesto.textoBreve}
                          </div>
                        </div>
                        {selectedRepuesto.vinculosManual?.length > 0 ? (
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {selectedRepuesto.vinculosManual.length} marcador(es)
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleMarkInManual(selectedRepuesto)}
                            title="Agregar marcador"
                          >
                            Marcar
                          </Button>
                        )}
                      </div>

                      {selectedRepuesto.vinculosManual?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedRepuesto.vinculosManual
                            .slice()
                            .sort((a, b) => a.pagina - b.pagina)
                            .map((m) => (
                              <button
                                key={m.id}
                                onClick={() => handleGoToMarker(m)}
                                className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                                  currentMarker?.id === m.id
                                    ? 'bg-white border-primary-300 text-primary-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                                }`}
                                title={m.descripcion || `Página ${m.pagina}`}
                              >
                                p.{m.pagina}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {pdfUrl ? (
                    <div className="flex-1 overflow-hidden">
                      <Suspense fallback={<PDFLoadingFallback />}>
                        <PDFViewer
                          pdfUrl={pdfUrl}
                          targetPage={targetPage}
                          marker={currentMarker}
                          onCapture={selectedRepuesto ? handlePDFCapture : undefined}
                          onEditMarker={selectedRepuesto ? (marker) => handleMarkInManual(selectedRepuesto, marker) : undefined}
                          onDeleteMarker={selectedRepuesto ? (marker) => handleDeleteMarker(selectedRepuesto, marker.id) : undefined}
                          onAddMarker={selectedRepuesto ? () => handleMarkInManual(selectedRepuesto) : undefined}
                          preloadedPDF={pdfPreloader.url === pdfUrl ? pdfPreloader.pdf : null}
                          preloadedText={pdfPreloader.url === pdfUrl ? pdfPreloader.textContent : undefined}
                        />
                      </Suspense>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
                      <div className="text-center max-w-md">
                        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          No hay manual disponible
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                          Esta máquina aún no tiene manuales cargados.
                          {currentMachine ? ` Puedes agregar manuales desde la configuración de "${currentMachine.nombre}".` : ''}
                        </p>
                        <Button
                          variant="primary"
                          onClick={() => {
                            if (currentMachine) {
                              setEditingMachineModal(currentMachine);
                            }
                          }}
                          icon={<Upload className="w-4 h-4" />}
                        >
                          Agregar Manual
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
            </>
          )}
            </div>
          </>
        )}
      </div>

      {/* Modales */}
      <RepuestoForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        repuesto={editRepuesto}
        machineId={machineId}
        allRepuestos={repuestos}
        initialContexts={formMode === 'create' ? activeContexts : undefined}
      />

      <HistorialModal
        isOpen={!!historialTarget}
        onClose={() => setHistorialTarget(null)}
        repuesto={historialTarget}
        getHistorial={getHistorial}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        repuesto={deleteTarget}
        loading={deleteLoading}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      <TagManagerModal
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        machineId={machineId}
        repuestos={repuestos}
        onRenameTag={renameTag}
        onDeleteTag={deleteTag}
      />

      {/* Modal de exportación PDF */}
      {showPDFExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPDFExportModal(false)}>
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Download className="w-5 h-5 text-primary-600" />
                Exportar PDF
              </h3>
              <button 
                onClick={() => setShowPDFExportModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">
                Se exportarán {filteredRepuestos.length > 0 ? filteredRepuestos.length : repuestos.length} repuestos
              </p>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={pdfIncludeCharts}
                  onChange={(e) => setPdfIncludeCharts(e.target.checked)}
                  className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <div>
                  <span className="font-medium text-gray-800">Incluir gráficos</span>
                  <p className="text-xs text-gray-500">Barras, circular e indicadores en el resumen</p>
                </div>
              </label>
            </div>
            
            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowPDFExportModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmExportPDF}
                className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de exportación Excel */}
      {showExcelExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowExcelExportModal(false)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Exportar Excel
              </h3>
              <button 
                onClick={() => setShowExcelExportModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Se exportarán {filteredRepuestos.length > 0 ? filteredRepuestos.length : repuestos.length} repuestos
              </p>
              
              {/* Selector de formato */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Formato de exportación</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExcelFormato('simple')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      excelFormato === 'simple' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium text-gray-800 dark:text-gray-200">Simple</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Solo datos, 1 hoja</div>
                  </button>
                  <button
                    onClick={() => setExcelFormato('completo')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      excelFormato === 'completo' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium text-gray-800 dark:text-gray-200">Completo</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Estilos, múltiples hojas</div>
                  </button>
                </div>
              </div>
              
              {/* Opciones solo para formato completo */}
              {excelFormato === 'completo' && (
                <div className="space-y-2 pt-2 border-t dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opciones avanzadas</label>
                  
                  <label className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={excelIncluirEstilos}
                      onChange={(e) => setExcelIncluirEstilos(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded border-gray-300 dark:border-gray-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Incluir estilos</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Colores, bordes y formato condicional</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={excelIncluirResumen}
                      onChange={(e) => setExcelIncluirResumen(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded border-gray-300 dark:border-gray-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Hoja de resumen</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Estadísticas y totales generales</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={excelIncluirSinStock}
                      onChange={(e) => setExcelIncluirSinStock(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded border-gray-300 dark:border-gray-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Hoja "Sin Stock"</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Lista de repuestos con stock en 0</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={excelIncluirPorTags}
                      onChange={(e) => setExcelIncluirPorTags(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded border-gray-300 dark:border-gray-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Hoja "Por Tags"</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Resumen agrupado por etiquetas</p>
                    </div>
                  </label>
                </div>
              )}
            </div>
            
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex gap-3 justify-end">
              <button
                onClick={() => setShowExcelExportModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmExportExcel}
                className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Backup/Restore */}
      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        backupSystem={backupSystem}
        repuestos={repuestos}
        onRestore={importRepuestos}
        onSuccess={success}
        onError={error}
      />

      {/* Modal de Reportes */}
      <ReportsModal 
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        repuestos={filteredRepuestos.length > 0 ? filteredRepuestos : repuestos}
      />

      {/* Modal de Activity Log */}
      <ActivityLogModal
        isOpen={showActivityLogModal}
        onClose={() => setShowActivityLogModal(false)}
        onRestoreAction={handleRestoreFromLog}
      />

      {/* Modal Comparador de Contextos */}
      <ContextComparator
        isOpen={showContextComparator}
        onClose={() => setShowContextComparator(false)}
        repuestos={repuestos}
        isDarkMode={isDark}
        pdfUrl={pdfUrl}
        onViewInManual={(repuesto: Repuesto) => {
          setShowContextComparator(false);
          handleViewManual(repuesto);
        }}
      />

      {/* Modal para editar máquina (agregar manuales) */}
      {editingMachineModal && (
        <MachineFormModal
          key={editingMachineModal.id} // Force remount on machine change
          isOpen={!!editingMachineModal}
          onClose={() => setEditingMachineModal(null)}
          machine={editingMachineModal}
        />
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
