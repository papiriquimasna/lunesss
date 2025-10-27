import { useState, useEffect } from 'react';

export function useDateTime() {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const time = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const day = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Capitalize the first letter of the day
  const formattedDay = day.charAt(0).toUpperCase() + day.slice(1);

  return { time, day: formattedDay };
}
