from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router para los ViewSets
router = DefaultRouter()
router.register(r'datasets', views.DatasetViewSet, basename='datasets')
router.register(r'cleaned-datasets', views.CleanedDatasetViewSet, basename='cleaned-datasets')

urlpatterns = [
    # Incluir todas las rutas del router
    path('', include(router.urls)),
]