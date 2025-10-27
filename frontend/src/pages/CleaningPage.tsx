import { useState, useEffect } from 'react';
import { Sparkles, Database, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, TrendingUp, TrendingDown, Copy, Scissors, RefreshCw, Trash2, Columns, Zap, BarChart3, Activity } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { cn } from '../lib/utils';

// Datos de configuración de opciones
const BASIC_OPTIONS = [
  { key: 'remove_duplicates', label: 'Eliminar duplicados', icon: Copy },
  { key: 'trim_whitespace', label: 'Eliminar espacios', icon: Scissors },
  { key: 'convert_data_types', label: 'Convertir tipos', icon: RefreshCw },
  { key: 'remove_empty_rows', label: 'Eliminar filas vacías', icon: Trash2 },
  { key: 'remove_empty_columns', label: 'Eliminar columnas vacías', icon: Columns },
];

const OUTLIER_METHODS = [
  { value: 'iqr', label: 'IQR', emoji: '📊' },
  { value: 'zscore', label: 'Z-Score', emoji: '📈' },
  { value: 'isolation_forest', label: 'Isolation Forest', emoji: '🤖' },
];

const TRANSFORMATIONS = [
  { key: 'normalize_data', label: 'Normalizar (0-1)', icon: BarChart3 },
  { key: 'standardize_data', label: 'Estandarizar (Z-score)', icon: Activity },
];

interface Dataset {
  id: number;
  name: string;
  rows_count: number;
  columns_count: number;
  null_values_count?: number;
  duplicate_rows_count?: number;
  data_quality_score?: number;
}

interface CleaningConfig {
  null_strategy: string;
  target_columns: string[];
  custom_fill_value?: string;
  remove_duplicates: boolean;
  remove_outliers: boolean;
  outlier_method?: string;
  normalize_data: boolean;
  standardize_data: boolean;
  remove_empty_rows: boolean;
  remove_empty_columns: boolean;
  convert_data_types: boolean;
  trim_whitespace: boolean;
}

interface CleaningResult {
  cleaned_dataset: {
    id: number;
    name: string;
    rows_count: number;
    columns_count: number;
    rows_removed: number;
    null_values_filled: number;
  };
  cleaning_report: {
    methods_used: string[];
    null_values_filled: number;
    rows_removed: number;
    outliers_removed: number;
    columns_removed: number;
  };
}

interface PreviewData {
  columns: string[];
  data: any[];
  total_rows: number;
}



export default function CleaningPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cleaningResult, setCleaningResult] = useState<CleaningResult | null>(null);
  const [originalPreview, setOriginalPreview] = useState<PreviewData | null>(null);
  const [cleanedPreview, setCleanedPreview] = useState<PreviewData | null>(null);
  const [loadingPreviews, setLoadingPreviews] = useState(false);

  // Número fijo de filas a mostrar (primera página solamente)
  const [rowsPerPage] = useState(10);

  const [config, setConfig] = useState<CleaningConfig>({
    null_strategy: 'fill_median',
    target_columns: [],
    remove_duplicates: true,
    remove_outliers: false,
    outlier_method: 'iqr',
    normalize_data: false,
    standardize_data: false,
    remove_empty_rows: false,
    remove_empty_columns: false,
    convert_data_types: true,
    trim_whitespace: true,
  });

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
      setError('Error al cargar datasets');
    } finally {
      setLoading(false);
    }
  };

  const loadPreviews = async (originalId: number, cleanedId: number) => {
    setLoadingPreviews(true);
    try {
      const token = localStorage.getItem('access_token');

      const originalResponse = await axios.get(
        `${API_BASE_URL}/data/datasets/${originalId}/preview/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOriginalPreview(originalResponse.data);

      const cleanedResponse = await axios.get(
        `${API_BASE_URL}/data/cleaned-datasets/${cleanedId}/preview/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCleanedPreview(cleanedResponse.data);
    } catch (err: any) {
      console.error('Error al cargar previews:', err);
    } finally {
      setLoadingPreviews(false);
    }
  };

  const handleClean = async () => {
    if (!selectedDataset) return;

    setCleaning(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.post(
        `${API_BASE_URL}/data/datasets/${selectedDataset.id}/clean/`,
        config,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCleaningResult(data);
      await loadPreviews(selectedDataset.id, data.cleaned_dataset.id);
      setStep(3);
      await loadDatasets();
      
      // Disparar evento para actualizar dashboard
      window.dispatchEvent(new CustomEvent('dashboardUpdate', { 
        detail: { type: 'cleaning', datasetId: selectedDataset.id } 
      }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al limpiar el dataset');
    } finally {
      setCleaning(false);
    }
  };

  const handleReset = () => {
    setSelectedDataset(null);
    setCleaningResult(null);
    setStep(1);
    setConfig({
      null_strategy: 'fill_median',
      target_columns: [],
      remove_duplicates: true,
      remove_outliers: false,
      outlier_method: 'iqr',
      normalize_data: false,
      standardize_data: false,
      remove_empty_rows: false,
      remove_empty_columns: false,
      convert_data_types: true,
      trim_whitespace: true,
    });
  };

  // Funciones para mostrar solo la primera página de datos
  const getFirstPageOriginalData = () => {
    if (!originalPreview?.data) return [];
    return originalPreview.data.slice(0, rowsPerPage);
  };

  const getFirstPageCleanedData = () => {
    if (!cleanedPreview?.data) return [];
    return cleanedPreview.data.slice(0, rowsPerPage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col px-4">
      {/* Compact Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground">Limpieza de Datos</h1>
        <p className="text-sm text-muted-foreground">Transforma tus datos en información lista para análisis</p>
      </div>

      {/* Compact Progress Steps */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {[
          { num: 1, label: 'Seleccionar' },
          { num: 2, label: 'Configurar' },
          { num: 3, label: 'Resultados' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground'
              )}>
                {step > s.num ? <CheckCircle className="h-4 w-4" /> : s.num}
              </div>
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            {idx < 2 && <div className={cn('h-0.5 w-12 mx-2', step > s.num ? 'bg-primary' : 'bg-border')} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center gap-2 mb-4 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Content Area - Fixed Height */}
      <div className="flex-1 overflow-hidden flex items-start justify-center">
        {/* Step 1: Select Dataset */}
        {step === 1 && (
          <div className="h-full bg-card rounded-lg border p-4 overflow-auto w-full" style={{ maxWidth: '1200px' }}>
            <h2 className="text-lg font-semibold mb-3">Selecciona un Dataset</h2>

            {datasets.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">No hay datasets disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {datasets.map((dataset) => (
                  <button
                    key={dataset.id}
                    onClick={() => {
                      setSelectedDataset(dataset);
                      setStep(2);
                    }}
                    className="group bg-gradient-to-br from-background to-accent/20 p-4 rounded-lg border-2 border-border hover:border-primary transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Database className="h-6 w-6 text-primary" />
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    <h3 className="font-semibold text-sm mb-2 truncate">{dataset.name}</h3>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Filas</span>
                        <span className="font-medium">{dataset.rows_count?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Columnas</span>
                        <span className="font-medium">{dataset.columns_count}</span>
                      </div>
                      {dataset.null_values_count !== undefined && dataset.null_values_count > 0 && (
                        <div className="flex justify-between pt-1 border-t">
                          <span className="text-orange-600">Nulos</span>
                          <span className="font-semibold text-orange-600">{dataset.null_values_count}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && selectedDataset && (
          <div className="h-full bg-card rounded-lg border flex flex-col w-full" style={{ maxWidth: '700px' }}>
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{selectedDataset.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedDataset.rows_count?.toLocaleString()} filas × {selectedDataset.columns_count} columnas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" />
                Cambiar
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-3">
                {/* Valores Nulos */}
                <div>
                  <label className="block text-xs font-semibold mb-2">Valores Nulos</label>
                  <select
                    value={config.null_strategy}
                    onChange={(e) => setConfig({ ...config, null_strategy: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-background border rounded-lg"
                  >
                    <option value="drop">Eliminar filas</option>
                    <option value="fill_median">Rellenar con mediana</option>
                    <option value="fill_mean">Rellenar con media</option>
                    <option value="fill_mode">Rellenar con moda</option>
                    <option value="fill_forward">Rellenar adelante</option>
                    <option value="fill_backward">Rellenar atrás</option>
                    <option value="fill_interpolate">Interpolación</option>
                    <option value="fill_zero">Rellenar con cero</option>
                    <option value="fill_custom">Personalizado</option>
                  </select>

                  {config.null_strategy === 'fill_custom' && (
                    <input
                      type="text"
                      value={config.custom_fill_value || ''}
                      onChange={(e) => setConfig({ ...config, custom_fill_value: e.target.value })}
                      placeholder="Valor personalizado"
                      className="w-full px-3 py-2 text-sm bg-background border rounded-lg mt-2"
                    />
                  )}
                </div>

                {/* Opciones Básicas */}
                <div>
                  <label className="block text-xs font-semibold mb-2">Opciones Básicas</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BASIC_OPTIONS.map((option) => (
                      <label
                        key={option.key}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all",
                          config[option.key as keyof CleaningConfig]
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={config[option.key as keyof CleaningConfig] as boolean}
                          onChange={(e) => setConfig({ ...config, [option.key]: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className={cn(
                          "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0",
                          config[option.key as keyof CleaningConfig] ? "bg-primary/10" : "bg-accent"
                        )}>
                          <option.icon className={cn(
                            "h-3.5 w-3.5",
                            config[option.key as keyof CleaningConfig] ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <span className="text-xs font-medium">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Outliers */}
                <div>
                  <label
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all",
                      config.remove_outliers
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={config.remove_outliers}
                      onChange={(e) => setConfig({ ...config, remove_outliers: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0",
                      config.remove_outliers ? "bg-primary/10" : "bg-accent"
                    )}>
                      <Zap className={cn(
                        "h-3.5 w-3.5",
                        config.remove_outliers ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <span className="text-xs font-medium">Eliminar outliers</span>
                  </label>

                  {config.remove_outliers && (
                    <div className="mt-2 bg-accent/30 rounded-lg p-3 border">
                      <p className="text-xs font-medium mb-2">Método de detección:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {OUTLIER_METHODS.map((method) => (
                          <label
                            key={method.value}
                            className={cn(
                              "flex flex-col items-center gap-1 p-2 rounded-lg border-2 cursor-pointer transition-all",
                              config.outlier_method === method.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <input
                              type="radio"
                              name="outlier_method"
                              value={method.value}
                              checked={config.outlier_method === method.value}
                              onChange={(e) => setConfig({ ...config, outlier_method: e.target.value })}
                              className="h-4 w-4 text-primary focus:ring-primary"
                            />
                            <span className="text-lg">{method.emoji}</span>
                            <span className="text-xs font-medium text-center">{method.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Transformaciones */}
                <div>
                  <label className="block text-xs font-semibold mb-2">Transformaciones</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSFORMATIONS.map((transform) => (
                      <label
                        key={transform.key}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all",
                          config[transform.key as keyof CleaningConfig]
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={config[transform.key as keyof CleaningConfig] as boolean}
                          onChange={(e) => setConfig({ ...config, [transform.key]: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className={cn(
                          "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0",
                          config[transform.key as keyof CleaningConfig] ? "bg-primary/10" : "bg-accent"
                        )}>
                          <transform.icon className={cn(
                            "h-3.5 w-3.5",
                            config[transform.key as keyof CleaningConfig] ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <span className="text-xs font-medium">{transform.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 border-t flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border rounded-lg hover:bg-accent text-sm"
              >
                Atrás
              </button>
              <button
                onClick={handleClean}
                disabled={cleaning}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {cleaning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Limpiar Dataset
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && cleaningResult && selectedDataset && (
          <div className="h-full flex flex-col w-full" style={{ maxWidth: '1400px' }}>
            {/* Compact Success + Stats */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <h2 className="text-sm font-bold text-green-900">¡Limpieza Completada!</h2>
                    <p className="text-xs text-green-700">Dataset procesado exitosamente</p>
                  </div>
                </div>
                <div className="flex gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-900">{cleaningResult.cleaning_report.rows_removed}</div>
                    <div className="text-xs text-green-700">Filas</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-900">{cleaningResult.cleaning_report.null_values_filled}</div>
                    <div className="text-xs text-green-700">Nulos</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-900">{cleaningResult.cleaning_report.outliers_removed}</div>
                    <div className="text-xs text-green-700">Outliers</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tables Side by Side */}
            <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
              {/* Before Table */}
              <div className="bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      </div>
                      <h3 className="font-semibold text-red-900">Antes de Limpiar</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white/50 rounded px-2 py-1">
                      <span className="text-red-700">Filas:</span>
                      <span className="ml-1 font-semibold text-red-900">{selectedDataset.rows_count?.toLocaleString()}</span>
                    </div>
                    <div className="bg-white/50 rounded px-2 py-1">
                      <span className="text-red-700">Columnas:</span>
                      <span className="ml-1 font-semibold text-red-900">{selectedDataset.columns_count}</span>
                    </div>
                    <div className="bg-white/50 rounded px-2 py-1">
                      <span className="text-orange-700">Nulos:</span>
                      <span className="ml-1 font-semibold text-orange-900">{selectedDataset.null_values_count || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  {loadingPreviews ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : originalPreview ? (
                    <div className="rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            {originalPreview.columns.slice(0, 6).map((col, idx) => (
                              <th key={idx} className="px-3 py-2 text-left text-sm font-semibold text-foreground border-b">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {getFirstPageOriginalData().map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-accent/50 transition-colors">
                              {originalPreview.columns.slice(0, 6).map((col, colIdx) => {
                                const value = row[col];
                                const isNull = value === null || value === undefined || value === '';
                                return (
                                  <td
                                    key={colIdx}
                                    className={cn(
                                      'px-3 py-2 text-sm border-b',
                                      isNull ? 'bg-orange-500/10 text-orange-500 font-medium' : 'text-foreground'
                                    )}
                                  >
                                    {isNull ? 'NULL' : String(value)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      No disponible
                    </div>
                  )}
                </div>
                {originalPreview && originalPreview.data.length > rowsPerPage && (
                  <div className="px-3 py-2 bg-accent/20 border-t text-xs text-muted-foreground text-center">
                    Mostrando las primeras {Math.min(rowsPerPage, originalPreview.data.length)} de {originalPreview.data.length} filas
                  </div>
                )}
              </div>

              {/* After Table */}
              <div className="bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-green-900">Después de Limpiar</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white/50 rounded px-2 py-1">
                      <span className="text-green-700">Filas:</span>
                      <span className="ml-1 font-semibold text-green-900">{cleaningResult.cleaned_dataset.rows_count.toLocaleString()}</span>
                    </div>
                    <div className="bg-white/50 rounded px-2 py-1">
                      <span className="text-green-700">Columnas:</span>
                      <span className="ml-1 font-semibold text-green-900">{cleaningResult.cleaned_dataset.columns_count}</span>
                    </div>
                    <div className="bg-white/50 rounded px-2 py-1">
                      <span className="text-green-700">Nulos:</span>
                      <span className="ml-1 font-semibold text-green-900">0</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  {loadingPreviews ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : cleanedPreview ? (
                    <div className="rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            {cleanedPreview.columns.slice(0, 6).map((col, idx) => (
                              <th key={idx} className="px-3 py-2 text-left text-sm font-semibold text-foreground border-b">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {getFirstPageCleanedData().map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-accent/50 transition-colors">
                              {cleanedPreview.columns.slice(0, 6).map((col, colIdx) => {
                                // Verificar si el valor fue rellenado (era NULL antes y ahora tiene valor)
                                const originalRowData = originalPreview?.data[rowIdx];
                                const originalValue = originalRowData?.[col];
                                const cleanedValue = row[col];
                                const wasNull = originalValue === null || originalValue === undefined || originalValue === '';
                                const nowHasValue = cleanedValue !== null && cleanedValue !== undefined && cleanedValue !== '';
                                const wasFilled = wasNull && nowHasValue;

                                return (
                                  <td
                                    key={colIdx}
                                    className={cn(
                                      'px-3 py-2 text-sm border-b',
                                      wasFilled ? 'bg-green-200 text-green-900 font-semibold' : 'text-foreground'
                                    )}
                                  >
                                    {cleanedValue !== null && cleanedValue !== undefined ? String(cleanedValue) : '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      No disponible
                    </div>
                  )}
                </div>
                {cleanedPreview && cleanedPreview.data.length > rowsPerPage && (
                  <div className="px-3 py-2 bg-accent/20 border-t text-xs text-muted-foreground text-center">
                    Mostrando las primeras {Math.min(rowsPerPage, cleanedPreview.data.length)} de {cleanedPreview.data.length} filas
                  </div>
                )}
              </div>
            </div>

            {/* Compact Footer */}
            <div className="mt-3 flex gap-3">
              <div className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-200">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">Métodos Aplicados:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {cleaningResult.cleaning_report.methods_used.map((method, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={handleReset}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 font-semibold flex items-center gap-2 text-sm whitespace-nowrap shadow-sm hover:shadow-md transition-all"
              >
                Limpiar Otro Dataset
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
