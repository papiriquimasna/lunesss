from django.db import models
from django.contrib.auth import get_user_model
import os

User = get_user_model()

def dataset_file_path(instance, filename):
    """Genera la ruta para guardar el archivo del dataset"""
    ext = filename.split('.')[-1]
    filename = f'dataset_{instance.id}_{instance.name}.{ext}'
    return os.path.join('datasets/', filename)

def cleaned_dataset_file_path(instance, filename):
    """Genera la ruta para guardar el archivo del dataset limpio"""
    ext = filename.split('.')[-1]
    filename = f'cleaned_dataset_{instance.id}_{instance.original_dataset.name}.{ext}'
    return os.path.join('datasets/cleaned/', filename)

class Dataset(models.Model):
    """Modelo para almacenar datasets originales"""
    name = models.CharField(max_length=200, help_text="Nombre del dataset")
    description = models.TextField(blank=True, null=True, help_text="Descripción del dataset")
    file = models.FileField(
        upload_to=dataset_file_path,
        help_text="Archivo CSV del dataset"
    )
    owner = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='datasets',
        help_text="Usuario propietario del dataset"
    )
    
    # Metadatos del archivo
    file_size = models.BigIntegerField(null=True, blank=True, help_text="Tamaño del archivo en bytes")
    rows_count = models.IntegerField(null=True, blank=True, help_text="Número de filas")
    columns_count = models.IntegerField(null=True, blank=True, help_text="Número de columnas")
    columns_info = models.JSONField(null=True, blank=True, help_text="Información de las columnas")
    
    # Análisis de calidad de datos
    null_values_count = models.IntegerField(null=True, blank=True, help_text="Cantidad de valores nulos")
    duplicate_rows_count = models.IntegerField(null=True, blank=True, help_text="Cantidad de filas duplicadas")
    data_quality_score = models.FloatField(null=True, blank=True, help_text="Puntuación de calidad (0-100)")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'datasets'
        verbose_name = 'Dataset'
        verbose_name_plural = 'Datasets'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.owner.email}"
    
    @property
    def file_url(self):
        """Retorna la URL del archivo"""
        if self.file and hasattr(self.file, 'url'):
            return self.file.url
        return None

class CleanedDataset(models.Model):
    """Modelo para almacenar datasets limpiados"""
    
    original_dataset = models.ForeignKey(
        Dataset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cleaned_versions',
        help_text="Dataset original"
    )
    name = models.CharField(max_length=200, help_text="Nombre del dataset limpio")
    description = models.TextField(blank=True, null=True, help_text="Descripción de la limpieza aplicada")
    file = models.FileField(
        upload_to=cleaned_dataset_file_path,
        help_text="Archivo CSV del dataset limpio"
    )
    
    # Configuración de limpieza aplicada
    cleaning_config = models.JSONField(help_text="Configuración de limpieza aplicada")
    cleaning_methods_used = models.JSONField(help_text="Métodos de limpieza utilizados")
    
    # Estadísticas del dataset limpio
    rows_count = models.IntegerField(null=True, blank=True, help_text="Número de filas después de limpieza")
    columns_count = models.IntegerField(null=True, blank=True, help_text="Número de columnas después de limpieza")
    rows_removed = models.IntegerField(null=True, blank=True, help_text="Filas eliminadas durante limpieza")
    null_values_filled = models.IntegerField(null=True, blank=True, help_text="Valores nulos rellenados")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cleaned_datasets'
        verbose_name = 'Dataset Limpio'
        verbose_name_plural = 'Datasets Limpios'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} (limpio de {self.original_dataset.name})"
    
    @property
    def file_url(self):
        """Retorna la URL del archivo limpio"""
        if self.file and hasattr(self.file, 'url'):
            return self.file.url
        return None