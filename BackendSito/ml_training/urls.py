from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router para los ViewSets
router = DefaultRouter()
router.register(r'models', views.MLModelViewSet, basename='ml-models')
router.register(r'predictions', views.PredictionViewSet, basename='predictions')
router.register(r'comparisons', views.ModelComparisonViewSet, basename='model-comparisons')
router.register(r'business-predictions', views.BusinessPredictionViewSet, basename='business-predictions')

urlpatterns = [
    # Incluir todas las rutas del router
    path('', include(router.urls)),
]