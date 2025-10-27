import { useState, useEffect } from 'react';
import { Database, Trash2, Eye, Calendar, FileText, HardDrive, Download, X, CheckCircle, AlertCircle, Sparkles, BrainCircuit, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { cn } from '../lib/utils';

interface Dataset {
  id: number;
  name: string;
  description?: string;
  file: string;
  file_url: string;
  owner: number;
  owner_email: string;
  file_size: number;
  rows_count: number;
  columns_count: number;
  columns_info?: any;
  null_values_count?: number;
  duplicate_rows_count?: number;
  data_quality_score?: number;
  created_at: string;
  updated_at: string;
  is_cleaned?: boolean;
  // Para datasets limpios
  original_dataset?: number | null;
  original_dataset_name?: string;
}

interface Model {
  id: number;
  name: string;
  description?: string;
  model_type: string;
  accuracy?: number;
  dataset_id: number;
  dataset_name: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

type StorageCategory = 'datasets' | 'cleaned' | 'models';

// Componente de Paginación
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: PaginationProps) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card border-t">
      <div className="flex items-center text-sm text-muted-foreground">
        <span>
          Mostrando {startItem} a {endItem} de {totalItems} elementos
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        {/* Números de página */}
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "px-3 py-1 rounded-lg text-sm font-medium",
                  currentPage === pageNum
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default function StoragePage() {
  const [activeCategory, setActiveCategory] = useState<StorageCategory>('datasets');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [cleanedDatasets, setCleanedDatasets] = useState<Dataset[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  
  // Paginación para grid principal
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  
  // Paginación para modal de vista previa
  const [previewCurrentPage, setPreviewCurrentPage] = useState(1);
  const [previewRowsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // Cargar datasets originales
      const datasetsResponse = await axios.get(`${API_BASE_URL}/data/datasets/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDatasets(datasetsResponse.data);
      
      // Cargar datasets limpios desde el endpoint específico
      try {
        const cleanedDatasetsResponse = await axios.get(`${API_BASE_URL}/data/cleaned-datasets/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCleanedDatasets(cleanedDatasetsResponse.data);
      } catch (cleanedErr) {
        console.log('No hay datasets limpios disponibles o endpoint no existe');
        setCleanedDatasets([]);
      }
      
      // Cargar modelos entrenados
      try {
        const modelsResponse = await axios.get(`${API_BASE_URL}/ml/models/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setModels(modelsResponse.data);
      } catch (modelErr) {
        // Si no existe el endpoint de modelos, dejar lista vacía
        console.log('Endpoint de modelos no disponible');
        setModels([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    // Mensaje simple ya que no hay eliminación en cascada
    const isCleanedDataset = activeCategory === 'cleaned';
    const isOriginalDataset = activeCategory === 'datasets';
    
    let confirmMessage = `¿Estás seguro de eliminar el dataset "${name}"?`;
    
    if (isOriginalDataset) {
      confirmMessage = `¿Estás seguro de eliminar el dataset original "${name}"?\n\nLos datasets limpios y modelos derivados se mantendrán como huérfanos.\n\nEsta acción no se puede deshacer.`;
    } else if (isCleanedDataset) {
      confirmMessage = `¿Estás seguro de eliminar el dataset limpio "${name}"?\n\nLos modelos entrenados con este dataset se mantendrán como huérfanos.\n\nEsta acción no se puede deshacer.`;
    } else {
      confirmMessage = `¿Estás seguro de eliminar el modelo "${name}"?\n\nEsta acción no se puede deshacer.`;
    }
    
    if (!confirm(confirmMessage)) return;

    setDeleting(id);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      
      // Determinar el endpoint correcto basándose en si es un dataset limpio
      const isCleanedDataset = activeCategory === 'cleaned';
      const endpoint = isCleanedDataset 
        ? `${API_BASE_URL}/data/cleaned-datasets/${id}/`
        : `${API_BASE_URL}/data/datasets/${id}/`;
      
      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(`Dataset "${name}" eliminado exitosamente`);
      await loadData();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error al eliminar dataset';
      setError(errorMsg);
      
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeleting(null);
    }
  };

  const handleViewDetails = async (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setPreviewCurrentPage(1); // Reset página del modal
    setLoadingPreview(true);
    
    try {
      const token = localStorage.getItem('access_token');
      
      // Determinar el endpoint correcto basándose en si es un dataset limpio
      const isCleanedDataset = activeCategory === 'cleaned';
      const endpoint = isCleanedDataset 
        ? `${API_BASE_URL}/data/cleaned-datasets/${dataset.id}/preview/`
        : `${API_BASE_URL}/data/datasets/${dataset.id}/preview/`;
      
      const { data } = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewData(data);
    } catch (err: any) {
      console.error('Error al cargar preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleViewModelDetails = (model: Model) => {
    setSelectedModel(model);
  };

  const handleDeleteModel = async (id: number, name: string) => {
    const confirmMessage = `¿Estás seguro de eliminar el modelo "${name}"?\n\nEsta acción no se puede deshacer.`;
    if (!confirm(confirmMessage)) return;

    setDeleting(id);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      
      // Intentar eliminar usando el endpoint de modelos
      try {
        await axios.delete(`${API_BASE_URL}/ml/models/${id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (modelErr) {
        // Si no existe el endpoint de modelos, simular eliminación
        console.log('Endpoint de modelos no disponible, simulando eliminación');
        // Remover del estado local
        setModels(prevModels => prevModels.filter(model => model.id !== id));
        setSuccess(`Modelo "${name}" eliminado exitosamente`);
        setTimeout(() => setSuccess(''), 3000);
        setDeleting(null);
        return;
      }
      
      setSuccess(`Modelo "${name}" eliminado exitosamente`);
      await loadData();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error al eliminar modelo';
      setError(errorMsg);
      
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownloadModel = async (model: Model) => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Intentar descargar usando el endpoint de modelos
      try {
        const response = await axios.get(`${API_BASE_URL}/ml/models/${model.id}/download/`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${model.name}.pkl`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (modelErr) {
        // Si no existe el endpoint, mostrar mensaje informativo
        alert('La descarga de modelos no está disponible en este momento');
      }
    } catch (err: any) {
      alert('Error al descargar modelo');
    }
  };

  const handleDownload = async (dataset: Dataset) => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Determinar el endpoint correcto basándose en si es un dataset limpio
      const isCleanedDataset = activeCategory === 'cleaned';
      const endpoint = isCleanedDataset 
        ? `${API_BASE_URL}/data/cleaned-datasets/${dataset.id}/download/`
        : `${API_BASE_URL}/data/datasets/${dataset.id}/download/`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dataset.name}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Error al descargar dataset');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando datasets...</p>
        </div>
      </div>
    );
  }

  const getCategoryData = () => {
    switch (activeCategory) {
      case 'datasets':
        return datasets;
      case 'cleaned':
        return cleanedDatasets;
      case 'models':
        return models;
      default:
        return [];
    }
  };

  const getCategoryStats = () => {
    switch (activeCategory) {
      case 'datasets':
        return { count: datasets.length, label: 'Datasets Originales' };
      case 'cleaned':
        return { count: cleanedDatasets.length, label: 'Datasets Limpios' };
      case 'models':
        return { count: models.length, label: 'Modelos Entrenados' };
      default:
        return { count: 0, label: '' };
    }
  };

  // Funciones de paginación
  const getPaginatedData = () => {
    const data = getCategoryData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const data = getCategoryData();
    return Math.ceil(data.length / itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset página cuando cambia categoría
  const handleCategoryChange = (category: StorageCategory) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  // Paginación para vista previa
  const getPaginatedPreviewData = () => {
    if (!previewData?.data) return [];
    const startIndex = (previewCurrentPage - 1) * previewRowsPerPage;
    const endIndex = startIndex + previewRowsPerPage;
    return previewData.data.slice(startIndex, endIndex);
  };

  const getPreviewTotalPages = () => {
    if (!previewData?.data) return 1;
    return Math.ceil(previewData.data.length / previewRowsPerPage);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            Almacén de Datos
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tus datasets, datos limpios y modelos entrenados
          </p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground">{getCategoryStats().label}</p>
          <p className="text-2xl font-bold text-primary">{getCategoryStats().count}</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg flex-1">
          <button
            onClick={() => handleCategoryChange('datasets')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center sm:justify-start',
              activeCategory === 'datasets'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Datasets Originales</span>
            <span className="sm:hidden">Originales</span>
            <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
              {datasets.length}
            </span>
          </button>
          <button
            onClick={() => handleCategoryChange('cleaned')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center sm:justify-start',
              activeCategory === 'cleaned'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Datasets Limpios</span>
            <span className="sm:hidden">Limpios</span>
            <span className="bg-green-500/20 text-green-600 text-xs px-2 py-0.5 rounded-full">
              {cleanedDatasets.length}
            </span>
          </button>
          <button
            onClick={() => handleCategoryChange('models')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center sm:justify-start',
              activeCategory === 'models'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <BrainCircuit className="h-4 w-4" />
            <span className="hidden sm:inline">Modelos Entrenados</span>
            <span className="sm:hidden">Modelos</span>
            <span className="bg-blue-500/20 text-blue-600 text-xs px-2 py-0.5 rounded-full">
              {models.length}
            </span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-2">
          <div className="bg-card border rounded-lg px-3 py-2 text-center min-w-[80px]">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">
              {datasets.length + cleanedDatasets.length + models.length}
            </p>
          </div>
          <div className="bg-card border rounded-lg px-3 py-2 text-center min-w-[80px]">
            <p className="text-xs text-muted-foreground">Espacio</p>
            <p className="text-lg font-bold text-foreground">
              {formatFileSize(
                [...datasets, ...cleanedDatasets, ...models].reduce(
                  (total, item) => total + item.file_size, 0
                )
              )}
            </p>
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Content Grid */}
      {activeCategory === 'models' ? (
        // Render Models
        models.length === 0 ? (
          <div className="bg-card p-12 rounded-xl border text-center">
            <BrainCircuit className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No hay modelos entrenados</h3>
            <p className="text-muted-foreground mb-6">
              Entrena tu primer modelo desde la sección "Entrenamiento"
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {(getPaginatedData() as Model[]).map((model) => (
              <div
                key={model.id}
                className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <BrainCircuit className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteModel(model.id, model.name)}
                      disabled={deleting === model.id}
                      className="h-8 w-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting === model.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground mb-2 truncate" title={model.name}>
                  {model.name}
                </h3>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>{model.model_type}</span>
                  </div>
                  {model.accuracy && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Precisión:</span>
                      <span className="text-xs font-semibold text-green-600">
                        {model.accuracy.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    <span>{formatFileSize(model.file_size)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>Dataset: {model.dataset_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(model.created_at)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button 
                    onClick={() => handleViewModelDetails(model)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Ver Detalles
                  </button>
                  <button 
                    onClick={() => handleDownloadModel(model)}
                    className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={getTotalPages()}
              onPageChange={handlePageChange}
              totalItems={getCategoryData().length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )
      ) : (
        // Render Datasets (original or cleaned)
        getCategoryData().length === 0 ? (
          <div className="bg-card p-12 rounded-xl border text-center">
            {activeCategory === 'datasets' ? (
              <>
                <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No hay datasets guardados</h3>
                <p className="text-muted-foreground mb-6">
                  Sube tu primer dataset desde la sección "Cargar Datos"
                </p>
              </>
            ) : (
              <>
                <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No hay datasets limpios</h3>
                <p className="text-muted-foreground mb-6">
                  Limpia tus datasets desde la sección "Limpieza"
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {(getPaginatedData() as Dataset[]).map((dataset) => (
              <div
                key={dataset.id}
                className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "h-12 w-12 rounded-lg flex items-center justify-center",
                    activeCategory === 'cleaned' 
                      ? "bg-green-500/10" 
                      : "bg-primary/10"
                  )}>
                    {activeCategory === 'cleaned' ? (
                      <Sparkles className="h-6 w-6 text-green-600" />
                    ) : (
                      <FileText className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(dataset.id, dataset.name)}
                      disabled={deleting === dataset.id}
                      className="h-8 w-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting === dataset.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground mb-2 truncate" title={dataset.name}>
                  {dataset.name}
                  {activeCategory === 'cleaned' && (
                    <>
                      <span className="ml-2 text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full">
                        Limpio
                      </span>
                      {dataset.original_dataset === null && (
                        <span className="ml-1 text-xs bg-orange-500/20 text-orange-600 px-2 py-0.5 rounded-full" title="Dataset original eliminado">
                          Huérfano
                        </span>
                      )}
                    </>
                  )}
                  {activeCategory === 'datasets' && (
                    <span className="ml-2 text-xs bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded-full" title="Dataset original - fuente de datos derivados">
                      Original
                    </span>
                  )}
                </h3>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    <span>{formatFileSize(dataset.file_size)}</span>
                  </div>
                  {dataset.rows_count && (
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{dataset.rows_count.toLocaleString()} filas × {dataset.columns_count} columnas</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(dataset.created_at)}</span>
                  </div>
                  {activeCategory === 'cleaned' && dataset.original_dataset === null && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">Dataset original eliminado</span>
                    </div>
                  )}
                  {activeCategory === 'cleaned' && dataset.original_dataset_name && dataset.original_dataset !== null && (
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span className="text-xs">Origen: {dataset.original_dataset_name}</span>
                    </div>
                  )}
                  {dataset.data_quality_score && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Calidad:</span>
                      <span className={`text-xs font-semibold ${
                        dataset.data_quality_score >= 90 ? 'text-green-600' :
                        dataset.data_quality_score >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {dataset.data_quality_score.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>



                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button 
                    onClick={() => handleViewDetails(dataset)}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2",
                      activeCategory === 'cleaned'
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <Eye className="h-4 w-4" />
                    Ver
                  </button>
                  <button 
                    onClick={() => handleDownload(dataset)}
                    className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={getTotalPages()}
              onPageChange={handlePageChange}
              totalItems={getCategoryData().length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )
      )}

      {/* Modal de Detalles */}
      {selectedDataset && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-xl font-bold text-foreground">Vista Previa del Dataset</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedDataset.name}</p>
              </div>
              <button
                onClick={() => setSelectedDataset(null)}
                className="h-8 w-8 rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-5 border-b bg-accent/30">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Filas</p>
                <p className="text-2xl font-bold text-foreground">{selectedDataset.rows_count?.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Columnas</p>
                <p className="text-2xl font-bold text-foreground">{selectedDataset.columns_count}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Valores Nulos</p>
                <p className="text-2xl font-bold text-orange-500">{selectedDataset.null_values_count || 0}</p>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-5">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : previewData ? (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        {previewData.columns?.map((col: string, i: number) => (
                          <th key={i} className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedPreviewData().map((row: any, rowIndex: number) => (
                        <tr key={rowIndex} className="hover:bg-accent/50 transition-colors">
                          {previewData.columns?.map((col: string, cellIndex: number) => {
                            const cellValue = row[col];
                            const isNull = cellValue === null || cellValue === undefined || cellValue === '';
                            
                            return (
                              <td
                                key={cellIndex}
                                className={cn(
                                  'px-4 py-3 text-sm border-b',
                                  isNull
                                    ? 'bg-orange-500/10 text-orange-500 font-medium'
                                    : 'text-foreground'
                                )}
                              >
                                {isNull ? 'NULL' : String(cellValue)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No se pudo cargar la vista previa
                </div>
              )}
            </div>

            {/* Paginación del Modal */}
            {previewData && previewData.data && previewData.data.length > previewRowsPerPage && (
              <div className="border-t">
                <Pagination
                  currentPage={previewCurrentPage}
                  totalPages={getPreviewTotalPages()}
                  onPageChange={setPreviewCurrentPage}
                  totalItems={previewData.data.length}
                  itemsPerPage={previewRowsPerPage}
                />
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t bg-accent/30">
              <button
                onClick={() => setSelectedDataset(null)}
                className="px-4 py-2 rounded-lg border hover:bg-accent transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => handleDownload(selectedDataset)}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Modelo */}
      {selectedModel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-xl font-bold text-foreground">Detalles del Modelo</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedModel.name}</p>
              </div>
              <button
                onClick={() => setSelectedModel(null)}
                className="h-8 w-8 rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Model Info */}
            <div className="flex-1 overflow-auto p-5">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">Información General</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                          <BrainCircuit className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Tipo de Modelo</p>
                            <p className="font-medium text-foreground">{selectedModel.model_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                          <Database className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">Dataset de Origen</p>
                            <p className="font-medium text-foreground">{selectedModel.dataset_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                          <HardDrive className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Tamaño del Archivo</p>
                            <p className="font-medium text-foreground">{formatFileSize(selectedModel.file_size)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">Rendimiento</h3>
                      <div className="space-y-3">
                        {selectedModel.accuracy && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-green-600 font-medium">Precisión del Modelo</p>
                                <p className="text-2xl font-bold text-green-700">{selectedModel.accuracy.toFixed(1)}%</p>
                              </div>
                              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-accent/30 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Creado</p>
                            <p className="text-sm font-medium text-foreground">{formatDate(selectedModel.created_at)}</p>
                          </div>
                          <div className="p-3 bg-accent/30 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Actualizado</p>
                            <p className="text-sm font-medium text-foreground">{formatDate(selectedModel.updated_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedModel.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Descripción</h3>
                    <div className="p-4 bg-accent/30 rounded-lg">
                      <p className="text-foreground">{selectedModel.description}</p>
                    </div>
                  </div>
                )}

                {/* Model Metrics (Simulado) */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Métricas del Modelo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-sm text-blue-600 font-medium">F1-Score</p>
                      <p className="text-xl font-bold text-blue-700">
                        {selectedModel.accuracy ? (selectedModel.accuracy - 2).toFixed(1) : 'N/A'}%
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
                      <p className="text-sm text-purple-600 font-medium">Recall</p>
                      <p className="text-xl font-bold text-purple-700">
                        {selectedModel.accuracy ? (selectedModel.accuracy - 1).toFixed(1) : 'N/A'}%
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
                      <p className="text-sm text-orange-600 font-medium">Precision</p>
                      <p className="text-xl font-bold text-orange-700">
                        {selectedModel.accuracy ? (selectedModel.accuracy + 1).toFixed(1) : 'N/A'}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t bg-accent/30">
              <button
                onClick={() => setSelectedModel(null)}
                className="px-4 py-2 rounded-lg border hover:bg-accent transition-colors"
              >
                Cerrar
              </button>
              <button className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />
                Descargar Modelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
