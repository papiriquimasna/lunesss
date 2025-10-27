from rest_framework import serializers
from .models import Dataset, CleanedDataset
import pandas as pd
import numpy as np
import os

class DatasetSerializer(serializers.ModelSerializer):
    file_url = serializers.ReadOnlyField()
    owner_email = serializers.CharField(source='owner.email', read_only=True)
    
    class Meta:
        model = Dataset
        fields = [
            'id', 'name', 'description', 'file', 'file_url', 'owner', 'owner_email',
            'file_size', 'rows_count', 'columns_count', 'columns_info',
            'null_values_count', 'duplicate_rows_count', 'data_quality_score',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'owner', 'file_size', 'rows_count', 'columns_count', 'columns_info',
            'null_values_count', 'duplicate_rows_count', 'data_quality_score',
            'created_at', 'updated_at'
        ]
    
    def validate_file(self, value):
        """Validar que el archivo sea CSV"""
        if not value.name.lower().endswith('.csv'):
            raise serializers.ValidationError("Solo se permiten archivos CSV.")
        
        # Validar tamaño (máximo 50MB)
        if value.size > 50 * 1024 * 1024:
            raise serializers.ValidationError("El archivo es muy grande. Máximo 50MB.")
        
        return value
    
    def create(self, validated_data):
        # Asignar el usuario autenticado como owner
        validated_data['owner'] = self.context['request'].user
        dataset = super().create(validated_data)
        
        # Analizar el archivo CSV después de crearlo
        self._analyze_dataset(dataset)
        
        return dataset
    
    def _analyze_dataset(self, dataset):
        """Analiza el dataset y actualiza los metadatos"""
        try:
            # Leer el archivo CSV
            df = pd.read_csv(dataset.file.path)
            
            # Actualizar metadatos básicos
            dataset.file_size = os.path.getsize(dataset.file.path)
            dataset.rows_count = len(df)
            dataset.columns_count = len(df.columns)
            
            # Información de columnas
            columns_info = {}
            for col in df.columns:
                columns_info[col] = {
                    'dtype': str(df[col].dtype),
                    'null_count': int(df[col].isnull().sum()),
                    'unique_count': int(df[col].nunique()),
                    'sample_values': df[col].dropna().head(3).tolist()
                }
            
            dataset.columns_info = columns_info
            dataset.null_values_count = int(df.isnull().sum().sum())
            dataset.duplicate_rows_count = int(df.duplicated().sum())
            
            # Calcular puntuación de calidad
            total_cells = dataset.rows_count * dataset.columns_count
            null_percentage = (dataset.null_values_count / total_cells) * 100 if total_cells > 0 else 0
            duplicate_percentage = (dataset.duplicate_rows_count / dataset.rows_count) * 100 if dataset.rows_count > 0 else 0
            
            # Puntuación simple: 100 - porcentaje de problemas
            dataset.data_quality_score = max(0, 100 - null_percentage - duplicate_percentage)
            
            dataset.save()
            
        except Exception as e:
            # Si hay error en el análisis, al menos guardar el tamaño del archivo
            dataset.file_size = os.path.getsize(dataset.file.path)
            dataset.save()

class CleanedDatasetSerializer(serializers.ModelSerializer):
    file_url = serializers.ReadOnlyField()
    original_dataset_name = serializers.SerializerMethodField()
    
    def get_original_dataset_name(self, obj):
        """Retorna el nombre del dataset original o 'Huérfano' si no existe"""
        if obj.original_dataset:
            return obj.original_dataset.name
        return "Dataset Original Eliminado"
    
    class Meta:
        model = CleanedDataset
        fields = [
            'id', 'original_dataset', 'original_dataset_name', 'name', 'description',
            'file', 'file_url', 'cleaning_config', 'cleaning_methods_used',
            'rows_count', 'columns_count', 'rows_removed', 'null_values_filled',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'file', 'rows_count', 'columns_count', 'rows_removed',
            'null_values_filled', 'created_at', 'updated_at'
        ]

class DatasetCleaningConfigSerializer(serializers.Serializer):
    """Serializer para configuración de limpieza de datos"""
    
    # Opciones para valores nulos
    null_strategy = serializers.ChoiceField(
        choices=[
            ('drop', 'Eliminar filas con valores nulos'),
            ('fill_mean', 'Rellenar con media (solo columnas numéricas)'),
            ('fill_median', 'Rellenar con mediana (solo columnas numéricas)'),
            ('fill_mode', 'Rellenar con moda (más frecuente)'),
            ('fill_forward', 'Rellenar hacia adelante (usar valor anterior)'),
            ('fill_backward', 'Rellenar hacia atrás (usar valor siguiente)'),
            ('fill_interpolate', 'Interpolación lineal (solo columnas numéricas)'),
            ('fill_zero', 'Rellenar con cero'),
            ('fill_custom', 'Valor personalizado'),
        ],
        required=True,
        help_text="Estrategia para manejar valores nulos"
    )
    
    # Valor personalizado para rellenar (si se elige fill_custom)
    custom_fill_value = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text="Valor personalizado para rellenar (requerido si se elige 'fill_custom')"
    )
    
    # Columnas específicas para aplicar la estrategia (si está vacío, se aplica a todas)
    target_columns = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        help_text="Columnas específicas para aplicar la limpieza (vacío = todas las columnas)"
    )
    
    # Opciones adicionales
    remove_duplicates = serializers.BooleanField(
        default=False,
        help_text="Eliminar filas duplicadas"
    )
    
    remove_outliers = serializers.BooleanField(
        default=False,
        help_text="Eliminar valores atípicos (outliers)"
    )
    
    outlier_method = serializers.ChoiceField(
        choices=[
            ('iqr', 'Método IQR (Rango Intercuartílico) - Recomendado'),
            ('zscore', 'Z-Score (3 desviaciones estándar)'),
            ('isolation_forest', 'Isolation Forest (Machine Learning)'),
        ],
        required=False,
        default='iqr',
        help_text="Método para detectar valores atípicos"
    )
    
    # Normalización/Estandarización
    normalize_data = serializers.BooleanField(
        default=False,
        help_text="Normalizar datos (escalar entre 0 y 1)"
    )
    
    standardize_data = serializers.BooleanField(
        default=False,
        help_text="Estandarizar datos (media=0, desviación=1)"
    )
    
    # Columnas numéricas para normalizar/estandarizar
    numeric_columns = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        help_text="Columnas numéricas para normalizar/estandarizar (vacío = todas las numéricas)"
    )
    
    # Opciones avanzadas
    remove_empty_rows = serializers.BooleanField(
        default=False,
        help_text="Eliminar filas completamente vacías"
    )
    
    remove_empty_columns = serializers.BooleanField(
        default=False,
        help_text="Eliminar columnas completamente vacías"
    )
    
    convert_data_types = serializers.BooleanField(
        default=False,
        help_text="Intentar convertir tipos de datos automáticamente"
    )
    
    trim_whitespace = serializers.BooleanField(
        default=True,
        help_text="Eliminar espacios en blanco al inicio y final de strings"
    )
    
    def validate(self, data):
        """Validaciones personalizadas"""
        if data.get('null_strategy') == 'fill_custom' and not data.get('custom_fill_value'):
            raise serializers.ValidationError({
                'custom_fill_value': 'Debe proporcionar un valor personalizado cuando selecciona "fill_custom".'
            })
        
        if data.get('remove_outliers') and not data.get('outlier_method'):
            raise serializers.ValidationError({
                'outlier_method': 'Debe seleccionar un método para eliminar valores atípicos.'
            })
        
        if data.get('normalize_data') and data.get('standardize_data'):
            raise serializers.ValidationError(
                'No puede normalizar y estandarizar al mismo tiempo. Elija solo una opción.'
            )
        
        return data

class DatasetPreviewSerializer(serializers.Serializer):
    """Serializer para vista previa de datasets"""
    
    columns = serializers.ListField(child=serializers.CharField())
    data = serializers.ListField(child=serializers.DictField())
    total_rows = serializers.IntegerField()
    showing_rows = serializers.IntegerField()
    data_types = serializers.DictField()
    missing_values = serializers.DictField()
    basic_stats = serializers.DictField()
    
class DatasetStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas detalladas del dataset"""
    
    summary = serializers.DictField()
    numeric_stats = serializers.DictField()
    categorical_stats = serializers.DictField()
    missing_data_report = serializers.DictField()
    correlation_matrix = serializers.DictField(required=False)