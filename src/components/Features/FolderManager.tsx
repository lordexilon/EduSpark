// components/FolderManager.tsx
// Componente para administrar y navegar por carpetas de Google Drive

import React, { useState, useEffect } from 'react';
import Card from "@/components/Common/Card";
import Button from "@/components/Common/Button";
import { googleDriveService } from '@/services/googleDriveService';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronLeft,
  Home,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Unlink,
  AlertTriangle
} from 'lucide-react';

interface FolderInfo {
  id: string;
  name: string;
  modifiedTime: string;
}

interface FileInfo {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  modifiedTime: string;
}

interface FolderManagerProps {
  userId: string;
  rootFolderId: string;
  rootFolderName: string;
  onFolderSelect?: (folderId: string, folderName: string) => void;
  onFileSelect?: (fileId: string, fileName: string) => void;
  onUnlinkFolder?: () => void; // Callback para desconectar carpeta principal
  selectedFiles?: string[];
  processedFiles?: string[]; // IDs de archivos ya procesados
}

export const FolderManager: React.FC<FolderManagerProps> = ({
  userId,
  rootFolderId,
  rootFolderName,
  onFolderSelect,
  onFileSelect,
  onUnlinkFolder,
  selectedFiles = [],
  processedFiles = [],
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string>(rootFolderId);
  const [currentFolderName, setCurrentFolderName] = useState<string>(rootFolderName);
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([
    { id: rootFolderId, name: rootFolderName }
  ]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'files' | 'both'>('both');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  // Cargar contenido de la carpeta actual
  useEffect(() => {
    loadFolderContent();
  }, [currentFolderId, userId]);

  const loadFolderContent = async () => {
    if (!userId || !currentFolderId) return;

    try {
      setLoading(true);
      setError(null);

      // Cargar carpetas y archivos en paralelo
      const [foldersData, filesData] = await Promise.all([
        googleDriveService.listFoldersInFolder(userId, currentFolderId),
        googleDriveService.listFilesInFolder(userId, currentFolderId, [
          'application/pdf',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ]),
      ]);

      setFolders(foldersData);
      setFiles(filesData);
    } catch (err: any) {
      console.error('Error cargando contenido de carpeta:', err);
      setError(err.message || 'Error cargando contenido de la carpeta');
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setCurrentFolderName(folderName);
    setFolderPath(prev => [...prev, { id: folderId, name: folderName }]);
    if (onFolderSelect) {
      onFolderSelect(folderId, folderName);
    }
  };

  const navigateToPath = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    const targetFolder = newPath[newPath.length - 1];
    setFolderPath(newPath);
    setCurrentFolderId(targetFolder.id);
    setCurrentFolderName(targetFolder.name);
  };

  const goToRoot = () => {
    setCurrentFolderId(rootFolderId);
    setCurrentFolderName(rootFolderName);
    setFolderPath([{ id: rootFolderId, name: rootFolderName }]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFileStatus = (fileId: string) => {
    if (processedFiles.includes(fileId)) {
      return { icon: <CheckCircle size={16} className="text-green-600" />, text: 'Procesado', color: 'text-green-600' };
    }
    if (selectedFiles.includes(fileId)) {
      return { icon: <Clock size={16} className="text-blue-600" />, text: 'Seleccionado', color: 'text-blue-600' };
    }
    return null;
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Por favor, ingresa un nombre para la carpeta');
      return;
    }

    try {
      setCreatingFolder(true);
      setError(null);

      const newFolder = await googleDriveService.createFolder(userId, newFolderName.trim(), currentFolderId);

      // Recargar contenido
      await loadFolderContent();

      // Limpiar formulario
      setNewFolderName('');
      setShowCreateFolder(false);
    } catch (err: any) {
      console.error('Error creando carpeta:', err);
      setError(err.message || 'Error al crear la carpeta');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string, isFolder: boolean) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar ${isFolder ? 'la carpeta' : 'el archivo'} "${itemName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setDeletingItems(prev => new Set(prev).add(itemId));
      setError(null);

      await googleDriveService.deleteFileOrFolder(userId, itemId);

      // Recargar contenido
      await loadFolderContent();

      // Si se eliminó la carpeta actual, volver a la anterior
      if (isFolder && itemId === currentFolderId && folderPath.length > 1) {
        navigateToPath(folderPath.length - 2);
      }
    } catch (err: any) {
      console.error('Error eliminando item:', err);
      setError(err.message || 'Error al eliminar el item');
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleUnlinkFolder = async () => {
    if (!onUnlinkFolder) return;

    try {
      await googleDriveService.unlinkDrive(userId);
      onUnlinkFolder();
      setShowUnlinkConfirm(false);
    } catch (err: any) {
      console.error('Error desconectando carpeta:', err);
      setError(err.message || 'Error al desconectar la carpeta');
    }
  };

  return (
    <Card>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Administrador de Carpetas</h3>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowCreateFolder(!showCreateFolder)}
              variant="primary"
              className="flex items-center space-x-2"
              disabled={loading}
            >
              <Plus size={16} />
              <span>Nueva Carpeta</span>
            </Button>
            {onUnlinkFolder && folderPath.length === 1 && (
              <Button
                onClick={() => setShowUnlinkConfirm(true)}
                variant="secondary"
                className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                disabled={loading}
              >
                <Unlink size={16} />
                <span>Desconectar</span>
              </Button>
            )}
            <Button
              onClick={loadFolderContent}
              variant="secondary"
              className="flex items-center space-x-2"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Actualizar</span>
            </Button>
          </div>
        </div>

        {/* Formulario para crear carpeta */}
        {showCreateFolder && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Folder size={20} className="text-blue-600 dark:text-blue-400" />
              <h4 className="font-semibold text-gray-800 dark:text-gray-100">Crear Nueva Carpeta</h4>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nombre de la carpeta"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !creatingFolder) {
                    handleCreateFolder();
                  }
                }}
              />
              <Button
                onClick={handleCreateFolder}
                variant="primary"
                disabled={creatingFolder || !newFolderName.trim()}
                className="flex items-center space-x-2"
              >
                {creatingFolder ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Creando...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Crear</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }}
                variant="secondary"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Confirmación para desconectar carpeta */}
        {showUnlinkConfirm && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Desconectar Carpeta</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                  ¿Estás seguro de que deseas desconectar esta carpeta? No se eliminará de Google Drive,
                  pero dejarás de tener acceso desde esta aplicación. Puedes volver a conectarla más tarde.
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleUnlinkFolder}
                    variant="primary"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sí, Desconectar
                  </Button>
                  <Button
                    onClick={() => setShowUnlinkConfirm(false)}
                    variant="secondary"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navegación de ruta */}
        <div className="flex items-center space-x-2 mb-4 flex-wrap">
          <button
            onClick={goToRoot}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
          >
            <Home size={16} />
            <span>Inicio</span>
          </button>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight size={16} className="text-gray-400" />
              <button
                onClick={() => navigateToPath(index)}
                className={`text-sm ${index === folderPath.length - 1
                  ? 'text-gray-800 font-semibold'
                  : 'text-blue-600 hover:text-blue-700'
                  }`}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Filtros de vista */}
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={() => setViewMode('folders')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'folders'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
              }`}
          >
            Solo Carpetas
          </button>
          <button
            onClick={() => setViewMode('files')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'files'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
              }`}
          >
            Solo Archivos
          </button>
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'both'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
              }`}
          >
            Ambos
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="animate-spin text-blue-500" size={24} />
          <span className="ml-2 text-gray-600">Cargando...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Carpetas */}
          {(viewMode === 'folders' || viewMode === 'both') && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                <FolderOpen size={16} />
                <span>Carpetas ({folders.length})</span>
              </h4>
              {folders.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No hay subcarpetas en esta carpeta</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center space-x-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <button
                        onClick={() => navigateToFolder(folder.id, folder.name)}
                        className="flex items-center space-x-2 flex-1 min-w-0 text-left"
                      >
                        <Folder className="text-blue-500 flex-shrink-0" size={20} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{folder.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(folder.modifiedTime)}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(folder.id, folder.name, true)}
                        disabled={deletingItems.has(folder.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Eliminar carpeta"
                      >
                        {deletingItems.has(folder.id) ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Archivos */}
          {(viewMode === 'files' || viewMode === 'both') && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                <FileText size={16} />
                <span>Archivos PDF/PPT ({files.length})</span>
              </h4>
              {files.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No hay archivos PDF o PPT en esta carpeta</p>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    // Filtrar archivos duplicados (mismo ID)
                    const uniqueFiles = files.filter((file, index, self) =>
                      index === self.findIndex(f => f.id === file.id)
                    );
                    return uniqueFiles.map((file, index) => {
                      const status = getFileStatus(file.id);
                      return (
                        <div
                          key={`${file.id}-${index}`}
                          className={`flex items-center justify-between p-3 border rounded-lg ${selectedFiles.includes(file.id)
                            ? 'border-blue-500 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-900/10'
                            : processedFiles.includes(file.id)
                              ? 'border-green-300 bg-green-50 dark:border-green-800/50 dark:bg-green-900/10'
                              : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-800/30'
                            }`}
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <FileText className="text-gray-500 dark:text-gray-400 flex-shrink-0" size={20} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                              <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                                <span>{formatFileSize(file.size)}</span>
                                <span>•</span>
                                <span>{formatDate(file.modifiedTime)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {status && (
                              <div className={`flex items-center space-x-1 ${status.color}`}>
                                {status.icon}
                                <span className="text-xs">{status.text}</span>
                              </div>
                            )}
                            {onFileSelect && (
                              <Button
                                onClick={() => onFileSelect(file.id, file.name)}
                                variant={selectedFiles.includes(file.id) ? 'primary' : 'secondary'}
                                className="text-xs"
                              >
                                {selectedFiles.includes(file.id) ? 'Seleccionado' : 'Seleccionar'}
                              </Button>
                            )}
                            <button
                              onClick={() => handleDeleteItem(file.id, file.name, false)}
                              disabled={deletingItems.has(file.id) || processedFiles.includes(file.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={processedFiles.includes(file.id) ? 'No se puede eliminar un archivo procesado' : 'Eliminar archivo'}
                            >
                              {deletingItems.has(file.id) ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

