import { useState, useEffect } from 'react';

/**
 * Un hook personalizado que rastrea el estado de una media query.
 * @param query La cadena de la media query a observar.
 * @returns `true` si la media query coincide, de lo contrario `false`.
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = (query: string): boolean => {
    // Previene problemas en el renderizado del lado del servidor (SSR)
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  function handleChange() {
    setMatches(getMatches(query));
  }

  useEffect(() => {
    const matchMedia = window.matchMedia(query);

    // Se dispara en la primera carga del lado del cliente y si la query cambia
    handleChange();

    // Escucha los cambios
    matchMedia.addEventListener('change', handleChange);

    return () => {
      matchMedia.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}
