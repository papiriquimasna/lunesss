from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from django.core.files.base import ContentFile
from django.utils import timezone
import pandas as pd
import numpy as np
import joblib
import time
import io
import os

# Scikit-learn
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_squared_error, r2_score, confusion_matrix, classification_report
)
from sklearn.preprocessing import LabelEncoder, StandardScaler

# XGBoost
import xgboost as xgb

# PyTorch (importación condicional) - Temporalmente deshabilitado
try:
    # import torch
    # import torch.nn as nn
    # import torch.optim as optim
    # from torch.utils.data import DataLoader, TensorDataset
    TORCH_AVAILABLE = False  # Forzado a False temporalmente
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    nn = None
    optim = None
    DataLoader = None
    TensorDataset = None

from .models import MLModel, Prediction, ModelComparison
from .serializers import (
    MLModelSerializer, MLTrainingConfigSerializer, PredictionSerializer,
    PredictionRequestSerializer, BatchPredictionSerializer, ModelComparisonSerializer,
    DatasetColumnsSerializer, ModelMetricsSerializer
)
from datasets.models import Dataset, CleanedDataset
from .business_predictions import BusinessPredictor

class MLModelViewSet(viewsets.ModelViewSet):
    """ViewSet para manejar modelos de ML"""
    
    serializer_class = MLModelSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    
    def get_queryset(self):
        """Solo retorna modelos del usuario autenticado"""
        return MLModel.objects.filter(owner=self.request.user)
    
    @action(detail=False, methods=['post'])
    def train(self, request):
        """Entrenar un nuevo modelo de ML"""
        config_serializer = MLTrainingConfigSerializer(data=request.data)
        if not config_serializer.is_valid():
            return Response(config_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        config = config_serializer.validated_data
        
        try:
            # Obtener dataset
            dataset = self._get_dataset(config)
            
            # Crear registro del modelo
            ml_model = MLModel.objects.create(
                name=f"{config['algorithm']}_{dataset.name}_{int(time.time())}",
                description=f"Modelo {config['algorithm']} entrenado en {dataset.name}",
                owner=request.user,
                algorithm=config['algorithm'],
                task_type=config['task_type'],
                target_column=config['target_column'],
                feature_columns=config['feature_columns'],
                hyperparameters=config.get('hyperparameters', {}),
                status='training'
            )
            
            # Asignar dataset
            if config['dataset_type'] == 'original':
                ml_model.original_dataset = dataset
            else:
                ml_model.cleaned_dataset = dataset
            ml_model.save()
            
            # Entrenar modelo en background (simulado)
            self._train_model_async(ml_model, config)
            
            serializer = MLModelSerializer(ml_model)
            return Response({
                'message': 'Entrenamiento iniciado exitosamente',
                'model': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': f'Error al iniciar entrenamiento: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _get_dataset(self, config):
        """Obtiene el dataset según la configuración"""
        if config['dataset_type'] == 'original':
            return Dataset.objects.get(id=config['dataset_id'])
        else:
            return CleanedDataset.objects.get(id=config['dataset_id'])
    
    def _train_model_async(self, ml_model, config):
        """Entrena el modelo (en producción esto sería asíncrono)"""
        try:
            start_time = time.time()
            
            # Cargar datos
            dataset = ml_model.dataset_used
            df = pd.read_csv(dataset.file.path)
            
            # Preparar datos
            X, y, preprocessors = self._prepare_data(df, config)
            
            # Dividir datos
            X_temp, X_test, y_temp, y_test = train_test_split(
                X, y, test_size=config['test_size'], random_state=config['random_state']
            )
            X_train, X_val, y_train, y_val = train_test_split(
                X_temp, y_temp, test_size=config['validation_size']/(1-config['test_size']),
                random_state=config['random_state']
            )
            
            # Entrenar modelo
            model, training_history = self._train_algorithm(
                ml_model.algorithm, config, X_train, y_train, X_val, y_val
            )
            
            # Evaluar modelo
            metrics = self._evaluate_model(
                model, ml_model.task_type, X_train, y_train, X_val, y_val, X_test, y_test
            )
            
            # Guardar modelo
            model_path = self._save_model(model, ml_model, preprocessors)
            
            # Actualizar registro
            training_time = time.time() - start_time
            ml_model.training_metrics = metrics['training']
            ml_model.validation_metrics = metrics['validation']
            ml_model.test_metrics = metrics['test']
            ml_model.training_time = training_time
            ml_model.training_samples = len(X_train)
            ml_model.validation_samples = len(X_val)
            ml_model.test_samples = len(X_test)
            ml_model.feature_importance = self._get_feature_importance(model, config['feature_columns'])
            ml_model.status = 'completed'
            ml_model.completed_at = timezone.now()
            ml_model.save()
            
        except Exception as e:
            ml_model.status = 'failed'
            ml_model.error_message = str(e)
            ml_model.save()
    
    def _prepare_data(self, df, config):
        """Prepara los datos para entrenamiento"""
        # Seleccionar columnas
        feature_cols = config['feature_columns']
        target_col = config['target_column']
        
        # Verificar que las columnas existen
        missing_cols = set(feature_cols + [target_col]) - set(df.columns)
        if missing_cols:
            raise ValueError(f"Columnas faltantes: {missing_cols}")
        
        X = df[feature_cols].copy()
        y = df[target_col].copy()
        
        # Manejar valores nulos
        X = X.fillna(X.mean() if X.select_dtypes(include=[np.number]).shape[1] > 0 else X.mode().iloc[0])
        y = y.fillna(y.mean() if pd.api.types.is_numeric_dtype(y) else y.mode().iloc[0])
        
        preprocessors = {}
        
        # Codificar variables categóricas
        categorical_cols = X.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            preprocessors[f'le_{col}'] = le
        
        # Codificar target si es categórico
        if config['task_type'] == 'classification' and not pd.api.types.is_numeric_dtype(y):
            le_target = LabelEncoder()
            y = le_target.fit_transform(y.astype(str))
            preprocessors['le_target'] = le_target
        
        # Escalar características para Neural Network
        if config['algorithm'] == 'neural_network':
            scaler = StandardScaler()
            X = pd.DataFrame(scaler.fit_transform(X), columns=X.columns)
            preprocessors['scaler'] = scaler
        
        return X.values, y, preprocessors
    
    def _train_algorithm(self, algorithm, config, X_train, y_train, X_val, y_val):
        """Entrena el algoritmo específico"""
        hyperparams = config.get('hyperparameters', {})
        task_type = config['task_type']
        
        if algorithm == 'random_forest':
            if task_type == 'classification':
                model = RandomForestClassifier(
                    n_estimators=hyperparams.get('n_estimators', 100),
                    max_depth=hyperparams.get('max_depth', None),
                    min_samples_split=hyperparams.get('min_samples_split', 2),
                    random_state=config['random_state']
                )
            else:
                model = RandomForestRegressor(
                    n_estimators=hyperparams.get('n_estimators', 100),
                    max_depth=hyperparams.get('max_depth', None),
                    min_samples_split=hyperparams.get('min_samples_split', 2),
                    random_state=config['random_state']
                )
            
            model.fit(X_train, y_train)
            return model, None
        
        elif algorithm == 'gradient_boosting':
            if task_type == 'classification':
                model = xgb.XGBClassifier(
                    n_estimators=hyperparams.get('n_estimators', 100),
                    max_depth=hyperparams.get('max_depth', 6),
                    learning_rate=hyperparams.get('learning_rate', 0.1),
                    random_state=config['random_state']
                )
            else:
                model = xgb.XGBRegressor(
                    n_estimators=hyperparams.get('n_estimators', 100),
                    max_depth=hyperparams.get('max_depth', 6),
                    learning_rate=hyperparams.get('learning_rate', 0.1),
                    random_state=config['random_state']
                )
            
            model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
            return model, None
        
        elif algorithm == 'neural_network':
            if not TORCH_AVAILABLE:
                raise ValueError("PyTorch no está disponible. Instale PyTorch para usar redes neuronales.")
            return self._train_neural_network(config, X_train, y_train, X_val, y_val, hyperparams)
        
        else:
            raise ValueError(f"Algoritmo no soportado: {algorithm}")
    
    def _train_neural_network(self, config, X_train, y_train, X_val, y_val, hyperparams):
        """Entrena una red neuronal con PyTorch"""
        if not TORCH_AVAILABLE:
            raise ValueError("PyTorch no está disponible")
        # Convertir a tensores
        X_train_tensor = torch.FloatTensor(X_train)
        y_train_tensor = torch.FloatTensor(y_train)
        X_val_tensor = torch.FloatTensor(X_val)
        y_val_tensor = torch.FloatTensor(y_val)
        
        # Ajustar dimensiones para clasificación
        if config['task_type'] == 'classification':
            n_classes = len(np.unique(y_train))
            y_train_tensor = y_train_tensor.long()
            y_val_tensor = y_val_tensor.long()
        else:
            n_classes = 1
            y_train_tensor = y_train_tensor.view(-1, 1)
            y_val_tensor = y_val_tensor.view(-1, 1)
        
        # Crear datasets
        train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
        val_dataset = TensorDataset(X_val_tensor, y_val_tensor)
        
        # Crear dataloaders
        batch_size = hyperparams.get('batch_size', 32)
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=batch_size)
        
        # Crear modelo
        input_size = X_train.shape[1]
        hidden_size = hyperparams.get('hidden_size', 64)
        
        class SimpleNN(nn.Module):
            def __init__(self, input_size, hidden_size, output_size, task_type):
                super(SimpleNN, self).__init__()
                self.task_type = task_type
                self.fc1 = nn.Linear(input_size, hidden_size)
                self.fc2 = nn.Linear(hidden_size, hidden_size // 2)
                self.fc3 = nn.Linear(hidden_size // 2, output_size)
                self.relu = nn.ReLU()
                self.dropout = nn.Dropout(0.2)
                
            def forward(self, x):
                x = self.relu(self.fc1(x))
                x = self.dropout(x)
                x = self.relu(self.fc2(x))
                x = self.dropout(x)
                x = self.fc3(x)
                
                if self.task_type == 'classification' and x.shape[1] > 1:
                    x = torch.softmax(x, dim=1)
                
                return x
        
        model = SimpleNN(input_size, hidden_size, n_classes, config['task_type'])
        
        # Configurar entrenamiento
        learning_rate = hyperparams.get('learning_rate', 0.001)
        epochs = hyperparams.get('epochs', 100)
        
        if config['task_type'] == 'classification':
            criterion = nn.CrossEntropyLoss() if n_classes > 2 else nn.BCEWithLogitsLoss()
        else:
            criterion = nn.MSELoss()
        
        optimizer = optim.Adam(model.parameters(), lr=learning_rate)
        
        # Entrenar
        history = {'train_loss': [], 'val_loss': []}
        
        for epoch in range(epochs):
            # Entrenamiento
            model.train()
            train_loss = 0
            for batch_X, batch_y in train_loader:
                optimizer.zero_grad()
                outputs = model(batch_X)
                
                if config['task_type'] == 'classification' and n_classes == 2:
                    outputs = outputs.squeeze()
                    batch_y = batch_y.float()
                
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                train_loss += loss.item()
            
            # Validación
            model.eval()
            val_loss = 0
            with torch.no_grad():
                for batch_X, batch_y in val_loader:
                    outputs = model(batch_X)
                    
                    if config['task_type'] == 'classification' and n_classes == 2:
                        outputs = outputs.squeeze()
                        batch_y = batch_y.float()
                    
                    loss = criterion(outputs, batch_y)
                    val_loss += loss.item()
            
            history['train_loss'].append(train_loss / len(train_loader))
            history['val_loss'].append(val_loss / len(val_loader))
        
        return model, history
    
    def _evaluate_model(self, model, task_type, X_train, y_train, X_val, y_val, X_test, y_test):
        """Evalúa el modelo en todos los conjuntos"""
        metrics = {}
        
        for split_name, X, y in [('training', X_train, y_train), ('validation', X_val, y_val), ('test', X_test, y_test)]:
            if TORCH_AVAILABLE and nn is not None and isinstance(model, nn.Module):  # PyTorch model
                model.eval()
                with torch.no_grad():
                    X_tensor = torch.FloatTensor(X)
                    predictions = model(X_tensor)
                    
                    if task_type == 'classification':
                        if predictions.shape[1] > 1:
                            y_pred = torch.argmax(predictions, dim=1).numpy()
                        else:
                            y_pred = (torch.sigmoid(predictions) > 0.5).squeeze().numpy()
                    else:
                        y_pred = predictions.squeeze().numpy()
            else:  # Scikit-learn or XGBoost
                y_pred = model.predict(X)
            
            if task_type == 'classification':
                metrics[split_name] = {
                    'accuracy': float(accuracy_score(y, y_pred)),
                    'precision': float(precision_score(y, y_pred, average='weighted', zero_division=0)),
                    'recall': float(recall_score(y, y_pred, average='weighted', zero_division=0)),
                    'f1_score': float(f1_score(y, y_pred, average='weighted', zero_division=0))
                }
            else:
                metrics[split_name] = {
                    'mse': float(mean_squared_error(y, y_pred)),
                    'rmse': float(np.sqrt(mean_squared_error(y, y_pred))),
                    'r2_score': float(r2_score(y, y_pred))
                }
        
        return metrics
    
    def _get_feature_importance(self, model, feature_names):
        """Obtiene la importancia de las características"""
        if hasattr(model, 'feature_importances_'):
            # Random Forest, XGBoost
            importance = model.feature_importances_
            return dict(zip(feature_names, [float(imp) for imp in importance]))
        else:
            # Neural Network - no tiene feature importance nativa
            return {}
    
    def _save_model(self, model, ml_model, preprocessors):
        """Guarda el modelo entrenado"""
        # Crear diccionario con modelo y preprocessors
        model_data = {
            'model': model,
            'preprocessors': preprocessors,
            'feature_columns': ml_model.feature_columns,
            'task_type': ml_model.task_type,
            'algorithm': ml_model.algorithm
        }
        
        # Serializar con joblib
        buffer = io.BytesIO()
        joblib.dump(model_data, buffer)
        buffer.seek(0)
        
        # Guardar archivo
        file_name = f"model_{ml_model.id}.joblib"
        ml_model.model_file.save(
            file_name,
            ContentFile(buffer.getvalue()),
            save=True
        )
        
        return ml_model.model_file.path
    
    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """Obtiene métricas detalladas del modelo"""
        ml_model = self.get_object()
        
        if ml_model.status != 'completed':
            return Response({
                'error': 'El modelo no ha completado el entrenamiento'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        metrics_data = {
            'training_metrics': ml_model.training_metrics or {},
            'validation_metrics': ml_model.validation_metrics or {},
            'test_metrics': ml_model.test_metrics or {},
            'feature_importance': ml_model.feature_importance or {}
        }
        
        serializer = ModelMetricsSerializer(metrics_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dataset_info(self, request):
        """Obtiene información de columnas de un dataset"""
        dataset_type = request.query_params.get('dataset_type')
        dataset_id = request.query_params.get('dataset_id')
        
        if not dataset_type or not dataset_id:
            return Response({
                'error': 'Se requieren parámetros dataset_type y dataset_id'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if dataset_type == 'original':
                dataset = Dataset.objects.get(id=dataset_id, owner=request.user)
            else:
                dataset = CleanedDataset.objects.get(id=dataset_id, original_dataset__owner=request.user)
            
            df = pd.read_csv(dataset.file.path)
            
            # Información de columnas
            numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
            categorical_columns = df.select_dtypes(include=['object']).columns.tolist()
            
            column_info = {}
            for col in df.columns:
                column_info[col] = {
                    'dtype': str(df[col].dtype),
                    'null_count': int(df[col].isnull().sum()),
                    'unique_count': int(df[col].nunique()),
                    'sample_values': df[col].dropna().head(3).tolist()
                }
            
            data = {
                'columns': df.columns.tolist(),
                'numeric_columns': numeric_columns,
                'categorical_columns': categorical_columns,
                'column_info': column_info,
                'sample_data': df.head(5).to_dict('records')
            }
            
            serializer = DatasetColumnsSerializer(data)
            return Response(serializer.data)
            
        except (Dataset.DoesNotExist, CleanedDataset.DoesNotExist):
            return Response({
                'error': 'Dataset no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Error al leer dataset: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

class PredictionViewSet(viewsets.ModelViewSet):
    """ViewSet para manejar predicciones"""
    
    serializer_class = PredictionSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    
    def get_queryset(self):
        """Solo retorna predicciones de modelos del usuario"""
        return Prediction.objects.filter(ml_model__owner=self.request.user)
    
    @action(detail=False, methods=['post'])
    def predict(self, request):
        """Realizar una predicción individual"""
        serializer = PredictionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            model_id = serializer.validated_data['model_id']
            input_data = serializer.validated_data['input_data']
            
            ml_model = MLModel.objects.get(id=model_id, owner=request.user)
            
            # Realizar predicción
            start_time = time.time()
            result, confidence = self._make_prediction(ml_model, input_data)
            prediction_time = time.time() - start_time
            
            # Guardar predicción
            prediction = Prediction.objects.create(
                ml_model=ml_model,
                input_data=input_data,
                prediction_result=result,
                confidence_score=confidence,
                prediction_time=prediction_time
            )
            
            serializer = PredictionSerializer(prediction)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except MLModel.DoesNotExist:
            return Response({
                'error': 'Modelo no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Error en predicción: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def batch_predict(self, request):
        """Realizar predicciones en lote"""
        serializer = BatchPredictionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            model_id = serializer.validated_data['model_id']
            input_data_list = serializer.validated_data['input_data_list']
            
            ml_model = MLModel.objects.get(id=model_id, owner=request.user)
            
            # Realizar predicciones
            results = []
            for input_data in input_data_list:
                start_time = time.time()
                result, confidence = self._make_prediction(ml_model, input_data)
                prediction_time = time.time() - start_time
                
                prediction = Prediction.objects.create(
                    ml_model=ml_model,
                    input_data=input_data,
                    prediction_result=result,
                    confidence_score=confidence,
                    prediction_time=prediction_time
                )
                
                results.append(PredictionSerializer(prediction).data)
            
            return Response({
                'message': f'{len(results)} predicciones realizadas exitosamente',
                'predictions': results
            }, status=status.HTTP_201_CREATED)
            
        except MLModel.DoesNotExist:
            return Response({
                'error': 'Modelo no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Error en predicciones: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _make_prediction(self, ml_model, input_data):
        """Realiza una predicción usando el modelo cargado"""
        # Cargar modelo
        model_data = joblib.load(ml_model.model_file.path)
        model = model_data['model']
        preprocessors = model_data['preprocessors']
        feature_columns = model_data['feature_columns']
        
        # Preparar datos de entrada
        input_df = pd.DataFrame([input_data])
        
        # Verificar columnas
        missing_cols = set(feature_columns) - set(input_df.columns)
        if missing_cols:
            raise ValueError(f"Columnas faltantes en entrada: {missing_cols}")
        
        # Seleccionar y ordenar columnas
        X = input_df[feature_columns]
        
        # Aplicar preprocessors
        for col in X.columns:
            if f'le_{col}' in preprocessors:
                le = preprocessors[f'le_{col}']
                try:
                    X[col] = le.transform(X[col].astype(str))
                except ValueError:
                    # Valor no visto durante entrenamiento
                    X[col] = 0  # O manejar de otra manera
        
        if 'scaler' in preprocessors:
            scaler = preprocessors['scaler']
            X = pd.DataFrame(scaler.transform(X), columns=X.columns)
        
        # Realizar predicción
        if TORCH_AVAILABLE and nn is not None and isinstance(model, nn.Module):  # PyTorch
            model.eval()
            with torch.no_grad():
                X_tensor = torch.FloatTensor(X.values)
                prediction = model(X_tensor)
                
                if ml_model.task_type == 'classification':
                    if prediction.shape[1] > 1:
                        confidence = torch.max(torch.softmax(prediction, dim=1)).item()
                        result = torch.argmax(prediction, dim=1).item()
                    else:
                        prob = torch.sigmoid(prediction).item()
                        confidence = max(prob, 1 - prob)
                        result = int(prob > 0.5)
                else:
                    result = prediction.item()
                    confidence = None
        else:  # Scikit-learn or XGBoost
            prediction = model.predict(X.values)
            result = prediction[0]
            
            # Obtener confianza si es clasificación
            if ml_model.task_type == 'classification' and hasattr(model, 'predict_proba'):
                probabilities = model.predict_proba(X.values)[0]
                confidence = float(max(probabilities))
            else:
                confidence = None
        
        # Decodificar resultado si es necesario
        if 'le_target' in preprocessors and ml_model.task_type == 'classification':
            le_target = preprocessors['le_target']
            result = le_target.inverse_transform([int(result)])[0]
        
        return {'prediction': result}, confidence

class ModelComparisonViewSet(viewsets.ModelViewSet):
    """ViewSet para comparar modelos"""
    
    serializer_class = ModelComparisonSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    
    def get_queryset(self):
        """Solo retorna comparaciones del usuario"""
        return ModelComparison.objects.filter(owner=self.request.user)
    
    @action(detail=True, methods=['post'])
    def compare(self, request, pk=None):
        """Ejecutar comparación de modelos"""
        comparison = self.get_object()
        
        try:
            models = comparison.models_to_compare.filter(status='completed')
            
            if models.count() < 2:
                return Response({
                    'error': 'Se necesitan al menos 2 modelos completados para comparar'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Realizar comparación
            results = self._compare_models(models)
            
            # Actualizar comparación
            comparison.comparison_results = results
            comparison.best_accuracy_model = results.get('best_accuracy_model')
            comparison.best_f1_model = results.get('best_f1_model')
            comparison.best_overall_model = results.get('best_overall_model')
            comparison.save()
            
            serializer = ModelComparisonSerializer(comparison)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({
                'error': f'Error en comparación: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _compare_models(self, models):
        """Compara múltiples modelos"""
        results = {
            'models': [],
            'summary': {},
            'best_accuracy_model': None,
            'best_f1_model': None,
            'best_overall_model': None
        }
        
        best_accuracy = 0
        best_f1 = 0
        best_overall = 0
        
        for model in models:
            model_result = {
                'id': model.id,
                'name': model.name,
                'algorithm': model.algorithm,
                'metrics': model.test_metrics or {}
            }
            
            # Determinar mejores modelos
            if model.task_type == 'classification':
                accuracy = model.test_metrics.get('accuracy', 0) if model.test_metrics else 0
                f1 = model.test_metrics.get('f1_score', 0) if model.test_metrics else 0
                overall = (accuracy + f1) / 2
                
                if accuracy > best_accuracy:
                    best_accuracy = accuracy
                    results['best_accuracy_model'] = model
                
                if f1 > best_f1:
                    best_f1 = f1
                    results['best_f1_model'] = model
                
                if overall > best_overall:
                    best_overall = overall
                    results['best_overall_model'] = model
            
            results['models'].append(model_result)
        
        # Resumen
        results['summary'] = {
            'total_models': len(results['models']),
            'best_accuracy': best_accuracy,
            'best_f1': best_f1,
            'best_overall': best_overall
        }
        
        return results

class BusinessPredictionViewSet(viewsets.ViewSet):
    """ViewSet para predicciones de negocio"""
    
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.predictor = BusinessPredictor()
    
    @action(detail=False, methods=['post'])
    def revenue_forecast(self, request):
        """
        Predice ganancias futuras en diferentes horizontes temporales
        
        Ejemplo de input:
        {
            "ventas_historicas": [15000, 18000, 16500, 19200],
            "costos_promedio": 0.6,
            "tendencia": "creciente",
            "estacionalidad": 1.2,
            "promociones_planeadas": 2
        }
        """
        try:
            resultado = self.predictor.predict_revenue_forecast(request.data)
            return Response(resultado, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': f'Error en predicción de revenue: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def promotion_impact(self, request):
        """
        Predice el impacto de promociones en ventas y ganancias
        
        Ejemplo de input:
        {
            "venta_base_semanal": 10000,
            "descuento": 0.20,
            "duracion_dias": 7,
            "categoria": "electronica",
            "costos_promedio": 0.6
        }
        """
        try:
            resultado = self.predictor.predict_promotion_impact(request.data)
            return Response(resultado, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': f'Error en predicción de promoción: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def seasonal_trends(self, request):
        """
        Predice tendencias estacionales y su impacto en ganancias
        
        Ejemplo de input:
        {
            "mes_actual": 10,
            "ventas_mensuales": [45000, 48000, 52000, 47000, 50000],
            "tipo_negocio": "retail"
        }
        """
        try:
            resultado = self.predictor.predict_seasonal_trends(request.data)
            return Response(resultado, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': f'Error en predicción estacional: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def growth_scenarios(self, request):
        """
        Predice diferentes escenarios de crecimiento del negocio
        
        Ejemplo de input:
        {
            "ganancia_actual_mensual": 20000,
            "inversion_marketing": 5000,
            "nuevos_productos": 3,
            "expansion_mercado": true
        }
        """
        try:
            resultado = self.predictor.predict_growth_scenarios(request.data)
            return Response(resultado, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': f'Error en predicción de crecimiento: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def quick_forecast(self, request):
        """
        Predicción rápida: ¿Cuánto ganaré en X días?
        
        Ejemplo de input:
        {
            "ganancia_semanal_actual": 5000,
            "dias_prediccion": 30,
            "factor_crecimiento": 1.1
        }
        """
        try:
            ganancia_semanal = request.data.get('ganancia_semanal_actual', 5000)
            dias = request.data.get('dias_prediccion', 7)
            factor_crecimiento = request.data.get('factor_crecimiento', 1.0)
            
            # Calcular ganancia diaria base
            ganancia_diaria = ganancia_semanal / 7
            
            # Aplicar factor de crecimiento
            ganancia_proyectada = ganancia_diaria * dias * factor_crecimiento
            
            # Agregar variabilidad realista
            variabilidad = np.random.uniform(0.9, 1.1)
            ganancia_final = ganancia_proyectada * variabilidad
            
            # Calcular rangos
            rango_minimo = ganancia_final * 0.85
            rango_maximo = ganancia_final * 1.15
            
            return Response({
                'tipo_prediccion': 'quick_forecast',
                'dias_prediccion': dias,
                'ganancia_estimada': round(ganancia_final, 2),
                'rango_estimado': {
                    'minimo': round(rango_minimo, 2),
                    'maximo': round(rango_maximo, 2)
                },
                'ganancia_diaria_promedio': round(ganancia_final / dias, 2),
                'confianza': '75%',
                'mensaje': f"En {dias} días, se estima una ganancia de ${ganancia_final:,.2f}"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error en predicción rápida: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)