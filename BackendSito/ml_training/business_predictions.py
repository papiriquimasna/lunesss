"""
Sistema de Predicciones de Negocio
Predicciones financieras y comerciales con horizontes temporales
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import joblib
from typing import Dict, List, Any

class BusinessPredictor:
    """Clase para predicciones de negocio"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
    
    def predict_revenue_forecast(self, input_data: Dict) -> Dict:
        """
        Predice ganancias futuras en diferentes horizontes temporales
        """
        # Datos de entrada
        ventas_historicas = input_data.get('ventas_historicas', [])
        costos_promedio = input_data.get('costos_promedio', 0.6)  # 60% de costos
        tendencia = input_data.get('tendencia', 'estable')  # creciente, estable, decreciente
        estacionalidad = input_data.get('estacionalidad', 1.0)
        promociones_planeadas = input_data.get('promociones_planeadas', 0)
        
        # Calcular ventas base
        if ventas_historicas:
            venta_base = np.mean(ventas_historicas[-4:])  # Promedio últimas 4 semanas
        else:
            venta_base = input_data.get('venta_base_semanal', 10000)
        
        # Factores de tendencia
        tendencia_factors = {
            'creciente': 1.15,
            'estable': 1.0,
            'decreciente': 0.85
        }
        
        factor_tendencia = tendencia_factors.get(tendencia, 1.0)
        
        # Predicciones por horizonte temporal
        predicciones = {}
        
        # 7 días (1 semana)
        venta_7d = venta_base * factor_tendencia * estacionalidad
        if promociones_planeadas > 0:
            venta_7d *= (1 + promociones_planeadas * 0.2)  # 20% boost por promoción
        
        ganancia_7d = venta_7d * (1 - costos_promedio)
        
        predicciones['7_dias'] = {
            'ventas_estimadas': round(venta_7d, 2),
            'costos_estimados': round(venta_7d * costos_promedio, 2),
            'ganancia_neta': round(ganancia_7d, 2),
            'margen_ganancia': round((1 - costos_promedio) * 100, 1)
        }
        
        # 30 días (1 mes)
        venta_30d = venta_7d * 4.3 * (1 + np.random.uniform(-0.1, 0.15))  # Variabilidad mensual
        ganancia_30d = venta_30d * (1 - costos_promedio)
        
        predicciones['30_dias'] = {
            'ventas_estimadas': round(venta_30d, 2),
            'costos_estimados': round(venta_30d * costos_promedio, 2),
            'ganancia_neta': round(ganancia_30d, 2),
            'margen_ganancia': round((1 - costos_promedio) * 100, 1)
        }
        
        # 90 días (3 meses)
        venta_90d = venta_30d * 3 * (1 + np.random.uniform(-0.05, 0.2))
        ganancia_90d = venta_90d * (1 - costos_promedio)
        
        predicciones['90_dias'] = {
            'ventas_estimadas': round(venta_90d, 2),
            'costos_estimados': round(venta_90d * costos_promedio, 2),
            'ganancia_neta': round(ganancia_90d, 2),
            'margen_ganancia': round((1 - costos_promedio) * 100, 1)
        }
        
        # 365 días (1 año)
        venta_365d = venta_30d * 12 * factor_tendencia * (1 + np.random.uniform(0, 0.3))
        ganancia_365d = venta_365d * (1 - costos_promedio)
        
        predicciones['365_dias'] = {
            'ventas_estimadas': round(venta_365d, 2),
            'costos_estimados': round(venta_365d * costos_promedio, 2),
            'ganancia_neta': round(ganancia_365d, 2),
            'margen_ganancia': round((1 - costos_promedio) * 100, 1)
        }
        
        return {
            'tipo_prediccion': 'revenue_forecast',
            'fecha_prediccion': datetime.now().isoformat(),
            'predicciones': predicciones,
            'factores_considerados': {
                'venta_base_semanal': venta_base,
                'tendencia': tendencia,
                'factor_tendencia': factor_tendencia,
                'estacionalidad': estacionalidad,
                'costos_promedio': costos_promedio,
                'promociones_planeadas': promociones_planeadas
            },
            'recomendaciones': self._generate_revenue_recommendations(predicciones, tendencia)
        }
    
    def predict_promotion_impact(self, input_data: Dict) -> Dict:
        """
        Predice el impacto de promociones en ventas y ganancias
        """
        venta_base = input_data.get('venta_base_semanal', 10000)
        descuento = input_data.get('descuento', 0.15)
        duracion_dias = input_data.get('duracion_dias', 7)
        categoria = input_data.get('categoria', 'general')
        costos = input_data.get('costos_promedio', 0.6)
        
        # Factores de impacto por categoría
        categoria_factors = {
            'electronica': 1.8,
            'ropa': 1.5,
            'hogar': 1.3,
            'deportes': 1.6,
            'general': 1.4
        }
        
        factor_categoria = categoria_factors.get(categoria, 1.4)
        
        # Calcular impacto
        factor_descuento = 1 + (descuento * factor_categoria)
        factor_duracion = min(1 + (duracion_dias - 7) * 0.05, 2.0)  # Max 2x boost
        
        venta_con_promocion = venta_base * factor_descuento * factor_duracion
        venta_sin_promocion = venta_base
        
        # Ajustar por descuento en precio
        precio_promedio_original = venta_con_promocion / (venta_con_promocion / 100)  # Asumiendo 100 unidades base
        precio_con_descuento = precio_promedio_original * (1 - descuento)
        
        revenue_con_promocion = venta_con_promocion * (1 - descuento)
        revenue_sin_promocion = venta_sin_promocion
        
        ganancia_con_promocion = revenue_con_promocion * (1 - costos)
        ganancia_sin_promocion = revenue_sin_promocion * (1 - costos)
        
        impacto_absoluto = ganancia_con_promocion - ganancia_sin_promocion
        impacto_porcentual = ((ganancia_con_promocion / ganancia_sin_promocion) - 1) * 100
        
        return {
            'tipo_prediccion': 'promotion_impact',
            'fecha_prediccion': datetime.now().isoformat(),
            'escenario_sin_promocion': {
                'ventas': round(venta_sin_promocion, 2),
                'revenue': round(revenue_sin_promocion, 2),
                'ganancia': round(ganancia_sin_promocion, 2)
            },
            'escenario_con_promocion': {
                'ventas': round(venta_con_promocion, 2),
                'revenue': round(revenue_con_promocion, 2),
                'ganancia': round(ganancia_con_promocion, 2),
                'descuento_aplicado': f"{descuento * 100}%",
                'duracion': f"{duracion_dias} días"
            },
            'impacto': {
                'ganancia_adicional': round(impacto_absoluto, 2),
                'incremento_porcentual': round(impacto_porcentual, 1),
                'roi_promocion': round((impacto_absoluto / (venta_sin_promocion * descuento)) * 100, 1) if descuento > 0 else 0
            },
            'recomendacion': self._generate_promotion_recommendation(impacto_porcentual, descuento)
        }
    
    def predict_seasonal_trends(self, input_data: Dict) -> Dict:
        """
        Predice tendencias estacionales y su impacto en ganancias
        """
        mes_actual = input_data.get('mes_actual', datetime.now().month)
        ventas_mensuales_historicas = input_data.get('ventas_mensuales', [])
        tipo_negocio = input_data.get('tipo_negocio', 'retail')
        
        # Factores estacionales por mes (retail general)
        factores_estacionales = {
            1: 0.8,   # Enero - post navidad
            2: 0.85,  # Febrero - bajo
            3: 0.95,  # Marzo - recuperación
            4: 1.0,   # Abril - normal
            5: 1.05,  # Mayo - día de la madre
            6: 1.1,   # Junio - verano
            7: 1.15,  # Julio - vacaciones
            8: 1.1,   # Agosto - back to school
            9: 1.0,   # Septiembre - normal
            10: 1.05, # Octubre - halloween
            11: 1.3,  # Noviembre - black friday
            12: 1.4   # Diciembre - navidad
        }
        
        # Ajustar por tipo de negocio
        if tipo_negocio == 'tecnologia':
            factores_estacionales[11] *= 1.2  # Black Friday boost
            factores_estacionales[12] *= 1.1  # Navidad boost
        elif tipo_negocio == 'ropa':
            factores_estacionales[3] *= 1.1   # Primavera
            factores_estacionales[9] *= 1.1   # Otoño
        
        venta_base = np.mean(ventas_mensuales_historicas) if ventas_mensuales_historicas else 50000
        
        predicciones_mensuales = {}
        for mes in range(1, 13):
            factor = factores_estacionales[mes]
            venta_estimada = venta_base * factor
            ganancia_estimada = venta_estimada * 0.4  # 40% margen
            
            predicciones_mensuales[f'mes_{mes}'] = {
                'mes_nombre': self._get_month_name(mes),
                'factor_estacional': factor,
                'ventas_estimadas': round(venta_estimada, 2),
                'ganancia_estimada': round(ganancia_estimada, 2)
            }
        
        # Identificar mejores y peores meses
        ganancias = [predicciones_mensuales[f'mes_{i}']['ganancia_estimada'] for i in range(1, 13)]
        mejor_mes = np.argmax(ganancias) + 1
        peor_mes = np.argmin(ganancias) + 1
        
        return {
            'tipo_prediccion': 'seasonal_trends',
            'fecha_prediccion': datetime.now().isoformat(),
            'predicciones_mensuales': predicciones_mensuales,
            'resumen_anual': {
                'ganancia_total_estimada': round(sum(ganancias), 2),
                'ganancia_promedio_mensual': round(np.mean(ganancias), 2),
                'mejor_mes': {
                    'mes': mejor_mes,
                    'nombre': self._get_month_name(mejor_mes),
                    'ganancia': round(ganancias[mejor_mes - 1], 2)
                },
                'peor_mes': {
                    'mes': peor_mes,
                    'nombre': self._get_month_name(peor_mes),
                    'ganancia': round(ganancias[peor_mes - 1], 2)
                }
            },
            'recomendaciones': self._generate_seasonal_recommendations(mejor_mes, peor_mes, tipo_negocio)
        }
    
    def predict_growth_scenarios(self, input_data: Dict) -> Dict:
        """
        Predice diferentes escenarios de crecimiento del negocio
        """
        ganancia_actual_mensual = input_data.get('ganancia_actual_mensual', 20000)
        inversion_marketing = input_data.get('inversion_marketing', 0)
        nuevos_productos = input_data.get('nuevos_productos', 0)
        expansion_mercado = input_data.get('expansion_mercado', False)
        
        escenarios = {}
        
        # Escenario Conservador (5-10% crecimiento anual)
        factor_conservador = 1.075  # 7.5% anual
        escenarios['conservador'] = self._calculate_growth_scenario(
            ganancia_actual_mensual, factor_conservador, "Conservador"
        )
        
        # Escenario Moderado (10-20% crecimiento anual)
        factor_moderado = 1.15
        if inversion_marketing > 0:
            factor_moderado += (inversion_marketing / ganancia_actual_mensual) * 0.5
        if nuevos_productos > 0:
            factor_moderado += nuevos_productos * 0.02
        
        escenarios['moderado'] = self._calculate_growth_scenario(
            ganancia_actual_mensual, factor_moderado, "Moderado"
        )
        
        # Escenario Agresivo (20-40% crecimiento anual)
        factor_agresivo = 1.3
        if inversion_marketing > 0:
            factor_agresivo += (inversion_marketing / ganancia_actual_mensual) * 0.8
        if nuevos_productos > 0:
            factor_agresivo += nuevos_productos * 0.05
        if expansion_mercado:
            factor_agresivo += 0.15
        
        escenarios['agresivo'] = self._calculate_growth_scenario(
            ganancia_actual_mensual, factor_agresivo, "Agresivo"
        )
        
        return {
            'tipo_prediccion': 'growth_scenarios',
            'fecha_prediccion': datetime.now().isoformat(),
            'ganancia_base_mensual': ganancia_actual_mensual,
            'escenarios': escenarios,
            'factores_considerados': {
                'inversion_marketing': inversion_marketing,
                'nuevos_productos': nuevos_productos,
                'expansion_mercado': expansion_mercado
            },
            'recomendaciones': self._generate_growth_recommendations(escenarios)
        }
    
    def _calculate_growth_scenario(self, base_mensual: float, factor_anual: float, nombre: str) -> Dict:
        """Calcula un escenario de crecimiento específico"""
        factor_mensual = factor_anual ** (1/12)
        
        proyecciones = {}
        ganancia_actual = base_mensual
        
        for periodo in [3, 6, 12, 24, 36]:  # meses
            ganancia_futura = base_mensual * (factor_mensual ** periodo)
            crecimiento_total = ((ganancia_futura / base_mensual) - 1) * 100
            
            proyecciones[f'{periodo}_meses'] = {
                'ganancia_mensual': round(ganancia_futura, 2),
                'ganancia_acumulada': round(ganancia_futura * periodo, 2),
                'crecimiento_porcentual': round(crecimiento_total, 1)
            }
        
        return {
            'nombre': nombre,
            'factor_crecimiento_anual': round((factor_anual - 1) * 100, 1),
            'proyecciones': proyecciones
        }
    
    def _generate_revenue_recommendations(self, predicciones: Dict, tendencia: str) -> List[str]:
        """Genera recomendaciones basadas en predicciones de revenue"""
        recomendaciones = []
        
        ganancia_anual = predicciones['365_dias']['ganancia_neta']
        
        if tendencia == 'creciente':
            recomendaciones.append("📈 Tendencia positiva: Considera invertir en marketing para acelerar el crecimiento")
            recomendaciones.append("💰 Planifica reinversión del 15-20% de ganancias para sostener el crecimiento")
        elif tendencia == 'decreciente':
            recomendaciones.append("⚠️ Tendencia negativa: Revisa estrategia de precios y productos")
            recomendaciones.append("🔄 Considera lanzar promociones para reactivar ventas")
        
        if ganancia_anual > 100000:
            recomendaciones.append("🎯 Excelente proyección: Considera expandir a nuevos mercados")
        elif ganancia_anual < 50000:
            recomendaciones.append("📊 Optimiza costos y mejora márgenes de ganancia")
        
        return recomendaciones
    
    def _generate_promotion_recommendation(self, impacto: float, descuento: float) -> str:
        """Genera recomendación para promociones"""
        if impacto > 20:
            return f"🚀 Excelente ROI: La promoción del {descuento*100}% es muy recomendable"
        elif impacto > 10:
            return f"✅ Buena oportunidad: La promoción generará crecimiento moderado"
        elif impacto > 0:
            return f"⚖️ Promoción marginal: Considera reducir el descuento o aumentar la duración"
        else:
            return f"❌ No recomendable: La promoción reducirá las ganancias"
    
    def _generate_seasonal_recommendations(self, mejor_mes: int, peor_mes: int, tipo_negocio: str) -> List[str]:
        """Genera recomendaciones estacionales"""
        recomendaciones = []
        
        mejor_nombre = self._get_month_name(mejor_mes)
        peor_nombre = self._get_month_name(peor_mes)
        
        recomendaciones.append(f"📈 {mejor_nombre} será tu mejor mes: Prepara inventario extra")
        recomendaciones.append(f"📉 {peor_nombre} será más lento: Planifica promociones especiales")
        
        if mejor_mes in [11, 12]:
            recomendaciones.append("🎄 Temporada navideña fuerte: Invierte en marketing digital")
        
        if tipo_negocio == 'tecnologia' and mejor_mes == 11:
            recomendaciones.append("💻 Black Friday será clave: Prepara ofertas competitivas")
        
        return recomendaciones
    
    def _generate_growth_recommendations(self, escenarios: Dict) -> List[str]:
        """Genera recomendaciones de crecimiento"""
        recomendaciones = []
        
        ganancia_conservadora_3años = escenarios['conservador']['proyecciones']['36_meses']['ganancia_acumulada']
        ganancia_agresiva_3años = escenarios['agresivo']['proyecciones']['36_meses']['ganancia_acumulada']
        
        diferencia = ganancia_agresiva_3años - ganancia_conservadora_3años
        
        recomendaciones.append(f"💡 El escenario agresivo puede generar ${diferencia:,.0f} adicionales en 3 años")
        recomendaciones.append("📊 Monitorea métricas mensualmente para ajustar estrategia")
        recomendaciones.append("🎯 Considera el escenario moderado como objetivo realista")
        
        return recomendaciones
    
    def _get_month_name(self, mes: int) -> str:
        """Obtiene el nombre del mes"""
        meses = {
            1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
            5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
            9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
        }
        return meses.get(mes, f'Mes {mes}')