from rest_framework import serializers
from .models import MLModel, Prediction, ModelComparison
from datasets.models import Dataset, CleanedDataset
import pandas as pd

class MLModelSerializer(serializers.ModelSerializer):
    owner_email = serializers.CharField(source='owner.email', read_only=True)
    dataset_name = serializers.SerializerMethodField()
    model_file_url = serializers.ReadOnlyField()
    best_metric = serializers.ReadOnlyField()
    
    class Meta:
        model = MLModel
        fields = [
            'id', 'name', 'description', 'owner', 'owner_email',
            'original_dataset', 'cleaned_dataset', 'dataset_name',
            'algorithm', 'task_type', 'target_column', 'feature_columns',
            'hyperparameters', 'model_file', 'model_file_url',
            'training_metrics', 'validation_metrics', 'test_metrics',
            'training_time', 'training_samples', 'validation_samples', 'test_samples',
            'feature_importance', 'status', 'error_message', 'best_metric',
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'owner', 'model_file', 'training_metrics', 'validation_metrics',
            'test_metrics', 'training_time', 'training_samples', 'validation_samples',
            'test_samples', 'feature_importance', 'status', 'error_message',
            'created_at', 'updated_at', 'completed_at'
        ]
    
    def get_dataset_name(self, obj):
        """Obtiene el nombre del dataset utilizado"""
        if obj.cleaned_dataset:
            return f"{obj.cleaned_dataset.name} (limpio)"
        elif obj.original_dataset:
            return f"{obj.original_dataset.name} (original)"
        return None
    
    def validate(self, data):
        """Validaciones personalizadas"""
        # Debe tener al menos un dataset
        if not data.get('original_dataset') and not data.get('cleaned_dataset'):
            raise serializers.ValidationError(
                "Debe seleccionar un dataset original o limpio."
            )
        
        # No puede tener ambos datasets
        if data.get('original_dataset') and data.get('cleaned_dataset'):
            raise serializers.ValidationError(
                "Solo puede seleccionar un dataset (original o limpio), no ambos."
            )
        
        return data
    
    def create(self, validated_data):
        # Asignar el usuario autenticado como owner
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)

class MLTrainingConfigSerializer(serializers.Serializer):
    """Serializer para configuración de entrenamiento"""
    
    # Dataset a utilizar
    dataset_type = serializers.ChoiceField(
        choices=[('original', 'Dataset Original'), ('cleaned', 'Dataset Limpio')],
        help_text="Tipo de dataset a utilizar"
    )
    dataset_id = serializers.IntegerField(help_text="ID del dataset a utilizar")
    
    # Configuración del modelo
    algorithm = serializers.ChoiceField(
        choices=MLModel.ALGORITHM_CHOICES,
        help_text="Algoritmo de ML a utilizar"
    )
    task_type = serializers.ChoiceField(
        choices=MLModel.TASK_TYPE_CHOICES,
        help_text="Tipo de tarea (clasificación o regresión)"
    )
    target_column = serializers.CharField(
        max_length=100,
        help_text="Columna objetivo para predecir"
    )
    feature_columns = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False,
        help_text="Columnas a utilizar como características"
    )
    
    # División de datos
    test_size = serializers.FloatField(
        default=0.2,
        min_value=0.1,
        max_value=0.5,
        help_text="Proporción del conjunto de prueba (0.1-0.5)"
    )
    validation_size = serializers.FloatField(
        default=0.2,
        min_value=0.1,
        max_value=0.5,
        help_text="Proporción del conjunto de validación (0.1-0.5)"
    )
    random_state = serializers.IntegerField(
        default=42,
        help_text="Semilla aleatoria para reproducibilidad"
    )
    
    # Hiperparámetros específicos por algoritmo
    hyperparameters = serializers.DictField(
        required=False,
        allow_empty=True,
        help_text="Hiperparámetros específicos del algoritmo"
    )
    
    def validate(self, data):
        """Validaciones personalizadas"""
        # Validar que test_size + validation_size < 1
        if data['test_size'] + data['validation_size'] >= 0.9:
            raise serializers.ValidationError(
                "La suma de test_size y validation_size debe ser menor a 0.9"
            )
        
        # Validar que el dataset existe
        dataset_type = data['dataset_type']
        dataset_id = data['dataset_id']
        
        try:
            if dataset_type == 'original':
                Dataset.objects.get(id=dataset_id)
            else:
                CleanedDataset.objects.get(id=dataset_id)
        except (Dataset.DoesNotExist, CleanedDataset.DoesNotExist):
            raise serializers.ValidationError(
                f"El dataset {dataset_type} con ID {dataset_id} no existe."
            )
        
        return data

class PredictionSerializer(serializers.ModelSerializer):
    ml_model_name = serializers.CharField(source='ml_model.name', read_only=True)
    
    class Meta:
        model = Prediction
        fields = [
            'id', 'ml_model', 'ml_model_name', 'input_data',
            'prediction_result', 'confidence_score', 'prediction_time',
            'created_at'
        ]
        read_only_fields = [
            'id', 'prediction_result', 'confidence_score', 'prediction_time',
            'created_at'
        ]

class PredictionRequestSerializer(serializers.Serializer):
    """Serializer para solicitudes de predicción"""
    
    model_id = serializers.IntegerField(help_text="ID del modelo a utilizar")
    input_data = serializers.DictField(
        help_text="Datos de entrada para la predicción"
    )
    
    def validate_model_id(self, value):
        """Validar que el modelo existe y está completado"""
        try:
            model = MLModel.objects.get(id=value)
            if model.status != 'completed':
                raise serializers.ValidationError(
                    "El modelo debe estar completamente entrenado para hacer predicciones."
                )
            return value
        except MLModel.DoesNotExist:
            raise serializers.ValidationError("El modelo especificado no existe.")

class BatchPredictionSerializer(serializers.Serializer):
    """Serializer para predicciones en lote"""
    
    model_id = serializers.IntegerField(help_text="ID del modelo a utilizar")
    input_data_list = serializers.ListField(
        child=serializers.DictField(),
        help_text="Lista de datos de entrada para predicciones múltiples"
    )
    
    def validate_model_id(self, value):
        """Validar que el modelo existe y está completado"""
        try:
            model = MLModel.objects.get(id=value)
            if model.status != 'completed':
                raise serializers.ValidationError(
                    "El modelo debe estar completamente entrenado para hacer predicciones."
                )
            return value
        except MLModel.DoesNotExist:
            raise serializers.ValidationError("El modelo especificado no existe.")
    
    def validate_input_data_list(self, value):
        """Validar que no haya demasiadas predicciones"""
        if len(value) > 1000:
            raise serializers.ValidationError(
                "Máximo 1000 predicciones por lote."
            )
        return value

class ModelComparisonSerializer(serializers.ModelSerializer):
    owner_email = serializers.CharField(source='owner.email', read_only=True)
    models_count = serializers.SerializerMethodField()
    best_accuracy_model_name = serializers.CharField(source='best_accuracy_model.name', read_only=True)
    best_f1_model_name = serializers.CharField(source='best_f1_model.name', read_only=True)
    best_overall_model_name = serializers.CharField(source='best_overall_model.name', read_only=True)
    
    class Meta:
        model = ModelComparison
        fields = [
            'id', 'name', 'description', 'owner', 'owner_email',
            'models_to_compare', 'models_count', 'comparison_results',
            'best_accuracy_model', 'best_accuracy_model_name',
            'best_f1_model', 'best_f1_model_name',
            'best_overall_model', 'best_overall_model_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'owner', 'comparison_results',
            'best_accuracy_model', 'best_f1_model', 'best_overall_model',
            'created_at', 'updated_at'
        ]
    
    def get_models_count(self, obj):
        """Obtiene el número de modelos en la comparación"""
        return obj.models_to_compare.count()
    
    def create(self, validated_data):
        # Asignar el usuario autenticado como owner
        validated_data['owner'] = self.context['request'].user
        models_to_compare = validated_data.pop('models_to_compare', [])
        
        comparison = super().create(validated_data)
        comparison.models_to_compare.set(models_to_compare)
        
        return comparison

class DatasetColumnsSerializer(serializers.Serializer):
    """Serializer para obtener información de columnas de un dataset"""
    
    columns = serializers.ListField(child=serializers.CharField())
    numeric_columns = serializers.ListField(child=serializers.CharField())
    categorical_columns = serializers.ListField(child=serializers.CharField())
    column_info = serializers.DictField()
    sample_data = serializers.ListField(child=serializers.DictField())

class ModelMetricsSerializer(serializers.Serializer):
    """Serializer para métricas detalladas del modelo"""
    
    training_metrics = serializers.DictField()
    validation_metrics = serializers.DictField()
    test_metrics = serializers.DictField()
    feature_importance = serializers.DictField()
    confusion_matrix = serializers.ListField(
        child=serializers.ListField(child=serializers.IntegerField()),
        required=False
    )
    learning_curves = serializers.DictField(required=False)