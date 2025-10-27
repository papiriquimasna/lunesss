import { useState, useEffect } from 'react';
import { Database, Trash2, Eye, Calendar, FileText, HardDrive, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
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
}

export default function StoragePage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const { data } = await axios.get(`${API_BASE_URL}/data/datasets/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDatasets(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el dataset "${name}"? Esta acción no se puede deshacer.`)) return;

    setDeleting(id);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_BASE_URL}/data/datasets/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(`Dataset "${name}" eliminado exitosamente`);
      await loadDatasets();
      
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
    setLoadingPreview(true);
    
    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.get(`${API_BASE_URL}/data/datasets/${dataset.id}/preview/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewData(data);
    } catch (err: any) {
      console.error('Error al cargar preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async (dataset: Dataset) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/data/datasets/${dataset.id}/download/`, {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            Almacén de Datasets
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona todos tus datasets guardados
          </p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground">Total de datasets</p>
          <p className="text-2xl font-bold text-primary">{datasets.length}</p>
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

      {/* Datasets Grid */}
      {datasets.length === 0 ? (
        <div className="bg-card p-12 rounded-xl border text-center">
          <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No hay datasets guardados</h3>
          <p className="text-muted-foreground mb-6">
            Sube tu primer dataset desde la sección "Cargar Datos"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
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
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
                      {previewData.data?.slice(0, 10).map((row: any, rowIndex: number) => (
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
    </div>
  );
}
