# Documentación Completa - API de Machine Learning y Análisis de Datos

## Descripción General

Esta API REST proporciona un sistema completo para gestión de usuarios, análisis de datasets y entrenamiento de modelos de Machine Learning con predicciones de negocio. Construida con Django REST Framework y tecnologías de ML como scikit-learn, XGBoost y PyTorch.

**URL Base:** `http://localhost:8000/api/`

---

## 1. MÓDULO DE AUTENTICACIÓN (USER)

### Descripción
Sistema completo de autenticación con JWT, gestión de perfiles y avatares.

### Endpoints

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/auth/register/` | Registro de nuevo usuario | No |
| POST | `/auth/login/` | Iniciar sesión | No |
| POST | `/auth/logout/` | Cerrar sesión | Sí |
| POST | `/auth/token/refresh/` | Renovar token de acceso | No |
| GET | `/auth/profile/` | Obtener perfil del usuario | Sí |
| PUT | `/auth/profile/` | Actualizar perfil completo | Sí |
| PATCH | `/auth/profile/` | Actualizar perfil parcial | Sí |
| POST | `/auth/profile/avatar/upload/` | Subir avatar | Sí |
| DELETE | `/auth/profile/avatar/delete/` | Eliminar avatar | Sí |

### Ejemplos de Uso

#### 1.1 Registro de Usuario
```http
POST /api/auth/register/
Content-Type: application/json

{
    "email": "usuario@ejemplo.com",
    "first_name": "Juan",
    "last_name": "Pérez",
    "password": "contraseña123",
    "password2": "contraseña123"
}
```

**Respuesta exitosa (201):**
```json
{
    "message": "Usuario registrado exitosamente",
    "user": {
        "id": 1,
        "email": "usuario@ejemplo.com",
        "first_name": "Juan",
        "last_name": "Pérez",
        "username": "usuario@ejemplo.com",
        "avatar": null,
        "avatar_url": null,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
    },
    "tokens": {
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    }
}
```

#### 1.2 Iniciar Sesión
```http
POST /api/auth/login/
Content-Type: application/json

{
    "email": "usuario@ejemplo.com",
    "password": "contraseña123"
}
```

#### 1.3 Obtener Perfil
```http
GET /api/auth/profile/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

#### 1.4 Subir Avatar
```http
POST /api/auth/profile/avatar/upload/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: multipart/form-data

avatar: [archivo de imagen]
```

---

## 2. MÓDULO DE DATASETS

### Descripción
Gestión completa de datasets con análisis estadístico, limpieza de datos y visualización.

### Endpoints

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/data/datasets/` | Listar datasets del usuario | Sí |
| POST | `/data/datasets/` | Subir nuevo dataset | Sí |
| GET | `/data/datasets/{id}/` | Obtener dataset específico | Sí |
| PUT | `/data/datasets/{id}/` | Actualizar dataset | Sí |
| DELETE | `/data/datasets/{id}/` | Eliminar dataset | Sí |
| GET | `/data/datasets/{id}/preview/` | Vista previa del dataset | Sí |
| GET | `/data/datasets/{id}/stats/` | Estadísticas detalladas | Sí |
| POST | `/data/datasets/{id}/clean/` | Limpiar dataset | Sí |
| GET | `/data/datasets/{id}/download/` | Descargar dataset | Sí |
| GET | `/data/cleaned-datasets/` | Listar datasets limpios | Sí |
| GET | `/data/cleaned-datasets/{id}/` | Obtener dataset limpio | Sí |
| GET | `/data/cleaned-datasets/{id}/preview/` | Vista previa dataset limpio | Sí |
| GET | `/data/cleaned-datasets/{id}/download/` | Descargar dataset limpio | Sí |

### Ejemplos de Uso

#### 2.1 Subir Dataset
```http
POST /api/data/datasets/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: multipart/form-data

name: "Ventas 2024"
description: "Dataset de ventas del año 2024"
file: [archivo CSV]
```

**Respuesta exitosa (201):**
```json
{
    "id": 1,
    "name": "Ventas 2024",
    "description": "Dataset de ventas del año 2024",
    "file": "/media/datasets/dataset_1_Ventas_2024.csv",
    "file_url": "http://localhost:8000/media/datasets/dataset_1_Ventas_2024.csv",
    "owner": 1,
    "owner_email": "usuario@ejemplo.com",
    "file_size": 1048576,
    "rows_count": 1000,
    "columns_count": 8,
    "columns_info": {
        "fecha": {
            "dtype": "object",
            "null_count": 0,
            "unique_count": 365,
            "sample_values": ["2024-01-01", "2024-01-02", "2024-01-03"]
        },
        "ventas": {
            "dtype": "float64",
            "null_count": 5,
            "unique_count": 995,
            "sample_values": [1500.50, 2300.75, 1800.25]
        }
    },
    "null_values_count": 15,
    "duplicate_rows_count": 2,
    "data_quality_score": 98.3,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
}
```

#### 2.2 Vista Previa del Dataset
```http
GET /api/data/datasets/1/preview/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Respuesta:**
```json
{
    "columns": ["fecha", "producto", "ventas", "cantidad", "precio_unitario"],
    "data": [
        {
            "fecha": "2024-01-01",
            "producto": "Laptop",
            "ventas": 1500.50,
            "cantidad": 1,
            "precio_unitario": 1500.50
        }
    ],
    "total_rows": 1000,
    "showing_rows": 20,
    "data_types": {
        "fecha": "object",
        "ventas": "float64",
        "cantidad": "int64"
    },
    "missing_values": {
        "fecha": 0,
        "ventas": 5,
        "cantidad": 0
    },
    "basic_stats": {
        "ventas": {
            "mean": 1850.25,
            "median": 1800.00,
            "std": 450.30,
            "min": 500.00,
            "max": 5000.00
        }
    }
}
```

#### 2.3 Estadísticas Detalladas
```http
GET /api/data/datasets/1/stats/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

#### 2.4 Limpiar Dataset

**Endpoint:**
```http
POST /api/data/datasets/{id}/clean/
Authorization: Bearer {token}
Content-Type: application/json
```

---

## **📋 GUÍA COMPLETA DE LIMPIEZA DE DATOS**

### **🎯 Casos de Uso Comunes**

#### **Ejemplo 1 - Limpieza Básica (Principiantes):**
```json
{
    "null_strategy": "fill_median",
    "target_columns": [],
    "remove_duplicates": true,
    "convert_data_types": true,
    "trim_whitespace": true
}
```
**¿Qué hace?**
- ✅ Rellena valores nulos con la mediana (números) o moda (texto)
- ✅ Aplica a TODAS las columnas (target_columns vacío)
- ✅ Elimina filas duplicadas
- ✅ Convierte texto a números automáticamente
- ✅ Elimina espacios extra en textos

**Ideal para:** Limpieza general de datos antes de análisis

---

#### **Ejemplo 2 - Preparar para Machine Learning:**
```json
{
    "null_strategy": "fill_median",
    "target_columns": [],
    "remove_duplicates": true,
    "remove_outliers": true,
    "outlier_method": "iqr",
    "standardize_data": true,
    "numeric_columns": ["edad", "salario", "experiencia"],
    "convert_data_types": true,
    "trim_whitespace": true
}
```
**¿Qué hace?**
- ✅ Rellena nulos con mediana/moda
- ✅ Elimina duplicados
- ✅ Elimina valores atípicos usando IQR
- ✅ Estandariza columnas numéricas (media=0, std=1)
- ✅ Convierte tipos de datos

**Ideal para:** Entrenar modelos de Machine Learning

---

#### **Ejemplo 3 - Eliminar Filas con Nulos (Agresivo):**
```json
{
    "null_strategy": "drop",
    "target_columns": [],
    "remove_duplicates": true,
    "remove_outliers": false,
    "convert_data_types": true,
    "trim_whitespace": true
}
```
**¿Qué hace?**
- ❌ **ELIMINA** filas que tengan **cualquier valor nulo**
- ✅ Elimina duplicados
- ✅ Convierte tipos de datos

**⚠️ ADVERTENCIA:** Puede eliminar muchas filas. Úsalo solo si tienes suficientes datos.

**Ideal para:** Datasets grandes donde puedes permitirte perder filas

---

#### **Ejemplo 4 - Eliminar Nulos Solo en Columnas Específicas:**
```json
{
    "null_strategy": "drop",
    "target_columns": ["edad", "salario"],
    "remove_duplicates": true,
    "convert_data_types": true
}
```
**¿Qué hace?**
- ❌ Elimina filas solo si `edad` o `salario` tienen nulos
- ✅ Ignora nulos en otras columnas (como `departamento`, `nombre`)
- ✅ Elimina duplicados

**Ideal para:** Cuando solo ciertas columnas son críticas

---

#### **Ejemplo 5 - Rellenar con Valores Personalizados:**
```json
{
    "null_strategy": "fill_custom",
    "target_columns": [],
    "custom_fill_value": "Sin especificar",
    "custom_fill_values": {
        "nombre": "Anónimo",
        "departamento": "Sin asignar",
        "edad": 0,
        "salario": 0
    },
    "remove_duplicates": true,
    "trim_whitespace": true
}
```
**¿Qué hace?**
- ✅ Rellena `nombre` con "Anónimo"
- ✅ Rellena `departamento` con "Sin asignar"
- ✅ Rellena `edad` y `salario` con 0
- ✅ Otras columnas usan "Sin especificar"

**Ideal para:** Cuando necesitas valores específicos por columna

---

#### **Ejemplo 6 - Normalización para Visualización:**
```json
{
    "null_strategy": "fill_median",
    "target_columns": [],
    "remove_duplicates": true,
    "normalize_data": true,
    "numeric_columns": ["ventas", "cantidad", "precio"],
    "convert_data_types": true
}
```
**¿Qué hace?**
- ✅ Rellena nulos con mediana
- ✅ Normaliza valores entre 0 y 1 (MinMaxScaler)
- ✅ Solo normaliza columnas especificadas

**Ideal para:** Gráficos y visualizaciones donde necesitas escala uniforme

---

#### **Ejemplo 7 - Limpieza Conservadora (Mantener Datos):**
```json
{
    "null_strategy": "fill_mode",
    "target_columns": [],
    "remove_duplicates": false,
    "remove_outliers": false,
    "convert_data_types": false,
    "trim_whitespace": true
}
```
**¿Qué hace?**
- ✅ Rellena nulos con el valor más frecuente
- ✅ NO elimina duplicados
- ✅ NO elimina outliers
- ✅ NO convierte tipos de datos
- ✅ Solo limpia espacios

**Ideal para:** Cuando quieres preservar la mayor cantidad de datos posible

---

### **📖 REFERENCIA COMPLETA DE PARÁMETROS**

#### **1. null_strategy (OBLIGATORIO)**

Define cómo manejar valores nulos (NaN, null, vacíos):

| Estrategia | Descripción | Cuándo Usar |
|------------|-------------|-------------|
| `drop` | Elimina filas con nulos | Tienes muchos datos y puedes perder filas |
| `fill_mean` | Rellena con promedio | Columnas numéricas con distribución normal |
| `fill_median` | Rellena con mediana | Columnas numéricas con outliers |
| `fill_mode` | Rellena con valor más frecuente | Columnas categóricas (texto) |
| `fill_forward` | Copia valor anterior | Datos de series temporales |
| `fill_backward` | Copia valor siguiente | Datos de series temporales |
| `fill_interpolate` | Interpolación lineal | Series temporales numéricas |
| `fill_zero` | Rellena con 0 | Cuando 0 tiene sentido (ej: ventas) |
| `fill_custom` | Valor personalizado | Necesitas control total |

**Ejemplo:**
```json
{
    "null_strategy": "fill_median"
}
```

---

#### **2. target_columns (OPCIONAL)**

Define qué columnas se verán afectadas por la limpieza:

| Valor | Comportamiento |
|-------|----------------|
| `[]` (vacío) | Aplica a **TODAS** las columnas |
| `["col1", "col2"]` | Solo aplica a columnas especificadas |

**Ejemplos:**
```json
// Aplicar a todas las columnas
{
    "null_strategy": "drop",
    "target_columns": []
}

// Solo aplicar a edad y salario
{
    "null_strategy": "drop",
    "target_columns": ["edad", "salario"]
}
```

---

#### **3. custom_fill_value (OPCIONAL)**

Valor único para rellenar TODAS las columnas con `fill_custom`:

**Ejemplo:**
```json
{
    "null_strategy": "fill_custom",
    "custom_fill_value": "Sin datos"
}
```

---

#### **4. custom_fill_values (OPCIONAL)**

Valores específicos por columna (sobrescribe `custom_fill_value`):

**Ejemplo:**
```json
{
    "null_strategy": "fill_custom",
    "custom_fill_values": {
        "nombre": "Anónimo",
        "edad": 0,
        "departamento": "Sin asignar"
    }
}
```

---

#### **5. remove_duplicates (OPCIONAL)**

Elimina filas completamente duplicadas:

**Ejemplo:**
```json
{
    "remove_duplicates": true  // Eliminar duplicados
}
```

---

#### **6. remove_outliers (OPCIONAL)**

Elimina valores atípicos (muy altos o muy bajos):

**Ejemplo:**
```json
{
    "remove_outliers": true,
    "outlier_method": "iqr",
    "numeric_columns": ["edad", "salario"]
}
```

---

#### **7. outlier_method (OPCIONAL)**

Método para detectar outliers:

| Método | Descripción | Agresividad |
|--------|-------------|-------------|
| `iqr` | Rango Intercuartílico (Q1-Q3) | Moderada ⭐⭐⭐ |
| `zscore` | Desviación estándar (Z-score) | Alta ⭐⭐⭐⭐ |
| `isolation_forest` | Machine Learning | Muy Alta ⭐⭐⭐⭐⭐ |

**Ejemplo:**
```json
{
    "remove_outliers": true,
    "outlier_method": "iqr"
}
```

---

#### **8. normalize_data (OPCIONAL)**

Escala valores entre 0 y 1 (MinMaxScaler):

**Antes:** `[10, 50, 100]`  
**Después:** `[0.0, 0.44, 1.0]`

**Ejemplo:**
```json
{
    "normalize_data": true,
    "numeric_columns": ["edad", "salario"]
}
```

---

#### **9. standardize_data (OPCIONAL)**

Estandariza con media=0 y desviación=1 (Z-score):

**Antes:** `[10, 50, 100]`  
**Después:** `[-1.22, 0.0, 1.22]`

**Ejemplo:**
```json
{
    "standardize_data": true,
    "numeric_columns": ["edad", "salario"]
}
```

---

#### **10. numeric_columns (OPCIONAL)**

Columnas numéricas para normalizar/estandarizar/outliers:

**Ejemplo:**
```json
{
    "standardize_data": true,
    "numeric_columns": ["edad", "salario", "experiencia"]
}
```

---

#### **11. remove_empty_rows (OPCIONAL)**

Elimina filas donde **TODAS** las columnas son nulas:

**Ejemplo:**
```json
{
    "remove_empty_rows": true
}
```

---

#### **12. remove_empty_columns (OPCIONAL)**

Elimina columnas donde **TODOS** los valores son nulos:

**Ejemplo:**
```json
{
    "remove_empty_columns": true
}
```

---

#### **13. convert_data_types (OPCIONAL)**

Convierte automáticamente texto a números si es posible:

**Antes:** `["123", "456", "789"]` (texto)  
**Después:** `[123, 456, 789]` (números)

**Ejemplo:**
```json
{
    "convert_data_types": true
}
```

---

#### **14. trim_whitespace (OPCIONAL)**

Elimina espacios al inicio/final de textos:

**Antes:** `"  Juan  "`  
**Después:** `"Juan"`

**Ejemplo:**
```json
{
    "trim_whitespace": true
}
```

---

### **📊 Respuesta de Limpieza:**

```json
{
    "message": "Dataset limpiado exitosamente",
    "cleaned_dataset": {
        "id": 2,
        "name": "Empleados_limpio_1",
        "description": "Dataset limpio aplicando: Eliminar espacios en blanco, Conversión automática de tipos, Rellenar con mediana/moda, Eliminar duplicados",
        "rows_count": 148,
        "columns_count": 12,
        "rows_removed": 2,
        "null_values_filled": 15,
        "file": "/media/datasets/cleaned/cleaned_1_2.csv",
        "file_url": "http://localhost:8000/media/datasets/cleaned/cleaned_1_2.csv",
        "original_dataset": 1,
        "created_at": "2025-10-27T10:30:00Z"
    },
    "cleaning_report": {
        "methods_used": [
            "Eliminar espacios en blanco",
            "Conversión automática de tipos",
            "Rellenar con mediana/moda",
            "Eliminar duplicados"
        ],
        "null_values_filled": 15,
        "rows_removed": 2,
        "outliers_removed": 0,
        "columns_removed": 0
    }
}
```

---

### **⚠️ CONSEJOS Y MEJORES PRÁCTICAS**

#### **1. Orden de Operaciones:**
El sistema aplica limpieza en este orden:
1. Limpiar espacios (`trim_whitespace`)
2. Eliminar filas vacías (`remove_empty_rows`)
3. Eliminar columnas vacías (`remove_empty_columns`)
4. Convertir tipos (`convert_data_types`)
5. Manejar nulos (`null_strategy`)
6. Eliminar duplicados (`remove_duplicates`)
7. Eliminar outliers (`remove_outliers`)
8. Normalizar (`normalize_data`)
9. Estandarizar (`standardize_data`)

#### **2. ¿Qué estrategia de nulos usar?**
- **Datos financieros:** `fill_median` (resistente a outliers)
- **Datos categóricos:** `fill_mode` (valor más común)
- **Series temporales:** `fill_forward` o `fill_interpolate`
- **Muchos datos:** `drop` (eliminar filas)
- **Pocos datos:** `fill_median` o `fill_mode` (preservar filas)

#### **3. ¿Normalizar o Estandarizar?**
- **Normalizar (0-1):** Para redes neuronales, visualizaciones
- **Estandarizar (Z-score):** Para algoritmos como SVM, regresión lineal
- **Ninguno:** Para árboles de decisión, Random Forest

#### **4. ¿Eliminar outliers?**
- ✅ **SÍ:** Si son errores de medición
- ❌ **NO:** Si son valores legítimos importantes
- ⚠️ **CUIDADO:** Puedes perder información valiosa

#### **5. target_columns vacío vs específico:**
- **Vacío `[]`:** Más rápido, aplica a todo
- **Específico:** Más control, preserva otras columnas

---

## 3. MÓDULO DE MACHINE LEARNING

### Descripción
Sistema completo de entrenamiento de modelos ML con soporte para Random Forest, XGBoost y Neural Networks (PyTorch).

### Endpoints

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/ml/models/` | Listar modelos del usuario | Sí |
| POST | `/ml/models/train/` | Entrenar nuevo modelo | Sí |
| GET | `/ml/models/{id}/` | Obtener modelo específico | Sí |
| GET | `/ml/models/{id}/metrics/` | Métricas detalladas del modelo | Sí |
| GET | `/ml/models/dataset_info/` | Info de columnas de dataset | Sí |
| GET | `/ml/predictions/` | Listar predicciones | Sí |
| POST | `/ml/predictions/predict/` | Realizar predicción individual | Sí |
| POST | `/ml/predictions/batch_predict/` | Predicciones en lote | Sí |
| GET | `/ml/comparisons/` | Listar comparaciones | Sí |
| POST | `/ml/comparisons/` | Crear comparación | Sí |
| POST | `/ml/comparisons/{id}/compare/` | Ejecutar comparación | Sí |

### Endpoints de Predicciones de Negocio

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/ml/business-predictions/revenue_forecast/` | Predicción de ganancias futuras | Sí |
| POST | `/ml/business-predictions/promotion_impact/` | Impacto de promociones | Sí |
| POST | `/ml/business-predictions/seasonal_trends/` | Tendencias estacionales | Sí |
| POST | `/ml/business-predictions/growth_scenarios/` | Escenarios de crecimiento | Sí |
| POST | `/ml/business-predictions/quick_forecast/` | Predicción rápida | Sí |

### Ejemplos de Uso

#### 3.1 Entrenar Modelo
```http
POST /api/ml/models/train/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "dataset_type": "cleaned",
    "dataset_id": 1,
    "algorithm": "random_forest",
    "task_type": "regression",
    "target_column": "ventas",
    "feature_columns": ["cantidad", "precio_unitario", "mes", "dia_semana"],
    "test_size": 0.2,
    "validation_size": 0.2,
    "random_state": 42,
    "hyperparameters": {
        "n_estimators": 100,
        "max_depth": 10,
        "min_samples_split": 2
    }
}
```

**Algoritmos disponibles:**
- `random_forest`: Random Forest (clasificación/regresión)
- `gradient_boosting`: XGBoost (clasificación/regresión)
- `neural_network`: Red Neuronal con PyTorch

#### 3.2 Realizar Predicción
```http
POST /api/ml/predictions/predict/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "model_id": 1,
    "input_data": {
        "cantidad": 2,
        "precio_unitario": 1200.00,
        "mes": 12,
        "dia_semana": 5
    }
}
```

**Respuesta:**
```json
{
    "id": 1,
    "ml_model": 1,
    "ml_model_name": "random_forest_Ventas_2024_1642089600",
    "input_data": {
        "cantidad": 2,
        "precio_unitario": 1200.00,
        "mes": 12,
        "dia_semana": 5
    },
    "prediction_result": {
        "prediction": 2400.50
    },
    "confidence_score": 0.85,
    "prediction_time": 0.023,
    "created_at": "2024-01-15T15:30:00Z"
}
```

#### 3.3 Predicción de Ganancias Futuras
```http
POST /api/ml/business-predictions/revenue_forecast/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "ventas_historicas": [15000, 18000, 16500, 19200, 17800],
    "costos_promedio": 0.6,
    "tendencia": "creciente",
    "estacionalidad": 1.2,
    "promociones_planeadas": 2
}
```

**Respuesta:**
```json
{
    "tipo_prediccion": "revenue_forecast",
    "fecha_prediccion": "2024-01-15T15:30:00Z",
    "predicciones": {
        "7_dias": {
            "ventas_estimadas": 22560.00,
            "costos_estimados": 13536.00,
            "ganancia_neta": 9024.00,
            "margen_ganancia": 40.0
        },
        "30_dias": {
            "ventas_estimadas": 98112.50,
            "costos_estimados": 58867.50,
            "ganancia_neta": 39245.00,
            "margen_ganancia": 40.0
        },
        "90_dias": {
            "ventas_estimadas": 301250.75,
            "costos_estimados": 180750.45,
            "ganancia_neta": 120500.30,
            "margen_ganancia": 40.0
        },
        "365_dias": {
            "ventas_estimadas": 1285000.00,
            "costos_estimados": 771000.00,
            "ganancia_neta": 514000.00,
            "margen_ganancia": 40.0
        }
    },
    "factores_considerados": {
        "venta_base_semanal": 17300.0,
        "tendencia": "creciente",
        "factor_tendencia": 1.15,
        "estacionalidad": 1.2,
        "costos_promedio": 0.6,
        "promociones_planeadas": 2
    },
    "recomendaciones": [
        "Tendencia positiva: Considera invertir en marketing para acelerar el crecimiento",
        "Planifica reinversión del 15-20% de ganancias para sostener el crecimiento",
        "Excelente proyección: Considera expandir a nuevos mercados"
    ]
}
```

#### 3.4 Impacto de Promociones
```http
POST /api/ml/business-predictions/promotion_impact/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "venta_base_semanal": 10000,
    "descuento": 0.20,
    "duracion_dias": 7,
    "categoria": "electronica",
    "costos_promedio": 0.6
}
```

#### 3.5 Predicción Rápida
```http
POST /api/ml/business-predictions/quick_forecast/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
    "ganancia_semanal_actual": 5000,
    "dias_prediccion": 30,
    "factor_crecimiento": 1.1
}
```

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Error en los datos enviados |
| 401 | Unauthorized - Token de autenticación requerido |
| 403 | Forbidden - Sin permisos para acceder |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

## Autenticación

La API utiliza JWT (JSON Web Tokens) para autenticación. Incluye el token en el header:

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Duración de tokens:**
- Access Token: 60 minutos
- Refresh Token: 7 días

## Formatos de Archivo Soportados

- **Datasets**: CSV (máximo 50MB)
- **Avatares**: JPG, PNG, GIF (máximo 5MB)
- **Modelos**: Joblib (generado automáticamente)

## Límites y Restricciones

- Máximo 1000 predicciones por lote
- Datasets hasta 50MB
- Avatares hasta 5MB
- Modelos se entrenan de forma síncrona (en producción sería asíncrono)

## Tecnologías Utilizadas

- **Backend**: Django 5.2.7, Django REST Framework
- **Autenticación**: JWT con djangorestframework-simplejwt
- **Machine Learning**: scikit-learn, XGBoost, PyTorch
- **Análisis de Datos**: pandas, numpy, scipy
- **Base de Datos**: SQLite (desarrollo)
- **Archivos**: Sistema de archivos local con Django Media

## Instalación y Configuración

1. Instalar dependencias: `pip install -r requirements.txt`
2. Ejecutar migraciones: `python manage.py migrate`
3. Crear superusuario: `python manage.py createsuperuser`
4. Ejecutar servidor: `python manage.py runserver`

La API estará disponible en `http://localhost:8000/api/`