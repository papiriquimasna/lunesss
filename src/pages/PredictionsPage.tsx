import { useState, useEffect } from 'react';
import { TrendingUp, Sparkles, DollarSign, Target, Brain } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { cn } from '../lib/utils';
import { BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Model {
  id: number;
  name: string;
  algorithm: string;
  task_type: string;
  target_column: string;
  feature_columns: string[];
}

interface PredictionResult {
  prediction: number | string;
  confidence_score?: number;
  prediction_time?: number;
}

export default function PredictionsPage() {
  const [activeTab, setActiveTab] = useState<'individual' | 'business'>('individual');
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [inputData, setInputData] = useState<Record<string, any>>({});
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  
  // Business predictions
  const [businessType, setBusinessType] = useState<'revenue' | 'promotion' | 'quick'>('quick');
  const [businessData, setBusinessData] = useState<any>({});
  const [businessResult, setBusinessResult] = useState<any>(null);

  // Cambiar tipo de predicción (mantener datos si son compatibles)
  const handleBusinessTypeChange = (type: 'revenue' | 'promotion' | 'quick') => {
    setBusinessType(type);
    // NO limpiar businessData - mantener los valores
    setBusinessResult(null);
  };

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const { data } = await axios.get(`${API_BASE_URL}/ml/models/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModels(data);
    } catch (err) {
      console.error('Error al cargar modelos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model);
    setPredictionResult(null);
    // Inicializar inputs vacíos
    const initialInputs: Record<string, any> = {};
    model.feature_columns.forEach(col => {
      initialInputs[col] = '';
    });
    setInputData(initialInputs);
  };

  const handlePredict = async () => {
    if (!selectedModel) return;

    setPredicting(true);
    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.post(
        `${API_BASE_URL}/ml/predictions/predict/`,
        {
          model_id: selectedModel.id,
          input_data: inputData
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPredictionResult(data.prediction_result);
    } catch (err: any) {
      console.error('Error al predecir:', err);
      alert(err.response?.data?.error || 'Error al realizar la predicción');
    } finally {
      setPredicting(false);
    }
  };

  const handleBusinessPredict = async () => {
    // Limpiar datos: remover undefined, NaN, null
    const cleanData = Object.entries(businessData).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && !Number.isNaN(value)) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    if (Object.keys(cleanData).length === 0) {
      alert('Por favor llena todos los campos');
      return;
    }
    
    setPredicting(true);
    setBusinessResult(null);
    
    try {
      const token = localStorage.getItem('access_token');
      let endpoint = '';
      
      switch (businessType) {
        case 'revenue':
          endpoint = '/ml/business-predictions/revenue_forecast/';
          break;
        case 'promotion':
          endpoint = '/ml/business-predictions/promotion_impact/';
          break;
        case 'quick':
          endpoint = '/ml/business-predictions/quick_forecast/';
          break;
      }

      const { data } = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        cleanData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      setBusinessResult(data);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Error al realizar la predicción');
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Predicciones</h1>
        <p className="text-muted-foreground">Realiza predicciones con tus modelos entrenados</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('individual')}
          className={cn(
            "px-6 py-3 font-medium transition-all border-b-2",
            activeTab === 'individual'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Brain className="h-4 w-4 inline mr-2" />
          Predicción con Modelo
        </button>
        <button
          onClick={() => setActiveTab('business')}
          className={cn(
            "px-6 py-3 font-medium transition-all border-b-2",
            activeTab === 'business'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <DollarSign className="h-4 w-4 inline mr-2" />
          Predicciones de Negocio
        </button>
      </div>

      {/* Individual Predictions */}
      {activeTab === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Model Selection & Input */}
          <div className="space-y-6">
            {/* Model Selection */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Selecciona un Modelo</h2>
              {models.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No hay modelos entrenados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border-2 transition-all",
                        selectedModel?.id === model.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="font-medium text-sm mb-1">{model.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {model.algorithm} • {model.task_type}
                      </div>
                      <div className="text-xs text-primary mt-1">
                        Predice: {model.target_column}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input Form */}
            {selectedModel && (
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Datos de Entrada</h2>
                <div className="space-y-3">
                  {selectedModel.feature_columns.map((column) => (
                    <div key={column}>
                      <label className="block text-sm font-medium mb-1">{column}</label>
                      <input
                        type="text"
                        value={inputData[column] || ''}
                        onChange={(e) => setInputData({ ...inputData, [column]: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        placeholder={`Ingresa ${column}`}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handlePredict}
                  disabled={predicting || Object.values(inputData).some(v => v === '')}
                  className="w-full mt-4 bg-primary text-primary-foreground px-4 py-3 rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {predicting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Prediciendo...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Realizar Predicción
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div>
            {predictionResult && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 p-6">
                <h2 className="text-lg font-semibold mb-4 text-blue-900">Resultado de la Predicción</h2>
                
                <div className="bg-white rounded-lg p-6 mb-4 border-2 border-blue-300">
                  <div className="text-sm text-blue-700 mb-2">Predicción para: {selectedModel?.target_column}</div>
                  <div className="text-4xl font-bold text-blue-900">
                    {typeof predictionResult.prediction === 'number' 
                      ? predictionResult.prediction.toFixed(2)
                      : predictionResult.prediction}
                  </div>
                </div>

                {predictionResult.confidence_score && (
                  <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                    <div className="text-sm text-green-700 mb-2">Confianza</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-500 h-3 rounded-full transition-all"
                          style={{ width: `${predictionResult.confidence_score * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-lg font-bold text-green-900">
                        {(predictionResult.confidence_score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {predictionResult.prediction_time && (
                  <div className="mt-4 text-xs text-blue-700">
                    Tiempo de predicción: {predictionResult.prediction_time.toFixed(3)}s
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Business Predictions */}
      {activeTab === 'business' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Type Selection & Input */}
          <div className="space-y-6">
            {/* Type Selection */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Tipo de Predicción</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'quick', label: 'Rápida', icon: Sparkles, desc: 'Predicción simple' },
                  { value: 'revenue', label: 'Ganancias', icon: DollarSign, desc: 'Forecast detallado' },
                  { value: 'promotion', label: 'Promoción', icon: Target, desc: 'Impacto de descuentos' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleBusinessTypeChange(type.value as any)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      businessType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <type.icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground text-center">{type.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Parámetros</h2>
              
              {businessType === 'quick' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ganancia Semanal Actual ($)</label>
                    <input
                      type="number"
                      value={businessData.ganancia_semanal_actual || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseFloat(e.target.value) : undefined;
                        setBusinessData({ ...businessData, ganancia_semanal_actual: value });
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Días a Predecir</label>
                    <input
                      type="number"
                      value={businessData.dias_prediccion || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : undefined;
                        setBusinessData({ ...businessData, dias_prediccion: value });
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Factor de Crecimiento</label>
                    <input
                      type="number"
                      step="0.1"
                      value={businessData.factor_crecimiento || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseFloat(e.target.value) : undefined;
                        setBusinessData({ ...businessData, factor_crecimiento: value });
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="1.1"
                    />
                  </div>
                </div>
              )}

              {businessType === 'revenue' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Ventas Históricas (últimas 5 semanas)</label>
                    <input
                      type="text"
                      value={businessData.ventas_historicas || ''}
                      onChange={(e) => setBusinessData({ ...businessData, ventas_historicas: e.target.value.split(',').map(Number) })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="15000, 18000, 16500, 19200, 17800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Costos Promedio (0-1)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={businessData.costos_promedio || ''}
                      onChange={(e) => setBusinessData({ ...businessData, costos_promedio: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="0.6"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tendencia</label>
                    <select
                      value={businessData.tendencia || 'estable'}
                      onChange={(e) => setBusinessData({ ...businessData, tendencia: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="creciente">Creciente</option>
                      <option value="estable">Estable</option>
                      <option value="decreciente">Decreciente</option>
                    </select>
                  </div>
                </div>
              )}

              {businessType === 'promotion' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Venta Base Semanal ($)</label>
                    <input
                      type="number"
                      value={businessData.venta_base_semanal || ''}
                      onChange={(e) => setBusinessData({ ...businessData, venta_base_semanal: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Descuento (0-1)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={businessData.descuento || ''}
                      onChange={(e) => setBusinessData({ ...businessData, descuento: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="0.20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duración (días)</label>
                    <input
                      type="number"
                      value={businessData.duracion_dias || ''}
                      onChange={(e) => setBusinessData({ ...businessData, duracion_dias: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="7"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleBusinessPredict}
                disabled={predicting || Object.keys(businessData).length === 0}
                className="w-full mt-4 bg-primary text-primary-foreground px-4 py-3 rounded-lg hover:bg-primary/90 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {predicting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Calculando...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    Generar Predicción
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Results with Charts */}
          <div>
            {businessResult && (
              <div className="space-y-6">
                {/* Quick Forecast Results */}
                {businessType === 'quick' && businessResult.ganancia_estimada !== undefined && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-6">
                    <h2 className="text-lg font-semibold mb-4 text-green-900">💰 Predicción de Ganancias</h2>
                    
                    <div className="bg-white rounded-lg p-6 border-2 border-green-300 mb-4">
                      <div className="text-sm text-green-700 mb-2">Ganancia Estimada en {businessResult.dias_prediccion} días</div>
                      <div className="text-5xl font-bold text-green-900 mb-2">
                        ${businessResult.ganancia_estimada.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-green-600">{businessResult.mensaje}</div>
                    </div>

                    {businessResult.rango_estimado && (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="text-xs text-blue-700 mb-1">Mínimo Estimado</div>
                          <div className="text-xl font-bold text-blue-900">
                            ${businessResult.rango_estimado.minimo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="text-xs text-purple-700 mb-1">Máximo Estimado</div>
                          <div className="text-xl font-bold text-purple-900">
                            ${businessResult.rango_estimado.maximo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                        <div className="text-xs text-teal-700 mb-1">Ganancia Diaria Promedio</div>
                        <div className="text-lg font-bold text-teal-900">
                          ${businessResult.ganancia_diaria_promedio.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <div className="text-xs text-yellow-700 mb-1">Confianza</div>
                        <div className="text-lg font-bold text-yellow-900">{businessResult.confianza}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Revenue Forecast Results */}
                {businessType === 'revenue' && businessResult.predicciones !== undefined && (
                  <>
                    <div className="bg-card rounded-lg border p-6">
                      <h2 className="text-lg font-semibold mb-4">Proyección de Ganancias</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={[
                          { periodo: '7 días', ganancia: businessResult.predicciones['7_dias']?.ganancia_neta || 0 },
                          { periodo: '30 días', ganancia: businessResult.predicciones['30_dias']?.ganancia_neta || 0 },
                          { periodo: '90 días', ganancia: businessResult.predicciones['90_dias']?.ganancia_neta || 0 },
                          { periodo: '365 días', ganancia: businessResult.predicciones['365_dias']?.ganancia_neta || 0 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="periodo" 
                            tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }}
                          />
                          <YAxis 
                            tick={{ fill: '#374151', fontSize: 12 }}
                            tickFormatter={(value) => `$${value.toLocaleString()}`}
                          />
                          <Tooltip 
                            formatter={(value: any) => [`$${value.toLocaleString()}`, 'Ganancia Neta']}
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '2px solid #10b981',
                              borderRadius: '8px',
                              padding: '10px'
                            }}
                          />
                          <Bar 
                            dataKey="ganancia" 
                            fill="#10b981" 
                            radius={[8, 8, 0, 0]}
                            minPointSize={5}
                            label={{ 
                              position: 'top', 
                              fill: '#059669',
                              fontSize: 12,
                              fontWeight: 'bold',
                              formatter: (value: any) => `$${value.toLocaleString()}`
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {businessResult.recomendaciones && (
                      <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-6">
                        <h3 className="font-semibold text-blue-900 mb-3">Recomendaciones</h3>
                        <ul className="space-y-2">
                          {businessResult.recomendaciones.map((rec: string, idx: number) => (
                            <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {/* Promotion Impact Results */}
                {businessType === 'promotion' && businessResult.impacto !== undefined && (
                  <>
                    <div className="bg-card rounded-lg border p-6">
                      <h2 className="text-lg font-semibold mb-4">🥧 Impacto de la Promoción</h2>
                      <ResponsiveContainer width="100%" height={350}>
                        <RePieChart>
                          <Pie
                            data={[
                              { name: 'Ganancia Neta', value: businessResult.impacto.ganancia_neta || 0 },
                              { name: 'Costos Totales', value: businessResult.impacto.costos_totales || 0 },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={(entry: any) => `${entry.name}: $${entry.value.toLocaleString()}`}
                            outerRadius={100}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={5}
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#3b82f6" />
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [`$${value.toLocaleString('es-ES')}`, '']}
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '2px solid #10b981',
                              borderRadius: '8px',
                              padding: '12px'
                            }}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Tarjetas de resumen */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                        <div className="text-sm text-green-700 mb-1">💰 Ganancia Neta</div>
                        <div className="text-2xl font-bold text-green-900">
                          ${(businessResult.impacto.ganancia_neta || 0).toLocaleString('es-ES')}
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                        <div className="text-sm text-blue-700 mb-1">💸 Costos Totales</div>
                        <div className="text-2xl font-bold text-blue-900">
                          ${(businessResult.impacto.costos_totales || 0).toLocaleString('es-ES')}
                        </div>
                      </div>
                    </div>

                    {businessResult.impacto.roi && (
                      <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                        <div className="text-sm text-purple-700 mb-1">📈 ROI (Retorno de Inversión)</div>
                        <div className="text-3xl font-bold text-purple-900">
                          {(businessResult.impacto.roi * 100).toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
