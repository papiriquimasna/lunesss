import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Hand } from 'lucide-react';

export function WelcomeBanner() {
  const [userName, setUserName] = useState('Usuario');

  useEffect(() => {
    const loadUserName = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserName(user.first_name || 'Usuario');
        } catch (error) {
          console.error('Error al cargar usuario:', error);
        }
      }
    };

    loadUserName();

    // Escuchar evento de actualización de usuario
    window.addEventListener('userUpdated', loadUserName);
    
    return () => {
      window.removeEventListener('userUpdated', loadUserName);
    };
  }, []);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 md:p-6 lg:p-8 rounded-xl border border-primary/20">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative z-10 pr-32 md:pr-40">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            ¡Hola de nuevo, {userName}!
          </h2>
          <Hand className="h-8 w-8 md:h-10 md:w-10 text-primary flex-shrink-0" />
        </div>
        <p className="text-muted-foreground text-base md:text-lg mb-4">
          Aquí tienes un resumen de la actividad de tu plataforma de Machine Learning.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">Sistema activo</span>
          </div>
          <div className="flex items-center gap-2 text-green-500">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium">Rendimiento óptimo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
