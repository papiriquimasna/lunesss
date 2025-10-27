import { WelcomeBanner } from '../components/WelcomeBanner';
import { ActivityChart } from '../components/ActivityChart';
import { SessionsChart } from '../components/SessionsChart';
import { StatCard } from '../components/StatCard';
import { Database, BrainCircuit, Zap, CheckCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <WelcomeBanner />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Modelos Entrenados"
          value="24"
          description="este mes"
          icon={BrainCircuit}
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          title="Datasets Activos"
          value="156"
          description="disponibles"
          icon={Database}
          trend="up"
          trendValue="+8"
        />
        <StatCard
          title="Predicciones"
          value="8.4K"
          description="esta semana"
          icon={Zap}
          trend="up"
          trendValue="+23%"
        />
        <StatCard
          title="Precisión Promedio"
          value="94.2%"
          description="en modelos activos"
          icon={CheckCircle}
          trend="up"
          trendValue="+2.1%"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Actividad de Entrenamiento</h3>
              <p className="text-sm text-muted-foreground mt-1">Resumen de los trabajos de entrenamiento completados</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BrainCircuit className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="h-80">
            <ActivityChart />
          </div>
        </div>
        <SessionsChart />
      </div>
    </div>
  );
}
