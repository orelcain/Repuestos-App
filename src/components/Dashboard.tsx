import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRepuestos } from '../hooks/useRepuestos';
import { useStorage } from '../hooks/useStorage';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { Repuesto, RepuestoFormData, ImagenRepuesto, VinculoManual } from '../types';
import { APP_VERSION } from '../version';

import { RepuestosTable } from './repuestos/RepuestosTable';
import { RepuestoForm } from './repuestos/RepuestoForm';
import { HistorialModal } from './repuestos/HistorialModal';
import { DeleteConfirmModal } from './repuestos/DeleteConfirmModal';
import { TagManagerModal } from './repuestos/TagManagerModal';
import { ImageGallery } from './gallery/ImageGallery';
import { PDFViewer } from './pdf/PDFViewer';
import { PDFMarkerEditor } from './pdf/PDFMarkerEditor';
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
  Package
} from 'lucide-react';

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
    const toExport = filteredRepuestos.length > 0 ? filteredRepuestos : repuestos;
    exportToExcel(toExport);
    success(`Excel exportado con ${toExport.length} repuestos`);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                Baader 200
                <span className="text-xs font-normal bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                  v{APP_VERSION}
                </span>
              </h1>
              <p className="text-sm text-gray-500">Gestión de Repuestos</p>
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

            <div className="w-px h-8 bg-gray-200" />

            <div className="flex items-center gap-2 text-sm text-gray-600">
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
              <hr className="my-4" />
              <div className="px-4 py-2 text-sm text-gray-500">{user?.email}</div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-red-600"
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
        <div className="bg-white border-b border-gray-200 px-4">
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
              ) : (
                <PDFViewer
                  pdfUrl={pdfUrl}
                  targetPage={targetPage}
                  marker={currentMarker}
                  onCapture={selectedRepuesto ? handlePDFCapture : undefined}
                  onEditMarker={selectedRepuesto ? (marker) => handleMarkInManual(selectedRepuesto, marker) : undefined}
                  onDeleteMarker={selectedRepuesto ? (marker) => handleDeleteMarker(selectedRepuesto, marker.id) : undefined}
                  onAddMarker={selectedRepuesto ? () => handleMarkInManual(selectedRepuesto) : undefined}
                />
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

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
