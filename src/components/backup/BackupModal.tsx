import { useState } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  Trash2,
  Clock,
  HardDrive,
  HardDriveDownload,
  HardDriveUpload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Settings,
  ChevronDown,
  ChevronRight,
  Loader2,
  Archive,
  Calendar,
  Zap
} from 'lucide-react';
import { BackupSystem, BackupEntry } from '../../hooks/useBackupSystem';
import { Repuesto } from '../../types';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  backupSystem: BackupSystem;
  repuestos: Repuesto[];
  onRestore: (repuestos: Repuesto[]) => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function BackupModal({
  isOpen,
  onClose,
  backupSystem,
  repuestos,
  onRestore,
  onSuccess,
  onError
}: BackupModalProps) {
  const [activeTab, setActiveTab] = useState<'historial' | 'exportar' | 'importar' | 'config'>('historial');
  const [expandedBackup, setExpandedBackup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const {
    backups,
    autoBackupEnabled,
    stats,
    createFullBackup,
    deleteBackup,
    clearAllBackups,
    getBackupSnapshot,
    exportBackupToFile,
    toggleAutoBackup,
    formatDate
  } = backupSystem;

  // Agrupar backups por fecha
  const backupsByDate = backups.reduce((acc, backup) => {
    const date = backup.timestamp.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(backup);
    return acc;
  }, {} as Record<string, BackupEntry[]>);

  // Ordenar fechas descendente
  const sortedDates = Object.keys(backupsByDate).sort((a, b) => b.localeCompare(a));

  const handleCreateBackup = () => {
    createFullBackup('Backup manual');
    onSuccess('Backup creado exitosamente');
  };

  const handleExportBackup = (backupId?: string) => {
    const success = exportBackupToFile(backupId);
    if (success) {
      onSuccess('Backup exportado');
    } else {
      onError('Error al exportar backup');
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    const snapshot = getBackupSnapshot(backupId);
    if (!snapshot) {
      onError('No se pudo leer el backup');
      return;
    }

    if (!confirm(`¿Restaurar ${snapshot.length} repuestos desde este backup?\n\nEsto reemplazará los datos actuales.`)) {
      return;
    }

    setIsLoading(true);
    try {
      await onRestore(snapshot);
      onSuccess(`Restaurados ${snapshot.length} repuestos`);
      onClose();
    } catch (err) {
      onError('Error al restaurar backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validar formato
      if (!data.repuestos || !Array.isArray(data.repuestos)) {
        throw new Error('Formato de backup inválido');
      }

      if (!confirm(`¿Importar ${data.repuestos.length} repuestos?\n\nFecha del backup: ${data.fecha || 'No especificada'}`)) {
        return;
      }

      await onRestore(data.repuestos);
      onSuccess(`Importados ${data.repuestos.length} repuestos`);
      onClose();
    } catch (err) {
      onError('Error al importar: formato inválido');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleClearAll = () => {
    if (confirmClear) {
      clearAllBackups();
      setConfirmClear(false);
      onSuccess('Historial de backups eliminado');
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const getBackupIcon = (tipo: BackupEntry['tipo']) => {
    switch (tipo) {
      case 'completo': return <Archive className="w-4 h-4 text-blue-500" />;
      case 'incremental': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'restauracion': return <RotateCcw className="w-4 h-4 text-green-500" />;
    }
  };

  const tabs = [
    { id: 'historial', label: 'Historial', icon: <Clock className="w-4 h-4" /> },
    { id: 'exportar', label: 'Exportar', icon: <HardDriveDownload className="w-4 h-4" /> },
    { id: 'importar', label: 'Importar', icon: <HardDriveUpload className="w-4 h-4" /> },
    { id: 'config', label: 'Config', icon: <Settings className="w-4 h-4" /> }
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-primary-600" />
              Sistema de Backup
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stats.totalBackups} backups • {stats.espacioUsado} usado
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Historial */}
          {activeTab === 'historial' && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center">
                  <Archive className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{stats.backupsCompletos}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Completos</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3 text-center">
                  <Zap className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{stats.backupsIncrementales}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Incrementales</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <Clock className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{stats.ultimoBackup}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Último</p>
                </div>
              </div>

              {/* Botón crear backup */}
              <button
                onClick={handleCreateBackup}
                className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <HardDrive className="w-5 h-5" />
                Crear Backup Completo Ahora
              </button>

              {/* Lista de backups por fecha */}
              {sortedDates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No hay backups guardados</p>
                  <p className="text-sm">Los cambios se guardarán automáticamente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedDates.map(date => (
                    <div key={date} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {new Date(date).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {backupsByDate[date].length} backup{backupsByDate[date].length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {backupsByDate[date].reverse().map(backup => (
                          <div key={backup.id} className="px-4 py-2">
                            <div 
                              className="flex items-center gap-3 cursor-pointer"
                              onClick={() => setExpandedBackup(expandedBackup === backup.id ? null : backup.id)}
                            >
                              {getBackupIcon(backup.tipo)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                  {backup.descripcion}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(backup.timestamp)} • v{backup.version}
                                  {backup.totalRepuestos && ` • ${backup.totalRepuestos} items`}
                                </p>
                              </div>
                              {backup.tipo === 'completo' ? (
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedBackup === backup.id ? 'rotate-180' : ''}`} />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            
                            {/* Acciones expandidas para backups completos */}
                            {expandedBackup === backup.id && backup.tipo === 'completo' && (
                              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                                <button
                                  onClick={() => handleRestoreBackup(backup.id)}
                                  disabled={isLoading}
                                  className="flex-1 px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center justify-center gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Restaurar
                                </button>
                                <button
                                  onClick={() => handleExportBackup(backup.id)}
                                  className="flex-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center justify-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Exportar
                                </button>
                                <button
                                  onClick={() => deleteBackup(backup.id)}
                                  className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            
                            {/* Mostrar cambios para incrementales */}
                            {expandedBackup === backup.id && backup.tipo === 'incremental' && backup.cambios && (
                              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <ul className="text-xs text-gray-500 space-y-1">
                                  {backup.cambios.slice(0, 5).map((c, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                      <span className="font-mono">{c.codigoSAP}</span>
                                      <span className="text-gray-400">→</span>
                                      <span>{c.campo}: {String(c.valorAnterior)} → {String(c.valorNuevo)}</span>
                                    </li>
                                  ))}
                                  {backup.cambios.length > 5 && (
                                    <li className="text-gray-400">...y {backup.cambios.length - 5} más</li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Limpiar historial */}
              {backups.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className={`w-full py-2 text-sm rounded-lg transition-colors ${
                    confirmClear
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {confirmClear ? '¿Confirmar eliminación?' : 'Limpiar historial de backups'}
                </button>
              )}
            </div>
          )}

          {/* Tab: Exportar */}
          {activeTab === 'exportar' && (
            <div className="space-y-4">
              <div className="p-6 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-4">
                  <HardDriveDownload className="w-10 h-10 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-lg">
                      Exportar Backup Completo
                    </h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Descarga todos los datos actuales en formato JSON
                    </p>
                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total repuestos:</span>
                        <span className="font-semibold">{repuestos.length}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-500">Tamaño estimado:</span>
                        <span className="font-semibold">~{(repuestos.length * 0.5).toFixed(0)} KB</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExportBackup()}
                      disabled={isLoading}
                      className="mt-4 w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                      Descargar Backup JSON
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-500" />
                El archivo se puede usar para restaurar datos en cualquier momento
              </div>
            </div>
          )}

          {/* Tab: Importar */}
          {activeTab === 'importar' && (
            <div className="space-y-4">
              <div className="p-6 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-4">
                  <HardDriveUpload className="w-10 h-10 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-lg">
                      Restaurar desde Archivo
                    </h3>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      Importar datos desde un archivo JSON de backup
                    </p>
                    
                    <div className="mt-3 p-3 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700 dark:text-amber-300">
                        <p className="font-semibold">Precaución</p>
                        <p>Esta acción reemplazará todos los datos actuales. Asegúrate de tener un backup antes de continuar.</p>
                      </div>
                    </div>

                    <label className="mt-4 w-full py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        disabled={isLoading}
                        className="hidden"
                      />
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                      Seleccionar Archivo JSON
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FileJson className="w-4 h-4" />
                  Formato esperado
                </h4>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
{`{
  "version": "3.x.x",
  "fecha": "2025-01-21T...",
  "repuestos": [...]
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Tab: Configuración */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Backup Automático</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Guardar cambios automáticamente al editar repuestos
                    </p>
                  </div>
                  <button
                    onClick={toggleAutoBackup}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      autoBackupEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      autoBackupEnabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Información del Sistema</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Backups almacenados:</span>
                    <span className="font-medium">{stats.totalBackups} / 50 máx.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Espacio usado:</span>
                    <span className="font-medium">{stats.espacioUsado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Último backup:</span>
                    <span className="font-medium">{stats.ultimoBackup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Backup completo cada:</span>
                    <span className="font-medium">10 cambios</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">💡 Cómo funciona</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                  <li>Cada cambio se guarda como backup incremental (solo la diferencia)</li>
                  <li>Cada 10 cambios se crea un backup completo automáticamente</li>
                  <li>Los datos se guardan en el navegador (localStorage)</li>
                  <li>Exporta regularmente a archivo para respaldo externo</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
