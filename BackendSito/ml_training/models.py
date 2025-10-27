from django.db import models
from django.contrib.auth import get_user_model
from datasets.models import Dataset, CleanedDataset
import os

User = get_user_model()

def model_file_path(instance, filename):
    """Genera la ruta para guardar el modelo entrenado"""
    ext = filename.split('.')[-1]
    filename = f'model_{instance.id}_{instance.name}.{ext}'
    return os.path.join('ml_models/', filename)

class MLModel(models.Model):
    """Modelo para almacenar modelos de ML entrenados"""
    
    ALGORITHM_CHOICES = [
        ('random_forest', 'Random Forest'),
        ('neural_network', 'Neural Network (PyTorch)'),
        ('gradient_boosting', 'Gradient Boosting (XGBoost)'),
    ]
    
    TASK_TYPE_CHOICES = [
        ('classification', 'Clasificación'),
        ('regression', 'Regresión'),
    ]
    
    STATUS_CHOICES = [
        ('training', 'Entrenando'),
        ('completed', 'Completado'),
        ('failed', 'Fallido'),
    ]
    
    # Información básica
    name = models.CharField(max_length=200, help_text="Nombre del modelo")
    description = models.TextField(blank=True, null=True, help_text="Descripción del modelo")
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ml_models',
        help_text="Usuario propietario del modelo"
    )
    
    # Dataset utilizado
    original_dataset = models.ForeignKey(
        Dataset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ml_models_original',
        help_text="Dataset original utilizado"
    )
    cleaned_dataset = models.ForeignKey(
        CleanedDataset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ml_models_cleaned',
        help_text="Dataset limpio utilizado"
    )
    
    # Configuración del modelo
    algorithm = models.CharField(
        max_length=20,
        choices=ALGORITHM_CHOICES,
        help_text="Algoritmo de ML utilizado"
    )
    task_type = models.CharField(
        max_length=15,
        choices=TASK_TYPE_CHOICES,
        help_text="Tipo de tarea (clasificación o regresión)"
    )
    target_column = models.CharField(
        max_length=100,
        help_text="Columna objetivo (target) para predecir"
    )
    feature_columns = models.JSONField(
        help_text="Columnas utilizadas como features"
    )
    
    # Hiperparámetros
    hyperparameters = models.JSONField(
        null=True,
        blank=True,
        help_text="Hiperparámetros del modelo"
    )
    
    # Archivo del modelo entrenado
    model_file = models.FileField(
        upload_to=model_file_path,
        null=True,
        blank=True,
        help_text="Archivo del modelo entrenado"
    )
    
    # Métricas de rendimiento
    training_metrics = models.JSONField(
        null=True,
        blank=True,
        help_text="Métricas del conjunto de entrenamiento"
    )
    validation_metrics = models.JSONField(
        null=True,
        blank=True,
        help_text="Métricas del conjunto de validación"
    )
    test_metrics = models.JSONField(
        null=True,
        blank=True,
        help_text="Métricas del conjunto de prueba"
    )
    
    # Información del entrenamiento
    training_time = models.FloatField(
        null=True,
        blank=True,
        help_text="Tiempo de entrenamiento en segundos"
    )
    training_samples = models.IntegerField(
        null=True,
        blank=True,
        help_text="Número de muestras de entrenamiento"
    )
    validation_samples = models.IntegerField(
        null=True,
        blank=True,
        help_text="Número de muestras de validación"
    )
    test_samples = models.IntegerField(
        null=True,
        blank=True,
        help_text="Número de muestras de prueba"
    )
    
    # Feature importance (para modelos que lo soporten)
    feature_importance = models.JSONField(
        null=True,
        blank=True,
        help_text="Importancia de las características"
    )
    
    # Estado y timestamps
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='training',
        help_text="Estado del entrenamiento"
    )
    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Mensaje de error si el entrenamiento falló"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha y hora de finalización del entrenamiento"
    )
    
    class Meta:
        db_table = 'ml_models'
        verbose_name = 'Modelo ML'
        verbose_name_plural = 'Modelos ML'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_algorithm_display()}) - {self.owner.email}"
    
    @property
    def dataset_used(self):
        """Retorna el dataset utilizado (limpio o original)"""
        if self.cleaned_dataset:
            return self.cleaned_dataset
        return self.original_dataset
    
    @property
    def model_file_url(self):
        """Retorna la URL del archivo del modelo"""
        if self.model_file and hasattr(self.model_file, 'url'):
            return self.model_file.url
        return None
    
    @property
    def best_metric(self):
        """Retorna la mejor métrica según el tipo de tarea"""
        if not self.test_metrics:
            return None
        
        if self.task_type == 'classification':
            return self.test_metrics.get('f1_score', self.test_metrics.get('accuracy'))
        else:  # regression
            return self.test_metrics.get('r2_score', self.test_metrics.get('mse'))

class Prediction(models.Model):
    """Modelo para almacenar predicciones realizadas"""
    
    ml_model = models.ForeignKey(
        MLModel,
        on_delete=models.CASCADE,
        related_name='predictions',
        help_text="Modelo utilizado para la predicción"
    )
    
    # Datos de entrada
    input_data = models.JSONField(help_text="Datos de entrada para la predicción")
    
    # Resultado de la predicción
    prediction_result = models.JSONField(help_text="Resultado de la predicción")
    confidence_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Puntuación de confianza de la predicción"
    )
    
    # Metadatos
    prediction_time = models.FloatField(
        null=True,
        blank=True,
        help_text="Tiempo de predicción en segundos"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ml_predictions'
        verbose_name = 'Predicción'
        verbose_name_plural = 'Predicciones'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Predicción {self.id} - {self.ml_model.name}"

class ModelComparison(models.Model):
    """Modelo para comparar diferentes modelos ML"""
    
    name = models.CharField(max_length=200, help_text="Nombre de la comparación")
    description = models.TextField(blank=True, null=True, help_text="Descripción de la comparación")
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='model_comparisons',
        help_text="Usuario propietario de la comparación"
    )
    
    # Modelos a comparar
    models_to_compare = models.ManyToManyField(
        MLModel,
        related_name='comparisons',
        help_text="Modelos incluidos en la comparación"
    )
    
    # Resultados de la comparación
    comparison_results = models.JSONField(
        null=True,
        blank=True,
        help_text="Resultados detallados de la comparación"
    )
    
    # Mejor modelo según diferentes métricas
    best_accuracy_model = models.ForeignKey(
        MLModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='best_accuracy_comparisons',
        help_text="Modelo con mejor accuracy"
    )
    best_f1_model = models.ForeignKey(
        MLModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='best_f1_comparisons',
        help_text="Modelo con mejor F1-score"
    )
    best_overall_model = models.ForeignKey(
        MLModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='best_overall_comparisons',
        help_text="Mejor modelo general"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ml_model_comparisons'
        verbose_name = 'Comparación de Modelos'
        verbose_name_plural = 'Comparaciones de Modelos'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.owner.email}"