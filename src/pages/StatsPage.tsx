import React from 'react';

export default function StatsPage() {
  return (
    <div className="bg-card p-6 rounded-lg border">
      <h1 className="text-2xl font-bold text-foreground">Estadísticas de la Plataforma</h1>
      <p className="text-muted-foreground mt-2">
        Aquí se mostrarán estadísticas generales de uso, como usuarios activos, cantidad de archivos subidos y resumen de actividad.
      </p>
    </div>
  );
}
