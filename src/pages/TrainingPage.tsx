import { useState, useEffect } from 'react';
import { Brain, Database, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Target, Settings } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { cn } from '../lib/utils';

interface Dataset {
  id: number;
  name: string;
  rows_count: number;
  columns_count: number;
  columns_info?: any;
}

interface TrainingConfig {
  dataset_type: 'original' | 'cleaned';
  dataset_id: number;
  algorithm: string;
  task_type: string;
  target_column: string;
  feature_columns: string[];
  test_size: number;
  validation_size: number;
  random_state: number;
  hyperparameters: any;
}

interface TrainingResult {
  message?: string;
  model?: {
    id: number;
    name: string;
    algorithm: string;
    task_type: string;
    description?: string;
    owner?: number;
    owner_email?: string;
    original_dataset?: number | null;
    cleaned_dataset?: number | null;
    target_column?: string;
    feature_columns?: string[];
    metrics?: any;
    training_time?: number;
  };
  // Formato alternativo (por si viene directo)
  id?: number;
  name?: string;
  algorithm?: string;
  task_type?: string;
  description?: string;
  target_column?: string;
  feature_columns?: string[];
  metrics?: any;
  training_time?: number;
}

const ALGORITHMS = [
  { value: 'random_forest', label: 'Random Forest', icon: '🌲', description: 'Robusto y preciso' },
  { value: 'gradient_boosting', label: 'XGBoost', icon: '⚡', description: 'Alto rendimiento' },
  { value: 'neural_network', label: 'Red Neuronal', icon: '🧠', description: 'Deep Learning' },
];

export default function TrainingPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [cleanedDatasets, setCleanedDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);

  const [config, setConfig] = useState<TrainingConfig>({
    dataset_type: 'cleaned',
    dataset_id: 0,
    algorithm: 'random_forest',
    task_type: 'regression',
    target_column: '',
    feature_columns: [],
    test_size: 0.2,
    validation_size: 0.2,
    random_state: 42,
    hyperparameters: {},
  });

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const [originalRes, cleanedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/data/datasets/`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/data/cleaned-datasets/`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setDatasets(originalRes.data);
      setCleanedDatasets(cleanedRes.data);
    } catch (err: any) {
      setError('Error al cargar datasets');
    } finally {
      setLoading(false);
    }
  };

  const loadColumns = async (datasetId: number, type: 'original' | 'cleaned') => {
    setLoadingColumns(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const endpoint = type === 'cleaned'
        ? `/data/cleaned-datasets/${datasetId}/preview/`
        : `/data/datasets/${datasetId}/preview/`;

      const { data } = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Preview data:', data); // Debug

      if (data.columns && Array.isArray(data.columns)) {
        setColumns(data.columns);
        console.log('Columnas cargadas:', data.columns); // Debug
      } else if (data.columns_info) {
        setColumns(Object.keys(data.columns_info));
      } else {
        setError('No se pudieron cargar las columnas del dataset');
      }
    } catch (err: any) {
      console.error('Error al cargar columnas:', err);
      setError(err.response?.data?.error || 'Error al cargar las columnas del dataset');
    } finally {
      setLoadingColumns(false);
    }
  };

  const handleDatasetSelect = async (dataset: Dataset, type: 'original' | 'cleaned') => {
    setSelectedDataset(dataset);
    setConfig({ ...config, dataset_id: dataset.id, dataset_type: type });
    await loadColumns(dataset.id, type);
    setStep(2);
  };

  const handleTrain = async () => {
    if (!config.target_column || config.feature_columns.length === 0) {
      setError('Selecciona columna objetivo y características');
      return;
    }

    setTraining(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.post(
        `${API_BASE_URL}/ml/models/train/`,
        config,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Training result:', data); // Debug
      setTrainingResult(data);
      setStep(3);
      
      // Disparar evento para actualizar dashboard
      window.dispatchEvent(new CustomEvent('dashboardUpdate', { 
        detail: { type: 'training', modelData: data } 
      }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al entrenar el modelo');
    } finally {
      setTraining(false);
    }
  };



  const handleReset = () => {
    setSelectedDataset(null);
    setTrainingResult(null);
    setStep(1);
    setColumns([]);
    setConfig({
      dataset_type: 'cleaned',
      dataset_id: 0,
      algorithm: 'random_forest',
      task_type: 'regression',
      target_column: '',
      feature_columns: [],
      test_size: 0.2,
      validation_size: 0.2,
      random_state: 42,
      hyperparameters: {},
    });
  };

  const toggleFeature = (column: string) => {
    if (config.feature_columns.includes(column)) {
      setConfig({
        ...config,
        feature_columns: config.feature_columns.filter(c => c !== column)
      });
    } else {
      setConfig({
        ...config,
        feature_columns: [...config.feature_columns, column]
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const allDatasets = [
    ...cleanedDatasets.map(d => ({ ...d, type: 'cleaned' as const })),
    ...datasets.map(d => ({ ...d, type: 'original' as const }))
  ];

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col px-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground">Entrenamiento de Modelos</h1>
        <p className="text-sm text-muted-foreground">Crea modelos de Machine Learning para predicciones</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {[
          { num: 1, label: 'Dataset' },
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

      {/* Content */}
      <div className="flex-1 overflow-hidden flex items-start justify-center">
        {/* Step 1: Select Dataset */}
        {step === 1 && (
          <div className="h-full bg-card rounded-lg border p-4 overflow-auto w-full" style={{ maxWidth: '1200px' }}>
            <h2 className="text-lg font-semibold mb-3">Selecciona un Dataset</h2>

            {allDatasets.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">No hay datasets disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allDatasets.map((dataset) => (
                  <button
                    key={`${dataset.type}-${dataset.id}`}
                    onClick={() => handleDatasetSelect(dataset, dataset.type)}
                    className="group bg-gradient-to-br from-background to-accent/20 p-4 rounded-lg border-2 border-border hover:border-primary transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Database className="h-6 w-6 text-primary" />
                      <div className="flex items-center gap-2">
                        {dataset.type === 'cleaned' && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Limpio</span>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
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
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && selectedDataset && (
          <div className="h-full bg-card rounded-lg border flex flex-col w-full" style={{ maxWidth: '800px' }}>
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
              {loadingColumns ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Cargando columnas del dataset...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Info Box */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-sm mb-2 text-blue-900">💡 ¿Cómo funciona?</h3>
                    <div className="text-xs text-blue-800 space-y-1">
                      <p><strong>Ejemplo:</strong> Quieres predecir el salario de empleados</p>
                      <p>• <strong>Columna a predecir:</strong> "salario" (lo que quieres saber)</p>
                      <p>• <strong>Características:</strong> edad, experiencia, educación (datos para predecir)</p>
                      <p className="pt-2 text-blue-700">El modelo aprenderá la relación entre las características y el salario para hacer predicciones futuras.</p>
                    </div>
                  </div>

                  {/* Algorithm */}
                  <div>
                    <label className="block text-xs font-semibold mb-2">Algoritmo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {ALGORITHMS.map((algo) => (
                        <label
                          key={algo.value}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                            config.algorithm === algo.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <input
                            type="radio"
                            name="algorithm"
                            value={algo.value}
                            checked={config.algorithm === algo.value}
                            onChange={(e) => setConfig({ ...config, algorithm: e.target.value })}
                            className="sr-only"
                          />
                          <span className="text-2xl">{algo.icon}</span>
                          <span className="text-xs font-medium text-center">{algo.label}</span>
                          <span className="text-xs text-muted-foreground text-center">{algo.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Task Type */}
                  <div>
                    <label className="block text-xs font-semibold mb-2">Tipo de Tarea</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer",
                        config.task_type === 'regression' ? "border-primary bg-primary/5" : "border-border"
                      )}>
                        <input
                          type="radio"
                          name="task_type"
                          value="regression"
                          checked={config.task_type === 'regression'}
                          onChange={(e) => setConfig({ ...config, task_type: e.target.value })}
                          className="h-4 w-4"
                        />
                        <div>
                          <div className="text-sm font-medium">Regresión</div>
                          <div className="text-xs text-muted-foreground">Predecir números</div>
                        </div>
                      </label>
                      <label className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer",
                        config.task_type === 'classification' ? "border-primary bg-primary/5" : "border-border"
                      )}>
                        <input
                          type="radio"
                          name="task_type"
                          value="classification"
                          checked={config.task_type === 'classification'}
                          onChange={(e) => setConfig({ ...config, task_type: e.target.value })}
                          className="h-4 w-4"
                        />
                        <div>
                          <div className="text-sm font-medium">Clasificación</div>
                          <div className="text-xs text-muted-foreground">Predecir categorías</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Target Column */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold mb-2 text-blue-900">
                      <Target className="h-4 w-4 inline mr-1" />
                      ¿Qué quieres predecir?
                    </label>
                    <p className="text-xs text-blue-700 mb-3">
                      Selecciona la columna que el modelo aprenderá a predecir.
                      Ejemplo: si quieres predecir ventas, selecciona la columna "ventas"
                    </p>
                    {columns.length > 0 ? (
                      <select
                        value={config.target_column}
                        onChange={(e) => setConfig({ ...config, target_column: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">Selecciona la columna a predecir...</option>
                        {columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="bg-white border-2 border-blue-300 rounded-lg p-4 text-center text-sm text-muted-foreground">
                        No se encontraron columnas en el dataset
                      </div>
                    )}
                  </div>

                  {/* Feature Columns */}
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold mb-2 text-green-900">
                      <Settings className="h-4 w-4 inline mr-1" />
                      ¿Con qué datos hacer la predicción? ({config.feature_columns.length} seleccionadas)
                    </label>
                    <p className="text-xs text-green-700 mb-3">
                      Selecciona las columnas que el modelo usará para hacer la predicción.
                      Ejemplo: edad, experiencia, ciudad, etc.
                    </p>
                    {config.target_column ? (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto p-2 bg-white rounded-lg border-2 border-green-300">
                        {columns.filter(col => col !== config.target_column).map((col) => (
                          <label
                            key={col}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded border-2 cursor-pointer text-xs transition-all",
                              config.feature_columns.includes(col)
                                ? "border-green-500 bg-green-100 font-medium"
                                : "border-gray-300 hover:border-green-400 hover:bg-green-50"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={config.feature_columns.includes(col)}
                              onChange={() => toggleFeature(col)}
                              className="h-4 w-4 text-green-600 rounded"
                            />
                            <span className="truncate">{col}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground bg-white rounded-lg border-2 border-dashed border-green-300">
                        Primero selecciona qué quieres predecir ↑
                      </div>
                    )}
                  </div>

                  {/* Advanced Settings */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Test Size</label>
                      <input
                        type="number"
                        min="0.1"
                        max="0.5"
                        step="0.05"
                        value={config.test_size}
                        onChange={(e) => setConfig({ ...config, test_size: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-background border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Validation Size</label>
                      <input
                        type="number"
                        min="0.1"
                        max="0.5"
                        step="0.05"
                        value={config.validation_size}
                        onChange={(e) => setConfig({ ...config, validation_size: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-background border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border rounded-lg hover:bg-accent text-sm"
              >
                Atrás
              </button>
              <button
                onClick={handleTrain}
                disabled={training || !config.target_column || config.feature_columns.length === 0}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {training ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Entrenando...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Entrenar Modelo
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && trainingResult && (
          <div className="h-full flex flex-col w-full" style={{ maxWidth: '900px' }}>
            {(() => {
              // Extraer datos del modelo (puede venir en model o directo)
              const modelData = trainingResult.model || trainingResult;
              const trainingTime = modelData.training_time || 0;

              return (
                <>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <h2 className="text-lg font-bold text-green-900">
                          {trainingResult.message || '¡Modelo Entrenado Exitosamente!'}
                        </h2>
                        <p className="text-sm text-green-700">
                          Tiempo de entrenamiento: {trainingTime.toFixed(2)}s
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 bg-card rounded-lg border p-6 overflow-auto">
                    <h3 className="text-lg font-semibold mb-4">Información del Modelo</h3>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-700 mb-1">Algoritmo</div>
                        <div className="text-xl font-bold text-blue-900 capitalize">
                          {modelData.algorithm?.replace(/_/g, ' ') || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="text-sm text-purple-700 mb-1">Tipo de Tarea</div>
                        <div className="text-xl font-bold text-purple-900 capitalize">
                          {modelData.task_type || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="text-sm text-green-700 mb-1">ID del Modelo</div>
                        <div className="text-xl font-bold text-green-900">#{modelData.id || 'N/A'}</div>
                      </div>
                    </div>

                    {modelData.name && (
                      <div className="bg-accent/20 p-3 rounded-lg mb-4">
                        <div className="text-xs text-muted-foreground mb-1">Nombre del Modelo</div>
                        <div className="text-sm font-mono">{modelData.name}</div>
                      </div>
                    )}

                    {modelData.description && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-200">
                        <div className="text-xs text-blue-700 mb-1">Descripción</div>
                        <div className="text-sm text-blue-900">{modelData.description}</div>
                      </div>
                    )}

                    {(modelData.target_column || modelData.feature_columns) && (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {modelData.target_column && (
                          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                            <div className="text-xs text-orange-700 mb-1">Columna Objetivo</div>
                            <div className="text-sm font-semibold text-orange-900">{modelData.target_column}</div>
                          </div>
                        )}
                        {modelData.feature_columns && modelData.feature_columns.length > 0 && (
                          <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                            <div className="text-xs text-teal-700 mb-1">Características ({modelData.feature_columns.length})</div>
                            <div className="text-xs text-teal-900 flex flex-wrap gap-1">
                              {modelData.feature_columns.slice(0, 3).map((col: string, idx: number) => (
                                <span key={idx} className="bg-teal-100 px-2 py-0.5 rounded">{col}</span>
                              ))}
                              {modelData.feature_columns.length > 3 && (
                                <span className="text-teal-700">+{modelData.feature_columns.length - 3} más</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {modelData.metrics && Object.keys(modelData.metrics).length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Métricas de Rendimiento:</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(modelData.metrics).map(([key, value]: [string, any]) => {
                            // Formatear el nombre de la métrica
                            const formattedKey = key
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, l => l.toUpperCase());

                            return (
                              <div key={key} className="bg-gradient-to-br from-accent/30 to-accent/10 p-4 rounded-lg border">
                                <div className="text-xs text-muted-foreground mb-1">{formattedKey}</div>
                                <div className="text-2xl font-bold text-foreground">
                                  {typeof value === 'number' ? value.toFixed(4) : String(value)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-yellow-800">
                          No se encontraron métricas detalladas. El modelo se entrenó correctamente.
                        </p>
                      </div>
                    )}

                    {/* Mostrar información adicional si existe */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                      <h4 className="font-semibold text-sm mb-2">Información Técnica:</h4>
                      <pre className="text-xs overflow-auto max-h-40 bg-white p-3 rounded border">
                        {JSON.stringify(trainingResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 font-semibold flex items-center justify-center gap-2 text-sm"
              >
                Entrenar Otro Modelo
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
