import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRepuestos } from '../hooks/useRepuestos';
import { useStorage } from '../hooks/useStorage';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { useDolar } from '../hooks/useDolar';
import { useTheme } from '../hooks/useTheme';
import { Repuesto, RepuestoFormData, ImagenRepuesto, VinculoManual } from '../types';
import { APP_VERSION } from '../version';

import { RepuestosTable } from './repuestos/RepuestosTable';
import { RepuestoForm } from './repuestos/RepuestoForm';
import { HistorialModal } from './repuestos/HistorialModal';
import { DeleteConfirmModal } from './repuestos/DeleteConfirmModal';
import { TagManagerModal } from './repuestos/TagManagerModal';
import { ImageGallery } from './gallery/ImageGallery';

// Lazy load PDF components para optimizar carga inicial
const PDFViewer = lazy(() => import('./pdf/PDFViewer').then(module => ({ default: module.PDFViewer })));
const PDFMarkerEditor = lazy(() => import('./pdf/PDFMarkerEditor').then(module => ({ default: module.PDFMarkerEditor })));

import { ImportModal } from './ImportModal';
import { StatsPanel } from './stats/StatsPanel';
import { ToastContainer, Button } from './ui';

import { exportToExcel, exportToPDF } from '../utils/exportUtils';

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
  HardDriveDownload,
  HardDriveUpload,
  Moon,
  Sun
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
type MainView = 'repuestos' | 'stats';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { 
    repuestos, 
    loading, 
    createRepuesto, 
    updateRepuesto, 
    deleteRepuesto, 
    getHistorial,
    importRepuestos,
    renameTag,
    deleteTag
  } = useRepuestos();
  const { uploadImage, getManualURL } = useStorage();
  const { lastSelectedRepuestoId, setLastSelectedRepuesto } = useLocalStorage();
  const { toasts, removeToast, success, error } = useToast();
  const { valor: tipoCambio } = useDolar();
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
  const [galleryType, setGalleryType] = useState<GalleryType>('manual');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [targetPage, setTargetPage] = useState<number | undefined>();
  const [currentMarker, setCurrentMarker] = useState<VinculoManual | undefined>();
  const [markerRepuesto, setMarkerRepuesto] = useState<Repuesto | null>(null);

  // Estado móvil
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  
  // Vista principal activa
  const [mainView, setMainView] = useState<MainView>('repuestos');
  
  // Repuestos filtrados (para exportación)
  const [filteredRepuestos, setFilteredRepuestos] = useState<Repuesto[]>([]);
  
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
  const [backupLoading, setBackupLoading] = useState(false);

  // Cargar URL del manual
  useEffect(() => {
    getManualURL().then(url => {
      if (url) setPdfUrl(url);
    });
  }, [getManualURL]);

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
        setRightPanelMode(rightPanelMode === 'pdf' ? 'hidden' : 'pdf');
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
        await updateRepuesto(editRepuesto.id, data, editRepuesto);
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
      setTargetPage(marker.pagina);
      setCurrentMarker(marker);
    } else {
      setTargetPage(undefined);
      setCurrentMarker(undefined);
    }
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
    setMarkerRepuesto(repuesto);
    setSelectedRepuesto(repuesto);
    setEditingMarker(existingMarker || null);
    setRightPanelMode('marker-editor');
  };

  // Estado para edición de marcador existente
  const [editingMarker, setEditingMarker] = useState<VinculoManual | null>(null);

  // Guardar marcador (nuevo o editado)
  const handleSaveMarker = async (marker: Omit<VinculoManual, 'id'>) => {
    if (!markerRepuesto) return;
    
    const vinculosActuales = markerRepuesto.vinculosManual || [];
    
    if (editingMarker) {
      // Editar marcador existente
      const updatedVinculos = vinculosActuales.map(v => 
        v.id === editingMarker.id ? { ...marker, id: editingMarker.id } : v
      );
      await updateRepuesto(markerRepuesto.id, {
        vinculosManual: updatedVinculos
      });
      success('Marcador actualizado correctamente');
      setCurrentMarker({ ...marker, id: editingMarker.id });
    } else {
      // Crear nuevo marcador
      const newMarker: VinculoManual = {
        ...marker,
        id: Date.now().toString()
      };
      await updateRepuesto(markerRepuesto.id, {
        vinculosManual: [...vinculosActuales, newMarker]
      });
      success('Marcador guardado - Ahora puedes ver este repuesto en el manual');
      setCurrentMarker(newMarker);
    }
    
    setRightPanelMode('pdf');
    setMarkerRepuesto(null);
    setEditingMarker(null);
    setTargetPage(marker.pagina);
  };

  // Eliminar marcador
  const handleDeleteMarker = async (repuesto: Repuesto, markerId: string) => {
    const vinculosActuales = repuesto.vinculosManual || [];
    const updatedVinculos = vinculosActuales.filter(v => v.id !== markerId);
    
    await updateRepuesto(repuesto.id, {
      vinculosManual: updatedVinculos
    });
    
    success('Marcador eliminado');
    setCurrentMarker(undefined);
  };

  const handleViewHistory = (repuesto: Repuesto) => {
    setHistorialTarget(repuesto);
  };

  // Handlers de imágenes
  const handleUploadImage = async (file: File, repuestoId: string, tipo: 'manual' | 'real') => {
    const imagen = await uploadImage(file, repuestoId, tipo);
    
    const repuesto = repuestos.find(r => r.id === repuestoId);
    if (repuesto) {
      const imagenes = tipo === 'manual' ? repuesto.imagenesManual : repuesto.fotosReales;
      const updatedImages = [...imagenes, { ...imagen, orden: imagenes.length }];
      
      await updateRepuesto(repuestoId, {
        [tipo === 'manual' ? 'imagenesManual' : 'fotosReales']: updatedImages
      });
      
      success('Imagen agregada correctamente');
    }
    
    return imagen;
  };

  const handleDeleteImage = async (repuesto: Repuesto, imagen: ImagenRepuesto) => {
    const tipo = imagen.tipo;
    const imagenes = tipo === 'manual' ? repuesto.imagenesManual : repuesto.fotosReales;
    const updatedImages = imagenes.filter(img => img.id !== imagen.id);
    
    await updateRepuesto(repuesto.id, {
      [tipo === 'manual' ? 'imagenesManual' : 'fotosReales']: updatedImages
    });
    
    success('Imagen eliminada');
  };

  const handleSetPrimaryImage = async (repuesto: Repuesto, imagen: ImagenRepuesto) => {
    const tipo = imagen.tipo;
    const imagenes = tipo === 'manual' ? repuesto.imagenesManual : repuesto.fotosReales;
    const updatedImages = imagenes.map(img => ({
      ...img,
      esPrincipal: img.id === imagen.id
    }));
    
    await updateRepuesto(repuesto.id, {
      [tipo === 'manual' ? 'imagenesManual' : 'fotosReales']: updatedImages
    });
  };

  const handleUpdateImageOrder = async (repuesto: Repuesto, imagenes: ImagenRepuesto[]) => {
    const tipo = imagenes[0]?.tipo || 'manual';
    await updateRepuesto(repuesto.id, {
      [tipo === 'manual' ? 'imagenesManual' : 'fotosReales']: imagenes
    });
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
    await updateRepuesto(selectedRepuesto.id, {
      vinculosManual: [...vinculosActuales, {
        id: Date.now().toString(),
        pagina: pageNumber,
        forma: 'rectangulo' as const,
        color: 'rgba(239, 68, 68, 0.4)',
        descripcion: `Página ${pageNumber}`
      }]
    });

    success(`Captura de página ${pageNumber} guardada`);
  }, [selectedRepuesto, updateRepuesto, success]);

  // Exportaciones - usan repuestos filtrados
  const handleExportExcel = () => {
    setShowExcelExportModal(true);
  };
  
  const confirmExportExcel = () => {
    const toExport = filteredRepuestos.length > 0 ? filteredRepuestos : repuestos;
    exportToExcel(toExport, {
      formato: excelFormato,
      incluirResumen: excelIncluirResumen,
      incluirSinStock: excelIncluirSinStock,
      incluirPorTags: excelIncluirPorTags,
      incluirEstilos: excelIncluirEstilos,
      tipoCambio: tipoCambio > 0 ? tipoCambio : undefined
    });
    success(`Excel exportado con ${toExport.length} repuestos (formato ${excelFormato === 'simple' ? 'simple' : 'completo'})`);
    setShowExcelExportModal(false);
  };

  const handleExportPDF = () => {
    setShowPDFExportModal(true);
  };
  
  const confirmExportPDF = () => {
    const toExport = filteredRepuestos.length > 0 ? filteredRepuestos : repuestos;
    exportToPDF(toExport, { includeCharts: pdfIncludeCharts });
    success(`PDF exportado con ${toExport.length} repuestos`);
    setShowPDFExportModal(false);
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

  // Backup: Exportar todos los datos a JSON
  const handleBackupExport = () => {
    setBackupLoading(true);
    try {
      const backupData = {
        version: APP_VERSION,
        fecha: new Date().toISOString(),
        totalRepuestos: repuestos.length,
        repuestos: repuestos.map(r => ({
          ...r,
          // Excluir campos internos de Firebase
          id: r.id
        }))
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `baader200_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success(`Backup exportado: ${repuestos.length} repuestos`);
      setShowBackupModal(false);
    } catch (err) {
      error('Error al crear backup');
    } finally {
      setBackupLoading(false);
    }
  };

  // Restore: Importar datos desde JSON
  const handleBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setBackupLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.repuestos || !Array.isArray(data.repuestos)) {
        throw new Error('Formato de backup inválido');
      }
      
      // Convertir a RepuestoFormData (sin id para crear nuevos)
      const repuestosToImport: RepuestoFormData[] = data.repuestos.map((r: Repuesto) => ({
        codigoSAP: r.codigoSAP || '',
        codigoBaader: r.codigoBaader || '',
        textoBreve: r.textoBreve || '',
        descripcion: r.descripcion || '',
        nombreManual: r.nombreManual || '',
        cantidadSolicitada: r.cantidadSolicitada || 0,
        cantidadStockBodega: r.cantidadStockBodega || 0,
        valorUnitario: r.valorUnitario || 0,
        tags: r.tags || [],
        vinculosManual: r.vinculosManual || [],
        imagenesManual: r.imagenesManual || [],
        fotosReales: r.fotosReales || []
      }));
      
      await importRepuestos(repuestosToImport);
      success(`Backup restaurado: ${repuestosToImport.length} repuestos importados`);
      setShowBackupModal(false);
    } catch (err) {
      error('Error al restaurar backup: archivo inválido');
    } finally {
      setBackupLoading(false);
      // Limpiar input
      e.target.value = '';
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-800 dark:text-gray-100 text-lg flex items-center gap-2">
                Baader 200
                <span className="text-xs font-normal bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                  v{APP_VERSION}
                </span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gestión de Repuestos</p>
            </div>
          </div>

          {/* Acciones desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRightPanelMode(rightPanelMode === 'pdf' ? 'hidden' : 'pdf');
              }}
              icon={<BookOpen className="w-4 h-4" />}
            >
              Manual
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              icon={<FileSpreadsheet className="w-4 h-4" />}
            >
              Excel
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPDF}
              icon={<Download className="w-4 h-4" />}
            >
              PDF
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBackupModal(true)}
              icon={<Database className="w-4 h-4" />}
              title="Backup/Restore datos"
            >
              Backup
            </Button>

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
        {/* Barra de navegación principal */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setMainView('repuestos');
                if (rightPanelMode === 'hidden') setRightPanelMode('hidden');
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                mainView === 'repuestos'
                  ? 'text-primary-600 border-primary-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <Package className="w-4 h-4" />
              Repuestos
            </button>
            <button
              onClick={() => {
                setMainView('stats');
                setRightPanelMode('hidden');
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                mainView === 'stats'
                  ? 'text-primary-600 border-primary-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Estadísticas
            </button>
          </div>
        </div>

        {/* Contenido basado en la vista activa */}
        <div className="flex-1 flex overflow-hidden">
          {mainView === 'stats' ? (
            <div className="flex-1 overflow-hidden">
              <StatsPanel repuestos={repuestos} />
            </div>
          ) : (
            <>
              {/* Panel Izquierdo - Tabla */}
              <div className={`
                flex-1 min-w-0 overflow-hidden
                ${rightPanelMode !== 'hidden' ? 'hidden md:block md:w-1/2 lg:w-3/5' : 'w-full'}
              `}>
                <RepuestosTable
                  repuestos={repuestos}
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
                />
              </div>

        {/* Panel Derecho - Galería o PDF */}
        {rightPanelMode !== 'hidden' && (
          <div className="w-full md:w-1/2 lg:w-2/5 border-l border-gray-200 flex flex-col">
            {/* Tabs para cambiar entre galería y PDF */}
            <div className="flex border-b border-gray-200 bg-white">
              <button
                onClick={() => setRightPanelMode('gallery')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  rightPanelMode === 'gallery'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Image className="w-4 h-4" />
                Imágenes
              </button>
              <button
                onClick={() => setRightPanelMode('pdf')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  rightPanelMode === 'pdf'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Manual
              </button>
              
              {/* Botón cerrar en móvil */}
              <button
                onClick={() => setRightPanelMode('hidden')}
                className="md:hidden px-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs secundarios para tipo de galería */}
            {rightPanelMode === 'gallery' && selectedRepuesto && (
              <div className="flex border-b border-gray-100 bg-gray-50">
                <button
                  onClick={() => setGalleryType('manual')}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                    galleryType === 'manual'
                      ? 'text-primary-600 bg-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Del Manual ({selectedRepuesto.imagenesManual.length})
                </button>
                <button
                  onClick={() => setGalleryType('real')}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                    galleryType === 'real'
                      ? 'text-primary-600 bg-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Fotos Reales ({selectedRepuesto.fotosReales.length})
                </button>
              </div>
            )}

            {/* Contenido del panel derecho */}
            <div className="flex-1 overflow-hidden">
              {rightPanelMode === 'gallery' ? (
                <ImageGallery
                  repuesto={selectedRepuesto}
                  tipo={galleryType}
                  onUpload={handleUploadImage}
                  onDelete={handleDeleteImage}
                  onSetPrimary={handleSetPrimaryImage}
                  onUpdateOrder={handleUpdateImageOrder}
                />
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
              ) : (
                <Suspense fallback={<PDFLoadingFallback />}>
                  <PDFViewer
                    pdfUrl={pdfUrl}
                    targetPage={targetPage}
                    marker={currentMarker}
                    onCapture={selectedRepuesto ? handlePDFCapture : undefined}
                    onEditMarker={selectedRepuesto ? (marker) => handleMarkInManual(selectedRepuesto, marker) : undefined}
                    onDeleteMarker={selectedRepuesto ? (marker) => handleDeleteMarker(selectedRepuesto, marker.id) : undefined}
                    onAddMarker={selectedRepuesto ? () => handleMarkInManual(selectedRepuesto) : undefined}
                  />
                </Suspense>
              )}
            </div>
          </div>
        )}
            </>
          )}
        </div>
      </div>

      {/* Modales */}
      <RepuestoForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        repuesto={editRepuesto}
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
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Exportar Excel
              </h3>
              <button 
                onClick={() => setShowExcelExportModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Se exportarán {filteredRepuestos.length > 0 ? filteredRepuestos.length : repuestos.length} repuestos
              </p>
              
              {/* Selector de formato */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Formato de exportación</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExcelFormato('simple')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      excelFormato === 'simple' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-800">Simple</div>
                    <div className="text-xs text-gray-500 mt-1">Solo datos, 1 hoja</div>
                  </button>
                  <button
                    onClick={() => setExcelFormato('completo')}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      excelFormato === 'completo' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-800">Completo</div>
                    <div className="text-xs text-gray-500 mt-1">Estilos, múltiples hojas</div>
                  </button>
                </div>
              </div>
              
              {/* Opciones solo para formato completo */}
              {excelFormato === 'completo' && (
                <div className="space-y-2 pt-2 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opciones avanzadas</label>
                  
                  <label className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={excelIncluirEstilos}
                      onChange={(e) => setExcelIncluirEstilos(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">Incluir estilos</span>
                      <p className="text-xs text-gray-500">Colores, bordes y formato condicional</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={excelIncluirResumen}
                      onChange={(e) => setExcelIncluirResumen(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">Hoja de resumen</span>
                      <p className="text-xs text-gray-500">Estadísticas y totales generales</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={excelIncluirSinStock}
                      onChange={(e) => setExcelIncluirSinStock(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">Hoja "Sin Stock"</span>
                      <p className="text-xs text-gray-500">Lista de repuestos con stock en 0</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={excelIncluirPorTags}
                      onChange={(e) => setExcelIncluirPorTags(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">Hoja "Por Tags"</span>
                      <p className="text-xs text-gray-500">Resumen agrupado por etiquetas</p>
                    </div>
                  </label>
                </div>
              )}
            </div>
            
            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowExcelExportModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
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
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowBackupModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-600" />
                Backup / Restore
              </h3>
              <button onClick={() => setShowBackupModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Exportar Backup */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                  <HardDriveDownload className="w-8 h-8 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-800">Exportar Backup</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      Descarga todos los datos en formato JSON ({repuestos.length} repuestos)
                    </p>
                    <button
                      onClick={handleBackupExport}
                      disabled={backupLoading}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {backupLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Descargar Backup
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Importar Backup */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-start gap-3">
                  <HardDriveUpload className="w-8 h-8 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-800">Restaurar Backup</h4>
                    <p className="text-sm text-amber-600 mt-1">
                      Importar datos desde un archivo JSON de backup
                    </p>
                    <p className="text-xs text-amber-500 mt-1">
                      ⚠️ Se agregarán nuevos repuestos (no reemplaza existentes)
                    </p>
                    <label className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleBackupImport}
                        disabled={backupLoading}
                        className="hidden"
                      />
                      {backupLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Seleccionar archivo
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Versión actual: {APP_VERSION} • {repuestos.length} repuestos en la base de datos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
