from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import HttpResponse
from django.core.files.base import ContentFile
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.ensemble import IsolationForest
import io
import os

from .models import Dataset, CleanedDataset
from .serializers import (
    DatasetSerializer, CleanedDatasetSerializer,
    DatasetCleaningConfigSerializer, DatasetPreviewSerializer,
    DatasetStatsSerializer
)

class DatasetViewSet(viewsets.ModelViewSet):
    """ViewSet para manejar datasets con CRUD completo"""
    
    serializer_class = DatasetSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        """Solo retorna datasets del usuario autenticado"""
        return Dataset.objects.filter(owner=self.request.user)
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Vista previa del dataset (primeras 20 filas)"""
        dataset = self.get_object()
        
        try:
            df = pd.read_csv(dataset.file.path, 
                            encoding='utf-8',
                            na_values=['', 'null', 'NULL', 'nan', 'NaN', 'N/A', 'n/a'],
                            keep_default_na=True)
            
            # Limitar a las primeras 20 filas para preview
            preview_df = df.head(20)
            
            # Reemplazar NaN con None en los datos para serialización JSON
            preview_records = preview_df.to_dict('records')
            for record in preview_records:
                for key, value in record.items():
                    if pd.isna(value):
                        record[key] = None
            
            # Preparar datos para el serializer
            preview_data = {
                'columns': df.columns.tolist(),
                'data': preview_records,
                'total_rows': len(df),
                'showing_rows': len(preview_df),
                'data_types': {col: str(dtype) for col, dtype in df.dtypes.items()},
                'missing_values': {col: int(df[col].isnull().sum()) for col in df.columns},
                'basic_stats': {}
            }
            
            # Estadísticas básicas para columnas numéricas
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            for col in numeric_columns:
                if not df[col].isnull().all():
                    # Reemplazar NaN con None para serialización JSON
                    mean_val = df[col].mean()
                    median_val = df[col].median()
                    std_val = df[col].std()
                    min_val = df[col].min()
                    max_val = df[col].max()
                    
                    preview_data['basic_stats'][col] = {
                        'mean': None if pd.isna(mean_val) else float(mean_val),
                        'median': None if pd.isna(median_val) else float(median_val),
                        'std': None if pd.isna(std_val) else float(std_val),
                        'min': None if pd.isna(min_val) else float(min_val),
                        'max': None if pd.isna(max_val) else float(max_val),
                    }
            
            serializer = DatasetPreviewSerializer(preview_data)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({
                'error': f'Error al leer el dataset: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Estadísticas detalladas del dataset"""
        dataset = self.get_object()
        
        try:
            df = pd.read_csv(dataset.file.path, 
                            encoding='utf-8',
                            na_values=['', 'null', 'NULL', 'nan', 'NaN', 'N/A', 'n/a'],
                            keep_default_na=True)
            
            # Estadísticas generales
            summary = {
                'total_rows': len(df),
                'total_columns': len(df.columns),
                'total_cells': len(df) * len(df.columns),
                'missing_cells': int(df.isnull().sum().sum()),
                'duplicate_rows': int(df.duplicated().sum()),
                'memory_usage': f"{df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB"
            }
            
            # Estadísticas numéricas
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            numeric_stats = {}
            for col in numeric_cols:
                if not df[col].isnull().all():
                    numeric_stats[col] = {
                        'count': int(df[col].count()),
                        'mean': float(df[col].mean()),
                        'median': float(df[col].median()),
                        'mode': float(df[col].mode().iloc[0]) if len(df[col].mode()) > 0 else None,
                        'std': float(df[col].std()),
                        'var': float(df[col].var()),
                        'min': float(df[col].min()),
                        'max': float(df[col].max()),
                        'q25': float(df[col].quantile(0.25)),
                        'q75': float(df[col].quantile(0.75)),
                        'skewness': float(df[col].skew()),
                        'kurtosis': float(df[col].kurtosis())
                    }
            
            # Estadísticas categóricas
            categorical_cols = df.select_dtypes(include=['object', 'category']).columns
            categorical_stats = {}
            for col in categorical_cols:
                if not df[col].isnull().all():
                    value_counts = df[col].value_counts()
                    categorical_stats[col] = {
                        'count': int(df[col].count()),
                        'unique': int(df[col].nunique()),
                        'top_value': str(value_counts.index[0]) if len(value_counts) > 0 else None,
                        'top_freq': int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
                        'value_counts': value_counts.head(10).to_dict()
                    }
            
            # Reporte de datos faltantes
            missing_data_report = {}
            for col in df.columns:
                missing_count = int(df[col].isnull().sum())
                missing_data_report[col] = {
                    'missing_count': missing_count,
                    'missing_percentage': round((missing_count / len(df)) * 100, 2)
                }
            
            # Matriz de correlación (solo para columnas numéricas)
            correlation_matrix = {}
            if len(numeric_cols) > 1:
                corr_matrix = df[numeric_cols].corr()
                correlation_matrix = corr_matrix.to_dict()
            
            stats_data = {
                'summary': summary,
                'numeric_stats': numeric_stats,
                'categorical_stats': categorical_stats,
                'missing_data_report': missing_data_report,
                'correlation_matrix': correlation_matrix
            }
            
            serializer = DatasetStatsSerializer(stats_data)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({
                'error': f'Error al calcular estadísticas: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def clean(self, request, pk=None):
        """Limpiar dataset con configuración personalizada"""
        dataset = self.get_object()
        
        # Validar configuración de limpieza
        config_serializer = DatasetCleaningConfigSerializer(data=request.data)
        if not config_serializer.is_valid():
            return Response(config_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        config = config_serializer.validated_data
        
        try:
            # Leer el dataset original
            df = pd.read_csv(dataset.file.path, 
                            encoding='utf-8',
                            na_values=['', 'null', 'NULL', 'nan', 'NaN', 'N/A', 'n/a'],
                            keep_default_na=True)
            original_rows = len(df)
            
            # Aplicar limpieza según configuración
            cleaned_df, cleaning_report = self._apply_cleaning(df, config)
            
            # Crear archivo CSV limpio
            csv_buffer = io.StringIO()
            cleaned_df.to_csv(csv_buffer, index=False)
            csv_content = csv_buffer.getvalue()
            
            # Crear nombre para el dataset limpio
            cleaned_name = f"{dataset.name}_limpio_{len(dataset.cleaned_versions.all()) + 1}"
            
            # Crear registro de dataset limpio
            cleaned_dataset = CleanedDataset.objects.create(
                original_dataset=dataset,
                name=cleaned_name,
                description=f"Dataset limpio aplicando: {', '.join(cleaning_report['methods_used'])}",
                cleaning_config=config,
                cleaning_methods_used=cleaning_report['methods_used'],
                rows_count=len(cleaned_df),
                columns_count=len(cleaned_df.columns),
                rows_removed=original_rows - len(cleaned_df),
                null_values_filled=cleaning_report.get('null_values_filled', 0)
            )
            
            # Guardar archivo CSV
            file_name = f"cleaned_{dataset.id}_{cleaned_dataset.id}.csv"
            cleaned_dataset.file.save(
                file_name,
                ContentFile(csv_content.encode('utf-8')),
                save=True
            )
            
            # Serializar respuesta
            serializer = CleanedDatasetSerializer(cleaned_dataset)
            
            return Response({
                'message': 'Dataset limpiado exitosamente',
                'cleaned_dataset': serializer.data,
                'cleaning_report': cleaning_report
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': f'Error al limpiar el dataset: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _apply_cleaning(self, df, config):
        """Aplica las técnicas de limpieza al dataframe"""
        cleaning_report = {
            'methods_used': [],
            'null_values_filled': 0,
            'rows_removed': 0,
            'outliers_removed': 0,
            'columns_removed': 0
        }
        
        original_rows = len(df)
        original_cols = len(df.columns)
        
        # 1. Limpiar espacios en blanco
        if config.get('trim_whitespace', True):
            string_cols = df.select_dtypes(include=['object']).columns
            for col in string_cols:
                # Solo aplicar strip a valores no nulos
                df[col] = df[col].apply(lambda x: x.strip() if isinstance(x, str) else x)
            cleaning_report['methods_used'].append('Eliminar espacios en blanco')
        
        # 2. Eliminar filas completamente vacías
        if config.get('remove_empty_rows', False):
            df = df.dropna(how='all')
            cleaning_report['methods_used'].append('Eliminar filas vacías')
        
        # 3. Eliminar columnas completamente vacías
        if config.get('remove_empty_columns', False):
            df = df.dropna(axis=1, how='all')
            cleaning_report['columns_removed'] = original_cols - len(df.columns)
            cleaning_report['methods_used'].append('Eliminar columnas vacías')
        
        # 4. Convertir tipos de datos
        if config.get('convert_data_types', False):
            for col in df.columns:
                # Intentar convertir a numérico si es posible
                if df[col].dtype == 'object':
                    # Primero intentar conversión sin coerce para ver si es numérico
                    converted = pd.to_numeric(df[col], errors='coerce')
                    # Solo aplicar si al menos el 50% de valores no nulos son números válidos
                    non_null_original = df[col].notna().sum()
                    non_null_converted = converted.notna().sum()
                    if non_null_converted >= (non_null_original * 0.5):
                        df[col] = converted
            cleaning_report['methods_used'].append('Conversión automática de tipos')
        
        # 5. Manejar valores nulos
        null_strategy = config['null_strategy']
        target_columns = config.get('target_columns', [])
        
        # Si target_columns está vacío, aplicar a todas las columnas
        if not target_columns or len(target_columns) == 0:
            target_columns = df.columns.tolist()
        
        if null_strategy == 'drop':
            df = df.dropna(subset=target_columns)
            cleaning_report['methods_used'].append('Eliminar filas con valores nulos')
            
        elif null_strategy == 'fill_mean':
            numeric_cols = df[target_columns].select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                null_count = df[col].isnull().sum()
                df[col].fillna(df[col].mean(), inplace=True)
                cleaning_report['null_values_filled'] += null_count
            cleaning_report['methods_used'].append('Rellenar con media')
            
        elif null_strategy == 'fill_median':
            for col in target_columns:
                if col in df.columns:
                    null_count_before = df[col].isnull().sum()
                    if null_count_before > 0:
                        # Para columnas numéricas, usar mediana
                        if pd.api.types.is_numeric_dtype(df[col]):
                            median_value = df[col].median()
                            if pd.notna(median_value):
                                df[col] = df[col].fillna(median_value)
                                cleaning_report['null_values_filled'] += null_count_before
                        # Para columnas de texto, usar moda
                        else:
                            mode_value = df[col].mode()
                            if len(mode_value) > 0 and pd.notna(mode_value[0]):
                                df[col] = df[col].fillna(mode_value[0])
                                cleaning_report['null_values_filled'] += null_count_before
            cleaning_report['methods_used'].append('Rellenar con mediana/moda')
            
        elif null_strategy == 'fill_mode':
            for col in target_columns:
                if col in df.columns:
                    null_count = df[col].isnull().sum()
                    mode_value = df[col].mode()
                    if len(mode_value) > 0:
                        df[col].fillna(mode_value[0], inplace=True)
                        cleaning_report['null_values_filled'] += null_count
            cleaning_report['methods_used'].append('Rellenar con moda')
            
        elif null_strategy == 'fill_forward':
            for col in target_columns:
                if col in df.columns:
                    null_count = df[col].isnull().sum()
                    df[col].fillna(method='ffill', inplace=True)
                    cleaning_report['null_values_filled'] += null_count
            cleaning_report['methods_used'].append('Rellenar hacia adelante')
            
        elif null_strategy == 'fill_backward':
            for col in target_columns:
                if col in df.columns:
                    null_count = df[col].isnull().sum()
                    df[col].fillna(method='bfill', inplace=True)
                    cleaning_report['null_values_filled'] += null_count
            cleaning_report['methods_used'].append('Rellenar hacia atrás')
            
        elif null_strategy == 'fill_interpolate':
            numeric_cols = df[target_columns].select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                null_count = df[col].isnull().sum()
                df[col].interpolate(inplace=True)
                cleaning_report['null_values_filled'] += null_count
            cleaning_report['methods_used'].append('Interpolación lineal')
            
        elif null_strategy == 'fill_zero':
            for col in target_columns:
                if col in df.columns:
                    null_count = df[col].isnull().sum()
                    df[col].fillna(0, inplace=True)
                    cleaning_report['null_values_filled'] += null_count
            cleaning_report['methods_used'].append('Rellenar con cero')
            
        elif null_strategy == 'fill_custom':
            custom_value = config.get('custom_fill_value', '')
            custom_values_by_column = config.get('custom_fill_values', {})
            
            for col in target_columns:
                if col in df.columns:
                    null_count = df[col].isnull().sum()
                    if null_count > 0:
                        # Si hay valor específico para esta columna, usarlo
                        if col in custom_values_by_column:
                            fill_value = custom_values_by_column[col]
                        else:
                            # Sino, usar el valor general
                            fill_value = custom_value
                        
                        df[col].fillna(fill_value, inplace=True)
                        cleaning_report['null_values_filled'] += null_count
            cleaning_report['methods_used'].append(f'Rellenar con valor personalizado: {custom_value}')
        
        # 6. Eliminar duplicados
        if config.get('remove_duplicates', False):
            before_dedup = len(df)
            df = df.drop_duplicates()
            duplicates_removed = before_dedup - len(df)
            cleaning_report['rows_removed'] += duplicates_removed
            cleaning_report['methods_used'].append('Eliminar duplicados')
        
        # 7. Eliminar valores atípicos
        if config.get('remove_outliers', False):
            numeric_columns = config.get('numeric_columns', df.select_dtypes(include=[np.number]).columns.tolist())
            outlier_method = config.get('outlier_method', 'iqr')
            
            before_outliers = len(df)
            
            if outlier_method == 'iqr':
                for col in numeric_columns:
                    if col in df.columns and df[col].dtype in [np.number]:
                        Q1 = df[col].quantile(0.25)
                        Q3 = df[col].quantile(0.75)
                        IQR = Q3 - Q1
                        lower_bound = Q1 - 1.5 * IQR
                        upper_bound = Q3 + 1.5 * IQR
                        df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]
                        
            elif outlier_method == 'zscore':
                for col in numeric_columns:
                    if col in df.columns and df[col].dtype in [np.number]:
                        z_scores = np.abs(stats.zscore(df[col].dropna()))
                        df = df[z_scores < 3]
                        
            elif outlier_method == 'isolation_forest':
                if len(numeric_columns) > 0:
                    numeric_data = df[numeric_columns].select_dtypes(include=[np.number])
                    if not numeric_data.empty:
                        iso_forest = IsolationForest(contamination=0.1, random_state=42)
                        outliers = iso_forest.fit_predict(numeric_data.fillna(0))
                        df = df[outliers == 1]
            
            outliers_removed = before_outliers - len(df)
            cleaning_report['outliers_removed'] = outliers_removed
            cleaning_report['rows_removed'] += outliers_removed
            cleaning_report['methods_used'].append(f'Eliminar valores atípicos ({outlier_method})')
        
        # 8. Normalización
        if config.get('normalize_data', False):
            numeric_columns = config.get('numeric_columns', df.select_dtypes(include=[np.number]).columns.tolist())
            scaler = MinMaxScaler()
            for col in numeric_columns:
                if col in df.columns and df[col].dtype in [np.number]:
                    df[col] = scaler.fit_transform(df[[col]])
            cleaning_report['methods_used'].append('Normalización (0-1)')
        
        # 9. Estandarización
        if config.get('standardize_data', False):
            numeric_columns = config.get('numeric_columns', df.select_dtypes(include=[np.number]).columns.tolist())
            scaler = StandardScaler()
            for col in numeric_columns:
                if col in df.columns and df[col].dtype in [np.number]:
                    df[col] = scaler.fit_transform(df[[col]])
            cleaning_report['methods_used'].append('Estandarización (Z-score)')
        
        # Calcular filas eliminadas totales
        cleaning_report['rows_removed'] = original_rows - len(df)
        
        # VERIFICACIÓN FINAL: Reemplazar cualquier NaN restante con valores por defecto
        # Esto evita errores de serialización JSON
        for col in df.columns:
            if df[col].isnull().any():
                if pd.api.types.is_numeric_dtype(df[col]):
                    # Para columnas numéricas, usar la mediana si está disponible, sino 0
                    fill_value = df[col].median() if df[col].notna().any() else 0
                    df[col] = df[col].fillna(fill_value)
                else:
                    # Para columnas de texto, usar la moda si está disponible, sino string vacío
                    mode_values = df[col].mode()
                    fill_value = mode_values[0] if len(mode_values) > 0 and pd.notna(mode_values[0]) else 'N/A'
                    df[col] = df[col].fillna(fill_value)
        
        return df, cleaning_report
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Descargar dataset original"""
        dataset = self.get_object()
        
        try:
            response = HttpResponse(
                dataset.file.read(),
                content_type='text/csv'
            )
            response['Content-Disposition'] = f'attachment; filename="{dataset.name}.csv"'
            return response
        except Exception as e:
            return Response({
                'error': f'Error al descargar el archivo: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

class CleanedDatasetViewSet(viewsets.ModelViewSet):
    """ViewSet para manejar datasets limpios con CRUD completo"""
    
    serializer_class = CleanedDatasetSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Solo retorna datasets limpios del usuario autenticado (incluyendo huérfanos)"""
        from django.db.models import Q
        return CleanedDataset.objects.filter(
            Q(original_dataset__owner=self.request.user) | 
            Q(original_dataset__isnull=True)
        )
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Vista previa del dataset limpio"""
        cleaned_dataset = self.get_object()
        
        try:
            df = pd.read_csv(cleaned_dataset.file.path, 
                            encoding='utf-8',
                            na_values=['', 'null', 'NULL', 'nan', 'NaN', 'N/A', 'n/a'],
                            keep_default_na=True)
            
            # Limitar a las primeras 20 filas para preview
            preview_df = df.head(20)
            
            # Reemplazar NaN con None en los datos para serialización JSON
            preview_records = preview_df.to_dict('records')
            for record in preview_records:
                for key, value in record.items():
                    if pd.isna(value):
                        record[key] = None
            
            preview_data = {
                'columns': df.columns.tolist(),
                'data': preview_records,
                'total_rows': len(df),
                'showing_rows': len(preview_df),
                'data_types': {col: str(dtype) for col, dtype in df.dtypes.items()},
                'missing_values': {col: int(df[col].isnull().sum()) for col in df.columns},
                'basic_stats': {}
            }
            
            # Estadísticas básicas para columnas numéricas
            numeric_columns = df.select_dtypes(include=[np.number]).columns
            for col in numeric_columns:
                if not df[col].isnull().all():
                    # Reemplazar NaN con None para serialización JSON
                    mean_val = df[col].mean()
                    median_val = df[col].median()
                    std_val = df[col].std()
                    min_val = df[col].min()
                    max_val = df[col].max()
                    
                    preview_data['basic_stats'][col] = {
                        'mean': None if pd.isna(mean_val) else float(mean_val),
                        'median': None if pd.isna(median_val) else float(median_val),
                        'std': None if pd.isna(std_val) else float(std_val),
                        'min': None if pd.isna(min_val) else float(min_val),
                        'max': None if pd.isna(max_val) else float(max_val),
                    }
            
            serializer = DatasetPreviewSerializer(preview_data)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({
                'error': f'Error al leer el dataset limpio: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Descargar dataset limpio"""
        cleaned_dataset = self.get_object()
        
        try:
            response = HttpResponse(
                cleaned_dataset.file.read(),
                content_type='text/csv'
            )
            response['Content-Disposition'] = f'attachment; filename="{cleaned_dataset.name}.csv"'
            return response
        except Exception as e:
            return Response({
                'error': f'Error al descargar el archivo: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)